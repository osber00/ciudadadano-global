/**
 * Convierte la fotografía de la autora en un recorte editorial transparente.
 *
 *   npm run images:author
 *
 * Conserva el JPEG original y escribe el resultado reproducible junto a él.
 * API: https://developers.openai.com/api/reference/resources/images/methods/edit
 */

import fs from 'node:fs';
import path from 'node:path';

import { loadEnv, requireEnv, ROOT } from './lib/env.mjs';

loadEnv();

const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5';
const QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'high';
const IMAGE_DIR = path.join(ROOT, 'src', 'assets', 'img', 'hero');
const INPUT_PATH = path.join(IMAGE_DIR, 'profe-liliana.jpeg');
const OUTPUT_PATH = path.join(IMAGE_DIR, 'profe-liliana.png');
const META_PATH = path.join(IMAGE_DIR, 'profe-liliana.json');

const PROMPT = `Edit the supplied real photograph of the author. Preserve the woman's identity with very high fidelity: keep her exact facial features, warm smile, expression, hair, earrings, hand-under-chin pose, hands, and pale satin blouse.

Remove the entire room background, chair, green name banner, and every piece of text. Isolate only the woman as a clean portrait cutout from the top of her hair through the lower torso. Do not invent or alter anatomy, clothing, accessories, age, or facial features.

Match this editorial collection: authentic documentary photography with a subtle warm cream-and-ink desaturation, muted matte printed-on-paper finish, fine halftone grain, low contrast, and soft midtones. Add a thin, slightly uneven warm-white paper edge around the exact silhouette, as if cut by hand with scissors.

The final background must be fully transparent. No scene, canvas, frame, caption, letters, logo, watermark, glow, vignette, or drop shadow.`;

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`No se encontró ${path.relative(ROOT, INPUT_PATH)}.`);
  }

  if (/^gpt-image-2/.test(MODEL)) {
    throw new Error('Este recorte requiere transparencia; usa gpt-image-1.5 o gpt-image-1.');
  }

  const apiKey = requireEnv('OPENAI_API_KEY', 'Añádela en el archivo .env de la raíz.');
  const form = new FormData();
  const input = fs.readFileSync(INPUT_PATH);

  form.append('model', MODEL);
  form.append('image[]', new Blob([input], { type: 'image/jpeg' }), 'profe-liliana.jpeg');
  form.append('prompt', PROMPT);
  form.append('input_fidelity', 'high');
  form.append('background', 'transparent');
  form.append('output_format', 'png');
  form.append('quality', QUALITY);
  form.append('size', '1024x1536');

  const headers = { Authorization: `Bearer ${apiKey}` };
  if (process.env.OPENAI_ORG_ID) headers['OpenAI-Organization'] = process.env.OPENAI_ORG_ID;
  if (process.env.OPENAI_PROJECT_ID) headers['OpenAI-Project'] = process.env.OPENAI_PROJECT_ID;

  console.log(`\n  Editando retrato con ${MODEL} (${QUALITY})…`);
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers,
    body: form,
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const code = payload?.error?.code || payload?.error?.type || 'request_failed';
    throw new Error(`OpenAI respondió HTTP ${response.status} (${code}).`);
  }

  const result = await response.json();
  const encoded = result?.data?.[0]?.b64_json;
  if (!encoded) throw new Error('La respuesta no contiene b64_json.');

  fs.writeFileSync(OUTPUT_PATH, Buffer.from(encoded, 'base64'));
  fs.writeFileSync(
    META_PATH,
    JSON.stringify(
      {
        id: 'profe-liliana',
        source: 'profe-liliana.jpeg',
        model: MODEL,
        quality: QUALITY,
        size: '1024x1536',
        background: 'transparent',
        outputFormat: 'png',
        inputFidelity: 'high',
        generatedAt: new Date().toISOString(),
        usage: result.usage ?? null,
        prompt: PROMPT,
      },
      null,
      2
    )
  );

  const kb = Math.round(fs.statSync(OUTPUT_PATH).size / 1024);
  console.log(`  Recorte guardado: ${path.relative(ROOT, OUTPUT_PATH)} (${kb} KB)\n`);
}

main().catch((error) => {
  console.error(`\n  Error: ${error.message}\n`);
  process.exit(1);
});
