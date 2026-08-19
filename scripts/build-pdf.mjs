/**
 * Genera el PDF premium del recurso.
 *
 *   npm run pdf          → build + PDF
 *   npm run pdf:only     → solo PDF (requiere dist/ previo)
 *
 * Usa Playwright para renderizar cada página a tamaño A4 y concatenarlas
 * en un único PDF con metadatos.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DIST = path.join(ROOT, 'dist');

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};

async function main() {
  console.log(`\n${c.bold('Ciudadano Global · generación de PDF')}\n`);

  const htmlPath = path.join(DIST, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error(c.red('  Falta dist/index.html. Ejecuta npm run build primero.'));
    process.exit(1);
  }

  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Cargar el archivo construido para que las rutas relativas de imágenes
  // sigan resolviendo durante la impresión.
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });

  // Asegurar que las fuentes están cargadas
  await page.waitForTimeout(2000);

  const pdfPath = path.join(ROOT, 'ciudadano-global.pdf');

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
    scale: 1,
  });

  fs.copyFileSync(pdfPath, path.join(DIST, 'ciudadano-global.pdf'));

  await browser.close();

  const stat = fs.statSync(pdfPath);
  const mb = (stat.size / 1024 / 1024).toFixed(2);
  console.log(`  ${c.green('✓')} PDF generado: ${path.relative(ROOT, pdfPath)} (${mb} MB)\n`);
}

main().catch((err) => {
  console.error(c.red(`\n  Error: ${err.message}\n`));
  process.exit(1);
});
