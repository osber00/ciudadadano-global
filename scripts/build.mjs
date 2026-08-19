/**
 * Build: compila src/ → dist/
 *
 *   1. Concatena los 6 archivos CSS en un solo <style> inline.
 *   2. Copia las imágenes de src/assets/img/ a dist/assets/img/.
 *   3. Inyecta el CSS concatenado en index.html y lo escribe en dist/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const PDF_SOURCE = path.join(ROOT, 'ciudadano-global.pdf');

const CSS_FILES = [
  '01-tokens.css',
  '02-base.css',
  '03-paper.css',
  '04-typography.css',
  '05-components.css',
  '06-interactive.css',
];

async function main() {
  console.log('\n  Ciudadano Global · build\n');

  // Limpiar dist
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // Concatenar CSS
  const cssDir = path.join(SRC, 'css');
  const css = CSS_FILES.map((f) => {
    const file = path.join(cssDir, f);
    if (!fs.existsSync(file)) {
      console.error(`  Falta CSS: ${f}`);
      process.exit(1);
    }
    return fs.readFileSync(file, 'utf8');
  }).join('\n\n');

  console.log(`  CSS concatenado: ${(css.length / 1024).toFixed(1)} KB`);

  // Copiar imágenes
  const imgSrc = path.join(SRC, 'assets', 'img');
  const imgDst = path.join(DIST, 'assets', 'img');
  if (fs.existsSync(imgSrc)) {
    await optimizeImages(imgSrc, imgDst);
    const count = countFiles(imgDst);
    console.log(`  Imágenes WebP optimizadas: ${count}`);
  } else {
    console.log('  Sin imágenes (ejecuta npm run images primero)');
  }

  // Procesar HTML: reemplazar los <link> de CSS por un <style> inline
  const htmlPath = path.join(SRC, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error('  Falta src/index.html');
    process.exit(1);
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  html = html.replace(/assets\/img\/hero\/([a-z0-9-]+)\.png/g, 'assets/img/hero/$1.webp');

  // Eliminar los <link> de CSS locales
  html = html.replace(/<link\s+rel="stylesheet"\s+href="css\/\d{2}-[^"]+\.css">\s*/g, '');

  // Inyectar CSS concatenado antes de </head>
  html = html.replace('</head>', `<style>\n${css}\n</style>\n</head>`);

  // Ajustar rutas de assets (src/ → ./)
  html = html.replace(/src="assets\//g, 'src="./assets/');
  html = html.replace(/url\('assets\//g, "url('./assets/");

  fs.writeFileSync(path.join(DIST, 'index.html'), html);
  console.log(`  HTML: ${path.relative(ROOT, path.join(DIST, 'index.html'))}`);

  if (fs.existsSync(PDF_SOURCE)) {
    fs.copyFileSync(PDF_SOURCE, path.join(DIST, 'ciudadano-global.pdf'));
    console.log('  PDF descargable: dist\\ciudadano-global.pdf');
  }

  const totalSize = dirSize(DIST);
  console.log(`\n  Total dist: ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`);
}

async function optimizeImages(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await optimizeImages(s, d);
    } else if (path.extname(entry.name).toLowerCase() === '.png') {
      const webpPath = d.replace(/\.png$/i, '.webp');
      await sharp(s)
        .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 84, alphaQuality: 92, effort: 5, preset: 'photo' })
        .toFile(webpPath);
    } else if (path.extname(entry.name).toLowerCase() !== '.json') {
      fs.copyFileSync(s, d);
    }
  }
}

function countFiles(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
    else count++;
  }
  return count;
}

function dirSize(dir) {
  let size = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) size += dirSize(p);
    else size += fs.statSync(p).size;
  }
  return size;
}

main().catch((error) => {
  console.error(`\n  Error de build: ${error.message}\n`);
  process.exit(1);
});
