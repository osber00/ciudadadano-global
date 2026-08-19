/**
 * Verifica qué imágenes del manifiesto faltan en src/assets/img/hero/.
 *
 *   npm run images:check
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const IMG_DIR = path.join(ROOT, 'src', 'assets', 'img', 'hero');

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};

import { IMAGES } from '../src/data/images.mjs';

let missing = 0;
let present = 0;

console.log(`\n${c.bold('Ciudadano Global · estado de imágenes')}\n`);

for (const img of IMAGES) {
  const png = path.join(IMG_DIR, `${img.id}.png`);
  const json = path.join(IMG_DIR, `${img.id}.json`);
  const exists = fs.existsSync(png);

  if (exists) {
    present++;
    const stat = fs.statSync(png);
    const kb = (stat.size / 1024).toFixed(0);
    const hasMeta = fs.existsSync(json) ? c.dim(' · meta ✓') : c.yellow(' · sin meta');
    console.log(`  ${c.green('✓')} ${img.id.padEnd(18)} ${c.dim(img.page.padEnd(35))} ${kb} KB${hasMeta}`);
  } else {
    missing++;
    console.log(`  ${c.red('')} ${img.id.padEnd(18)} ${c.dim(img.page)} ${c.red('falta')}`);
  }
}

console.log(`\n  ${c.green(`${present} presentes`)}${missing ? c.red(`  ·  ${missing} faltantes`) : c.dim('  ·  todas generadas')}\n`);

if (missing) process.exitCode = 1;
