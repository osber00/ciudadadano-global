/**
 * Generador de imágenes con la API de OpenAI.
 * =============================================================================
 *
 *   npm run images                      genera solo las que faltan
 *   npm run images -- --force           regenera todas
 *   npm run images -- --only=portada    genera una o varias (separadas por coma)
 *   npm run images -- --quality=low     prueba barata
 *   npm run images -- --dry-run         muestra qué haría, sin llamar a la API
 *
 * Las imágenes se guardan en src/assets/img/hero/<id>.png con fondo transparente.
 * Junto a cada una se escribe <id>.json con el prompt y los parámetros usados,
 * para poder auditar y reproducir el resultado.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { loadEnv, requireEnv, mask, ROOT } from './lib/env.mjs';
import { IMAGES, IMAGES_BY_ID, SHAPE_SIZES, buildPrompt } from '../src/data/images.mjs';

loadEnv();

// -----------------------------------------------------------------------------
// Argumentos
// -----------------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const FORCE = flag('force');
const DRY_RUN = flag('dry-run');
const ONLY = value('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const MODEL = value('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5');
const QUALITY = value('quality', process.env.OPENAI_IMAGE_QUALITY || 'high');
const CONCURRENCY = Math.max(1, Number(value('concurrency', process.env.IMAGE_CONCURRENCY || 2)));

const OUT_DIR = path.join(ROOT, 'src', 'assets', 'img', 'hero');

// gpt-image-2 no admite transparencia; el resto de la familia gpt-image sí.
const SUPPORTS_TRANSPARENCY = !/^gpt-image-2/.test(MODEL);

// -----------------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------------
const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

/**
 * Llama a la API de imágenes con reintentos y backoff exponencial.
 * @returns {Promise<Buffer>}
 */
async function generateImage({ prompt, size, apiKey }) {
  const body = {
    model: MODEL,
    prompt,
    n: 1,
    size,
    quality: QUALITY,
    output_format: 'png',
  };
  if (SUPPORTS_TRANSPARENCY) body.background = 'transparent';

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (process.env.OPENAI_ORG_ID) headers['OpenAI-Organization'] = process.env.OPENAI_ORG_ID;
  if (process.env.OPENAI_PROJECT_ID) headers['OpenAI-Project'] = process.env.OPENAI_PROJECT_ID;

  const MAX_ATTEMPTS = 4;
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        // Las generaciones en calidad alta pueden tardar bastante.
        signal: AbortSignal.timeout(10 * 60 * 1000),
      });

      if (res.ok) {
        const json = await res.json();
        const b64 = json?.data?.[0]?.b64_json;
        if (!b64) throw new Error('La respuesta no contiene b64_json.');
        return { buffer: Buffer.from(b64, 'base64'), usage: json.usage ?? null };
      }

      const errText = await res.text();
      // 400 = petición inválida: reintentar no ayuda.
      if (res.status === 400) {
        throw Object.assign(new Error(`HTTP 400 — ${errText.slice(0, 500)}`), { fatal: true });
      }
      lastError = new Error(`HTTP ${res.status} — ${errText.slice(0, 300)}`);
    } catch (err) {
      if (err.fatal) throw err;
      lastError = err;
    }

    if (attempt < MAX_ATTEMPTS) {
      const wait = 2 ** attempt * 1500;
      process.stdout.write(c.dim(`      reintento ${attempt}/${MAX_ATTEMPTS - 1} en ${wait / 1000}s… `));
      await sleep(wait);
      process.stdout.write('\n');
    }
  }
  throw lastError;
}

