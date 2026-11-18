/**
 * Production server: the built site (dist/) plus the /api routes, from one Node process.
 *
 *   npm run build && npm start        (reads .env if present: node --env-file-if-exists)
 *
 * Static files are served from dist/; any other path that is not /api/… gets index.html, because
 * entry, poem and search URLs are client-side routes. No dependencies beyond Node 22+.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { createApi } from './api.mjs';

const root = join(import.meta.dirname, '..', 'dist');
const port = Number(process.env.PORT) || 8787;
const api = createApi(process.env);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8',
};

function sendFile(res, file) {
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  res.setHeader('Content-Type', type);
  // Hashed build assets can be cached for a long time; index.html must stay fresh.
  res.setHeader('Cache-Control', file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
  createReadStream(file).pipe(res);
}

if (!existsSync(join(root, 'index.html'))) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname);
  if (path.startsWith('/api/')) return void api(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return void res.end(); }
  const file = normalize(join(root, path));
  if (file.startsWith(root + sep) && existsSync(file) && statSync(file).isFile()) return sendFile(res, file);
  sendFile(res, join(root, 'index.html'));
}).listen(port, () => {
  const t = process.env.AZURE_TRANSLATOR_KEY ? 'on' : 'off';
  const s = process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION ? 'on' : 'off';
  console.log(`சொல்வளம் on http://localhost:${port}  (Azure Translator: ${t}, Azure Speech: ${s})`);
});
