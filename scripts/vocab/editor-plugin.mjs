/**
 * Vite plugin: the write API behind the /editor page (reviewing the imported vocabulary).
 *
 * It exists only in the dev server (`apply: 'serve'`), so `npm run build` produces a static
 * site with no editing endpoints at all. Inside the dev server every request must:
 *   - come from this machine (loopback address), even if the server is started with --host;
 *   - for writes, be same-origin (Origin / Sec-Fetch-Site) and carry the per-session token
 *     that only a same-origin page can read from GET /__editor/api/data.
 *
 * Writes go to content/sources/vocab/review.json, then `scripts/vocab/import.mjs` reruns.
 * POST /__editor/api/rebuild also reruns scripts/build-data.mjs so the site picks up changes.
 */
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const STATUSES = ['pending', 'approved', 'flagged'];
const FIELDS = ['mlt', 'hlt', 'grammar', 'colloquialTamil', 'colloquialRoman', 'english', 'note', 'senses'];

export default function vocabEditor({ root }) {
  const dir = join(root, 'content', 'sources', 'vocab');
  const reviewFile = join(dir, 'review.json');
  const token = randomBytes(24).toString('hex');
  const readJSON = (p, fb) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fb);
  const runImport = () => execFileSync(process.execPath, [join(root, 'scripts', 'vocab', 'import.mjs')], { cwd: root, encoding: 'utf8' });

  const send = (res, code, body) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };
  const isLoopback = (addr = '') => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(addr);
  const readBody = (req) => new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) reject(new Error('too large')); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

  /** Keep only known fields with the right types, so a bad request cannot corrupt review.json. */
  function cleanReview(r, reviewer) {
    if (!STATUSES.includes(r.status)) throw new Error('status must be pending, approved or flagged');
    const corrected = {};
    for (const k of FIELDS) {
      const v = r.corrected?.[k];
      if (v === undefined || v === null) continue;
      if (k === 'hlt' || k === 'senses') {
        if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) throw new Error(`${k} must be a list of strings`);
        corrected[k] = v.map((x) => x.normalize('NFC').trim()).filter(Boolean);
      } else {
        if (typeof v !== 'string') throw new Error(`${k} must be text`);
        corrected[k] = v.normalize('NFC').trim();
      }
    }
    const meanings = {};
    for (const [n, langs] of Object.entries(r.meanings ?? {})) {
      if (!/^\d+$/.test(n)) continue;
      for (const [lang, m] of Object.entries(langs ?? {})) {
        if (!['ta', 'hi', 'ml', 'te'].includes(lang) || typeof m?.text !== 'string' || !m.text.trim()) continue;
        if (!['editor', 'machine', 'book'].includes(m.origin)) throw new Error(`meaning ${n}/${lang}: origin must be editor, machine or book`);
        (meanings[n] ??= {})[lang] = { text: m.text.normalize('NFC').trim(), origin: m.origin, reviewed: Boolean(m.reviewed) };
      }
    }
    return {
      status: r.status,
      ...(Object.keys(corrected).length ? { corrected } : {}),
      ...(Object.keys(meanings).length ? { meanings } : {}),
      reviewer: String(reviewer || '').slice(0, 80) || null,
      reviewedAt: new Date().toISOString(),
      note: typeof r.note === 'string' && r.note.trim() ? r.note.trim().slice(0, 2000) : null,
    };
  }

  return {
    name: 'vocab-editor',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__editor/api', async (req, res) => {
        if (!isLoopback(req.socket.remoteAddress)) return send(res, 403, { error: 'The editor accepts requests from this computer only.' });
        try {
          if (req.method === 'GET' && req.url.startsWith('/data')) {
            return send(res, 200, {
              token,
              entries: readJSON(join(dir, 'import', 'entries.json'), []),
              report: readJSON(join(dir, 'import', 'report.json'), {}).counts ?? {},
              review: readJSON(reviewFile, {}),
            });
          }
          if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
          const host = req.headers.host;
          const origin = req.headers.origin;
          if (!origin || new URL(origin).host !== host) return send(res, 403, { error: 'cross-origin request refused' });
          if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') return send(res, 403, { error: 'cross-site request refused' });
          if (req.headers['x-editor-token'] !== token) return send(res, 403, { error: 'missing or stale editor token; reload the page' });
          if (!String(req.headers['content-type']).startsWith('application/json')) return send(res, 415, { error: 'JSON only' });

          if (req.url.startsWith('/review')) {
            const body = JSON.parse(await readBody(req));
            const ref = String(body.ref ?? '');
            const entries = readJSON(join(dir, 'import', 'entries.json'), []);
            if (!entries.some((e) => e.ref === ref)) return send(res, 400, { error: `unknown reference ${ref}` });
            const review = readJSON(reviewFile, {});
            if (body.revert) delete review[ref];
            else review[ref] = cleanReview(body.review ?? {}, body.reviewer);
            const sorted = Object.fromEntries(Object.entries(review).sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b)));
            // Write atomically so an interrupted save never leaves half a file.
            writeFileSync(reviewFile + '.tmp', JSON.stringify(sorted, null, 1) + '\n');
            renameSync(reviewFile + '.tmp', reviewFile);
            const log = runImport();
            const updated = readJSON(join(dir, 'import', 'entries.json'), []).find((e) => e.ref === ref);
            return send(res, 200, { ok: true, entry: updated, review: sorted[ref] ?? null, report: readJSON(join(dir, 'import', 'report.json'), {}).counts, log });
          }
          if (req.url.startsWith('/rebuild')) {
            runImport();
            const log = execFileSync(process.execPath, [join(root, 'scripts', 'build-data.mjs')], { cwd: root, encoding: 'utf8' });
            return send(res, 200, { ok: true, log });
          }
          return send(res, 404, { error: 'not found' });
        } catch (err) {
          return send(res, 400, { error: String(err.message ?? err) });
        }
      });
    },
  };
}
