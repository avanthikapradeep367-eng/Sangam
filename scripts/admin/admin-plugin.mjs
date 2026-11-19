/**
 * Vite plugin: the API behind /admin (reviewing and correcting the dictionary content).
 *
 * The site is static: production (`npm run build` + server/index.mjs) has no admin route and no
 * write endpoints. This plugin exists only in the dev server (`apply: 'serve'`). Like the
 * /editor plugin, every request must come from this computer (loopback), and every write must
 * be same-origin and carry the per-session token that GET /__admin/api/data returns.
 *
 * Saves write the CSV files in /content (validated first; nothing is written on error).
 * The public pages read src/data/generated, which only changes on POST /publish (or the next
 * `npm run dev` / `npm run build`, which run scripts/build-data.mjs first).
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CSV_FILES } from '../lib/content.mjs';
import { TABLES, applyRows, bundleOf, compile, createStore, fingerprint, planEntrySave, previewImport, serializeTable } from './store.mjs';

const MAX_BODY = 2e6;
const ENTRY_STATUS = ['draft', 'reviewed', 'demo'];

export default function adminPlugin({ root }) {
  const store = createStore(root);
  const token = randomBytes(24).toString('hex');

  const send = (res, code, body) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };
  const isLoopback = (a = '') => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(a);
  const readBody = (req) => new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c) => { data += c; if (data.length > MAX_BODY) { reject(new Error('request too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('invalid JSON')); } });
    req.on('error', reject);
  });

  function snapshot() {
    const tables = store.readTables();
    const { content, errors, warnings } = store.check(tables);
    const rows = Object.fromEntries(TABLES.map((n) => [n, tables[n].rows.map((r) => r.rec)]));
    const fingerprints = Object.fromEntries(rows.entries.map((e) => [e.id, fingerprint(bundleOf(tables, e.id))]));
    return {
      token,
      tables: rows,
      columns: CSV_FILES,
      poems: content.poems.map(({ __file, ...p }) => ({ ...p, file: __file })),
      works: content.works,
      sources: content.sources.map(({ id, title, origin, kind }) => ({ id, title, origin, kind })),
      languages: content.languages,
      topics: content.topics,
      wordOfDay: content.wordOfDay ?? {},
      fingerprints,
      validation: { errors, warnings },
      site: store.siteStatus(content),
      vocabImported: content.vocab.entries.length,
    };
  }

  /** The compiled public record for one entry, built from proposed tables (for the preview). */
  function compiledEntry(tables, id) {
    const c = store.contentWith(tables);
    const out = compile(c);
    return {
      entry: out['dictionary.json'].find((e) => e.id === id) ?? null,
      citations: out['citations.json'].filter((ct) => ct.entryId === id),
    };
  }

  function cleanEntryInput(body) {
    const e = body.entry ?? {};
    const str = (v, max = 4000) => String(v ?? '').normalize('NFC').trim().slice(0, max);
    const entry = {};
    for (const col of CSV_FILES.entries) if (col in e) entry[col] = str(e[col]);
    if (body.action === 'approve') entry.status = 'reviewed';
    else if (body.action === 'draft') entry.status = e.status === 'demo' ? 'demo' : 'draft';
    if (entry.status && !ENTRY_STATUS.includes(entry.status)) throw new Error('status must be draft, reviewed or demo');
    const senses = (Array.isArray(body.senses) ? body.senses : []).slice(0, 60).map((s) => ({
      id: str(s.id, 120) || null,
      definition_ta: str(s.definition_ta),
      source_id: str(s.source_id, 120),
      translations: (Array.isArray(s.translations) ? s.translations : []).slice(0, 20).map((t) => ({
        lang: str(t.lang, 12), text: str(t.text), explanatory: Boolean(t.explanatory),
        review_status: t.review_status === 'reviewed' ? 'reviewed' : 'unreviewed', source_id: str(t.source_id, 120),
      })),
    }));
    const notes = (Array.isArray(body.notes) ? body.notes : []).slice(0, 60).map((n) => ({
      id: str(n.id, 120) || null, kind: str(n.kind, 20), text: str(n.text), source_id: str(n.source_id, 120),
    }));
    return { originalId: body.originalId ? String(body.originalId) : null, entry, senses, notes };
  }

  function cleanCitation(c) {
    const str = (v, max = 400) => String(v ?? '').normalize('NFC').trim().slice(0, max);
    return {
      id: str(c.id, 120), entry_id: str(c.entry_id, 120), sense_id: str(c.sense_id, 120), poem_id: str(c.poem_id, 120),
      line: str(c.line, 6), form: str(c.form, 200), featured: c.featured ? 'y' : '',
      review_status: c.review_status === 'reviewed' ? 'reviewed' : 'unreviewed', source_id: str(c.source_id, 120),
    };
  }

  const routes = {
    'GET /data': () => [200, snapshot()],

    /** Preview an unsaved entry as the public page would show it. Writes nothing. */
    'POST /preview': (body) => {
      const tables = store.readTables();
      const plan = planEntrySave(tables, cleanEntryInput({ ...body, action: null }));
      const { errors } = store.check(plan.tables);
      return [200, { ...compiledEntry(plan.tables, plan.id), errors }];
    },

    'POST /entry': (body) => {
      if (!['draft', 'approve'].includes(body.action)) throw new Error('action must be draft or approve');
      const tables = store.readTables();
      if (body.originalId && body.fingerprint && fingerprint(bundleOf(tables, body.originalId)) !== body.fingerprint) {
        return [409, { error: 'This entry was changed in the content files after you opened it. Reload to see the current version; your edits are still in the form.' }];
      }
      const plan = planEntrySave(tables, cleanEntryInput(body));
      const result = store.commit(plan.tables, plan.changed);
      if (!result.ok) return [422, { error: 'Not saved: the content would not pass validation.', errors: result.errors }];
      return [200, { ...result, id: plan.id, data: snapshot() }];
    },

    'POST /citation': (body) => {
      const tables = store.readTables();
      const c = cleanCitation(body.citation ?? {});
      if (!/^[a-z0-9][a-z0-9-]*$/.test(c.id)) throw new Error('citation id must be lowercase letters, digits and hyphens');
      const exists = tables.citations.rows.some((r) => r.rec.id === c.id);
      if (body.mode === 'create' && exists) throw new Error(`citation "${c.id}" already exists`);
      if (body.mode !== 'create' && !exists) throw new Error(`citation "${c.id}" does not exist`);
      const next = { ...tables, citations: body.delete ? applyRows('citations', tables.citations, { remove: [c.id] }) : applyRows('citations', tables.citations, { upsert: [c] }) };
      const result = store.commit(next, ['citations']);
      if (!result.ok) return [422, { error: 'Not saved: the citation would not pass validation.', errors: result.errors }];
      return [200, { ...result, data: snapshot() }];
    },

    'POST /word-of-day': (body) => {
      const date = String(body.date ?? '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('date must be YYYY-MM-DD');
      const daily = { ...store.readDaily() };
      if (body.entryId) daily[date] = String(body.entryId); else delete daily[date];
      const sorted = Object.fromEntries(Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)));
      const problems = checkDaily(store.contentWith(store.readTables()), sorted);
      if (problems.length) return [422, { error: 'Not saved.', errors: problems }];
      store.writeAtomic(store.dailyFile, JSON.stringify(sorted, null, 2) + '\n');
      return [200, { ok: true, written: ['content/word-of-day.json'], data: snapshot() }];
    },

    'POST /import/preview': (body) => {
      const { report } = previewImport(store, store.readTables(), String(body.table), String(body.text ?? ''), { allowUpdates: Boolean(body.allowUpdates) });
      return [200, { report }];
    },

    'POST /import/apply': (body) => {
      const tables = store.readTables();
      const table = String(body.table);
      const { report, merged } = previewImport(store, tables, table, String(body.text ?? ''), { allowUpdates: Boolean(body.allowUpdates) });
      if (report.blocking) return [422, { error: 'Import not applied: fix the problems in the preview first. Nothing was written.', report }];
      const result = store.commit(merged, [table]);
      if (!result.ok) return [422, { error: 'Import not applied: validation failed. Nothing was written.', errors: result.errors, report }];
      return [200, { ...result, report, data: snapshot() }];
    },

    /** The final check and the explicit publish step: scripts/build-data.mjs validates and regenerates the site data. */
    'POST /publish': () => {
      try {
        const log = execFileSync(process.execPath, [join(root, 'scripts', 'build-data.mjs')], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        return [200, { ok: true, log, data: snapshot() }];
      } catch (e) {
        return [422, { error: 'build:data failed; the site data was not changed.', log: `${e.stdout ?? ''}${e.stderr ?? ''}` }];
      }
    },
    'POST /check': () => {
      try {
        const log = execFileSync(process.execPath, [join(root, 'scripts', 'build-data.mjs'), '--check'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        return [200, { ok: true, log }];
      } catch (e) {
        return [200, { ok: false, log: `${e.stdout ?? ''}${e.stderr ?? ''}` }];
      }
    },
  };

  function checkDaily(c, daily) {
    const ids = new Set(c.entries.map((e) => e.id));
    const out = [];
    for (const [date, id] of Object.entries(daily)) {
      if (!ids.has(id)) out.push(`${date}: entry "${id}" does not exist`);
      else if (!c.citations.some((ct) => ct.entry_id === id && ct.featured === 'y')) out.push(`${date}: "${id}" has no featured quotation; mark one of its citations as featured first`);
    }
    return out;
  }

  return {
    name: 'sangam-admin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__admin/api', async (req, res) => {
        if (!isLoopback(req.socket.remoteAddress)) return send(res, 403, { error: 'The admin accepts requests from this computer only.' });
        const url = new URL(req.url ?? '/', 'http://local');
        try {
          // CSV export: the file exactly as stored, so IDs, order, quoting and Tamil text round-trip.
          if (req.method === 'GET' && url.pathname === '/export') {
            const table = url.searchParams.get('table') ?? '';
            if (!TABLES.includes(table)) return send(res, 400, { error: 'unknown table' });
            const path = join(store.dir, `${table}.csv`);
            const text = existsSync(path) ? readFileSync(path, 'utf8') : serializeTable(store.readTables()[table]);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${table}.csv"`);
            res.setHeader('Cache-Control', 'no-store');
            return res.end(text);
          }
          const route = routes[`${req.method} ${url.pathname}`];
          if (!route) return send(res, 404, { error: 'not found' });
          if (req.method === 'POST') {
            const origin = req.headers.origin;
            if (!origin || new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'cross-origin request refused' });
            if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') return send(res, 403, { error: 'cross-site request refused' });
            if (req.headers['x-admin-token'] !== token) return send(res, 403, { error: 'missing or stale admin token; reload the page' });
            if (!String(req.headers['content-type']).startsWith('application/json')) return send(res, 415, { error: 'JSON only' });
          }
          const body = req.method === 'POST' ? await readBody(req) : {};
          const [code, out] = route(body);
          return send(res, code, out);
        } catch (err) {
          return send(res, 400, { error: String(err?.message ?? err) });
        }
      });
    },
  };
}
