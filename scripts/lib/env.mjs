/**
 * Cargador mínimo de .env sin dependencias.
 *
 * Soporta:
 *   CLAVE=valor
 *   CLAVE="valor con espacios"
 *   CLAVE='valor'
 *   export CLAVE=valor
 *   # comentarios y líneas en blanco
 *
 * Las variables ya presentes en process.env tienen prioridad sobre el archivo,
 * de modo que en CI se pueden inyectar como secretos sin tocar el .env.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');

/** Quita comillas envolventes y espacios sobrantes de un valor de .env. */
function unquote(raw) {
  let v = raw.trim();
  if (v.length >= 2) {
    const first = v[0];
    const last = v[v.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      v = v.slice(1, -1);
    }
  }
  return v.trim();
}

/**
 * Lee un archivo .env y devuelve un objeto plano.
 * @param {string} file Ruta absoluta al archivo.
 * @returns {Record<string,string>}
 */
export function parseEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  const text = fs.readFileSync(file, 'utf8');

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const withoutExport = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length)
      : trimmed;

    const eq = withoutExport.indexOf('=');
    if (eq === -1) continue;

    const key = withoutExport.slice(0, eq).trim();
    if (!key) continue;

    out[key] = unquote(withoutExport.slice(eq + 1));
  }
  return out;
}

/**
 * Carga el .env del proyecto en process.env (sin sobrescribir lo ya definido).
 * @returns {Record<string,string>} el entorno resultante, ya combinado.
 */
export function loadEnv() {
  const fromFile = parseEnvFile(path.join(ROOT, '.env'));
  for (const [k, v] of Object.entries(fromFile)) {
    if (process.env[k] === undefined || process.env[k] === '') {
      process.env[k] = v;
    }
  }
  return process.env;
}

/**
 * Devuelve una variable obligatoria o aborta con un mensaje accionable.
 * @param {string} name
 * @param {string} [hint]
 */
export function requireEnv(name, hint = '') {
  const value = (process.env[name] ?? '').trim();
  if (!value) {
    const extra = hint ? `\n   ${hint}` : '';
    console.error(`\n  Falta la variable "${name}".${extra}\n`);
    process.exit(1);
  }
  return value;
}

/** Oculta un secreto para poder mostrarlo en logs sin filtrarlo. */
export function mask(secret) {
  if (!secret) return '(vacío)';
  if (secret.length <= 12) return '***';
  return `${secret.slice(0, 6)}…${secret.slice(-4)} (${secret.length} chars)`;
}
