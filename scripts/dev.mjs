/**
 * Servidor de desarrollo.
 *
 *   npm run dev              → http://localhost:3000
 *   npm run dev -- --port=8080
 *
 * Sirve dist/ si existe (tras build), o src/ directamente con CSS en vivo.
 * Detecta cambios en src/ y recarga el navegador.
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const argv = process.argv.slice(2);
const portArg = argv.find((a) => a.startsWith('--port='));
const PORT = Number(portArg?.slice(7) || 3000);

const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function guessMime(file) {
  const ext = path.extname(file).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': guessMime(filePath) });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = path.join(DIST, url.pathname);

  // Si dist no existe, servir desde src
  if (!fs.existsSync(DIST)) {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      filePath = path.join(SRC, 'index.html');
    } else {
      filePath = path.join(SRC, url.pathname);
    }
  }

  // Si es directorio, buscar index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  serveFile(res, filePath);
});

server.listen(PORT, () => {
  const hasDist = fs.existsSync(DIST);
  console.log(`\n  Ciudadano Global · dev server`);
  console.log(`  Sirviendo: ${hasDist ? 'dist/' : 'src/ (sin build)'}`);
  console.log(`  http://localhost:${PORT}\n`);
});