/** Ejecuta tareas con un límite de concurrencia. */
async function pool(items, limit, worker) {
  const results = [];
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

// -----------------------------------------------------------------------------
// Principal
// -----------------------------------------------------------------------------
async function main() {
  console.log(`\n${c.bold('Ciudadano Global · generación de imágenes')}\n`);

  // Selección
  let targets = IMAGES;
  if (ONLY.length) {
    const unknown = ONLY.filter((id) => !IMAGES_BY_ID[id]);
    if (unknown.length) {
      console.error(c.red(`  IDs desconocidos: ${unknown.join(', ')}`));
      console.error(c.dim(`  Disponibles: ${IMAGES.map((i) => i.id).join(', ')}\n`));
      process.exit(1);
    }
    targets = ONLY.map((id) => IMAGES_BY_ID[id]);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Filtra las que ya existen y no han cambiado de prompt
  const pending = [];
  const skipped = [];
  for (const spec of targets) {
    const pngPath = path.join(OUT_DIR, `${spec.id}.png`);
    const metaPath = path.join(OUT_DIR, `${spec.id}.json`);
    const prompt = buildPrompt(spec);
    const promptHash = hash(prompt + MODEL + QUALITY);

    if (!FORCE && fs.existsSync(pngPath) && fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.promptHash === promptHash) {
          skipped.push(spec.id);
          continue;
        }
      } catch {
        /* metadatos corruptos: regenerar */
      }
    }
    pending.push({ spec, prompt, promptHash, pngPath, metaPath });
  }

  console.log(`  modelo      ${c.cyan(MODEL)}${SUPPORTS_TRANSPARENCY ? c.dim(' (fondo transparente)') : c.yellow(' (SIN transparencia)')}`);
  console.log(`  calidad     ${c.cyan(QUALITY)}`);
  console.log(`  paralelismo ${c.cyan(CONCURRENCY)}`);
  console.log(`  destino     ${c.dim(path.relative(ROOT, OUT_DIR))}`);
  console.log(`  pendientes  ${c.bold(String(pending.length))}${skipped.length ? c.dim(`  ·  ${skipped.length} ya generadas`) : ''}\n`);

  if (!pending.length) {
    console.log(c.green('  Todo al día. Nada que generar.\n'));
    return;
  }

  if (DRY_RUN) {
    for (const { spec, prompt } of pending) {
      console.log(`  ${c.bold(spec.id)}  ${c.dim(spec.page)}  ${c.dim(SHAPE_SIZES[spec.shape])}`);
      console.log(c.dim(`    ${prompt.slice(prompt.indexOf('SUBJECT')).slice(0, 220)}…\n`));
    }
    console.log(c.yellow('  --dry-run: no se ha llamado a la API.\n'));
    return;
  }

  const apiKey = requireEnv(
    'OPENAI_API_KEY',
    'Añádela en el archivo .env de la raíz del proyecto.'
  );
  console.log(c.dim(`  key ${mask(apiKey)}\n`));

  let done = 0;
  let failed = 0;
  const started = Date.now();

  await pool(pending, CONCURRENCY, async ({ spec, prompt, promptHash, pngPath, metaPath }) => {
    const size = SHAPE_SIZES[spec.shape];
    const label = `${c.bold(spec.id.padEnd(18))} ${c.dim(size)}`;
    console.log(`  ${c.yellow('▸')} ${label} ${c.dim('generando…')}`);

    try {
      const { buffer, usage } = await generateImage({ prompt, size, apiKey });
      fs.writeFileSync(pngPath, buffer);
      fs.writeFileSync(
        metaPath,
        JSON.stringify(
          {
            id: spec.id,
            page: spec.page,
            shape: spec.shape,
            accent: spec.accent,
            model: MODEL,
            quality: QUALITY,
            size,
            background: SUPPORTS_TRANSPARENCY ? 'transparent' : 'opaque',
            promptHash,
            generatedAt: new Date().toISOString(),
            usage,
            prompt,
          },
          null,
          2
        )
      );
      done++;
      console.log(`  ${c.green('✓')} ${label} ${c.green(kb(buffer.length))}`);
    } catch (err) {
      failed++;
      console.log(`  ${c.red('✗')} ${label} ${c.red(err.message)}`);
    }
  });

  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(
    `\n  ${c.green(`${done} generadas`)}${failed ? c.red(`  ·  ${failed} con error`) : ''}  ${c.dim(`en ${secs}s`)}\n`
  );

  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(c.red(`\n  Error: ${err.message}\n`));
  process.exit(1);
});
