/**
 * Read and write the /content tables for the local admin (/admin, dev server only).
 *
 * Round trips are lossless: every row keeps the exact text it had in the file (quoting, spacing,
 * line endings), and only rows whose values change are re-serialized. Every write is checked
 * with the same validate() that `npm run build:data` uses, and nothing is written when it fails.
 */
import { readFileSync, writeFileSync, renameSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { CSV_FILES, loadContent, validate, compile } from '../lib/content.mjs';

export const TABLES = Object.keys(CSV_FILES);
/** Columns that must have a value in every row (matches validate() in scripts/lib/content.mjs). */
export const REQUIRED = {
  entries: ['id', 'headword', 'pos', 'status', 'source_id'],
  senses: ['id', 'entry_id', 'number', 'definition_ta', 'source_id'],
  translations: ['sense_id', 'lang', 'text', 'review_status', 'source_id'],
  citations: ['id', 'entry_id', 'poem_id', 'line', 'form', 'review_status', 'source_id'],
  notes: ['id', 'entry_id', 'kind', 'text', 'source_id'],
};
export const keyOf = (table, r) => (table === 'translations' ? `${r.sense_id}#${r.lang}` : r.id);

// ─── Raw-preserving CSV ─────────────────────────────────────────────────────
/** Split CSV text into raw rows (quotes respected), each with its own line ending. */
function splitRows(text) {
  const rows = [];
  let start = 0, quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') quoted = !quoted;
    else if (c === '\n' && !quoted) {
      const cr = text[i - 1] === '\r';
      rows.push({ raw: text.slice(start, cr ? i - 1 : i), eol: cr ? '\r\n' : '\n' });
      start = i + 1;
    }
  }
  if (start < text.length) rows.push({ raw: text.slice(start).replace(/\r$/, ''), eol: '' });
  return rows;
}

function parseFields(raw) {
  const out = [];
  let field = '', quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quoted) {
      if (c === '"' && raw[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(field); field = ''; }
    else field += c;
  }
  out.push(field);
  return out;
}

const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Parse CSV text the way scripts/lib/content.mjs parseCSV does (trim + NFC), keeping raw rows. */
export function parseTable(text) {
  text = text.replace(/^﻿/, '');
  const all = splitRows(text);
  const crlf = all.filter((r) => r.eol === '\r\n').length;
  const eol = crlf > all.length / 2 ? '\r\n' : '\n';
  const raws = all.filter((r) => parseFields(r.raw).some((f) => f.trim() !== ''));
  if (!raws.length) return { header: [], rows: [], eol };
  const header = parseFields(raws[0].raw).map((h) => h.trim());
  const rows = raws.slice(1).map((r, n) => {
    const f = parseFields(r.raw);
    const rec = {};
    header.forEach((h, k) => { rec[h] = (f[k] ?? '').trim().normalize('NFC'); });
    return { rec, raw: r.raw, eol: r.eol, line: n + 2 };
  });
  return { header, rows, headerRaw: raws[0].raw, headerEol: raws[0].eol, eol };
}

/**
 * Unchanged rows are written back byte for byte, with their own line ending. Edited rows keep
 * their row's line ending; new rows use the file's usual one.
 */
export function serializeTable(t) {
  const parts = [(t.headerRaw ?? t.header.join(',')) + (t.headerEol || t.eol)];
  t.rows.forEach((r, i) => {
    const text = r.raw ?? t.header.map((h) => esc(r.rec[h])).join(',');
    const last = i === t.rows.length - 1;
    // A file without a final newline keeps that, as long as its last row is still last.
    parts.push(text + (r.eol === '' && last && r.raw != null ? '' : r.eol || t.eol));
  });
  return parts.join('');
}

const sameRec = (header, a, b) => header.every((h) => (a[h] ?? '') === (b[h] ?? ''));

/** Replace, add and remove rows by key. Unchanged rows keep their raw text and position. */
export function applyRows(table, t, { upsert = [], remove = [] }) {
  const removeKeys = new Set(remove);
  const incoming = new Map(upsert.map((r) => [keyOf(table, r), r]));
  const rows = [];
  for (const row of t.rows) {
    const k = keyOf(table, row.rec);
    if (removeKeys.has(k) && !incoming.has(k)) continue;
    const next = incoming.get(k);
    if (next) {
      incoming.delete(k);
      const rec = Object.fromEntries(t.header.map((h) => [h, clean(next[h])]));
      rows.push(sameRec(t.header, rec, row.rec) ? row : { rec, raw: null, eol: row.eol, line: row.line });
    } else rows.push(row);
  }
  for (const r of incoming.values()) rows.push({ rec: Object.fromEntries(t.header.map((h) => [h, clean(r[h])])), raw: null, line: null });
  return { ...t, rows };
}
const clean = (v) => (v == null ? '' : String(v).normalize('NFC').trim().replace(/\r?\n/g, ' '));

// ─── Store ──────────────────────────────────────────────────────────────────
export function createStore(root) {
  const dir = join(root, 'content');
  const genDir = join(root, 'src', 'data', 'generated');
  const generated = join(genDir, 'coverage.json');
  const dailyFile = join(dir, 'word-of-day.json');

  const readTables = () => Object.fromEntries(TABLES.map((n) => {
    const p = join(dir, `${n}.csv`);
    return [n, existsSync(p) ? parseTable(readFileSync(p, 'utf8')) : { header: CSV_FILES[n], rows: [], eol: '\n' }];
  }));

  /** Full content object for validate()/compile(), with selected tables replaced. */
  function contentWith(tables) {
    const c = loadContent(dir);
    for (const n of TABLES) c[n] = tables[n].rows.map((r) => ({ ...r.rec, __file: `${n}.csv`, ...(r.line ? { __line: r.line } : {}) }));
    return c;
  }

  function check(tables) {
    const c = contentWith(tables);
    return { content: c, ...validate(c) };
  }

  function writeAtomic(path, text) {
    writeFileSync(path + '.tmp', text);
    renameSync(path + '.tmp', path);
  }

  /** Validate the proposed tables; write only the changed files, and only when there are no errors. */
  function commit(tables, changed) {
    const { errors, warnings } = check(tables);
    if (errors.length) return { ok: false, errors, warnings };
    const written = [];
    for (const n of changed) {
      const path = join(dir, `${n}.csv`);
      const text = serializeTable(tables[n]);
      if (existsSync(path) && readFileSync(path, 'utf8') === text) continue;
      writeAtomic(path, text);
      written.push(`content/${n}.csv`);
    }
    return { ok: true, errors: [], warnings, written };
  }

  const mtime = (p) => (existsSync(p) ? statSync(p).mtimeMs : 0);
  /**
   * Whether the site data (src/data/generated) still matches /content: compile the current
   * content in memory and compare it with the generated files (coverage.json is skipped; it
   * only carries a date and counts derived from the rest).
   */
  function siteStatus(content) {
    const builtAt = mtime(generated);
    let stale = [];
    try {
      const out = compile(content);
      stale = Object.keys(out).filter((name) => {
        if (name === 'coverage.json') return false;
        const p = join(genDir, name);
        return !existsSync(p) || JSON.stringify(JSON.parse(readFileSync(p, 'utf8'))) !== JSON.stringify(out[name]);
      });
    } catch {
      stale = ['(content could not be compiled)'];
    }
    return { builtAt, needsRebuild: stale.length > 0, stale };
  }

  const readDaily = () => (existsSync(dailyFile) ? JSON.parse(readFileSync(dailyFile, 'utf8')) : {});

  return { dir, readTables, check, commit, contentWith, siteStatus, readDaily, writeAtomic, dailyFile };
}

// ─── Entry bundles (one entry with its senses, translations and notes) ─────
export function bundleOf(tables, id) {
  const pick = (n, f) => tables[n].rows.map((r) => r.rec).filter(f);
  const entry = pick('entries', (e) => e.id === id)[0];
  if (!entry) return null;
  const senses = pick('senses', (s) => s.entry_id === id).sort((a, b) => Number(a.number) - Number(b.number));
  const ids = new Set(senses.map((s) => s.id));
  return {
    entry,
    senses,
    translations: pick('translations', (t) => ids.has(t.sense_id)),
    notes: pick('notes', (n) => n.entry_id === id),
    citations: pick('citations', (c) => c.entry_id === id),
  };
}

/** Stable fingerprint of an entry's rows, to detect edits made elsewhere since the form was opened. */
export function fingerprint(bundle) {
  if (!bundle) return null;
  const { entry, senses, translations, notes } = bundle;
  return createHash('sha1').update(JSON.stringify({ entry, senses, translations, notes })).digest('hex').slice(0, 16);
}

/**
 * Turn an edited entry (from the admin form) into table changes. Existing ids are kept; new
 * senses and notes get ids in the project's pattern (<entry>-<n>, n-<entry>-<n>).
 */
export function planEntrySave(tables, input) {
  const id = String(input.entry?.id ?? '').trim();
  const isNew = !input.originalId;
  if (!isNew && input.originalId !== id) throw new Error('An existing entry id cannot be changed (it is linked from senses, citations and URLs).');
  const before = isNew ? null : bundleOf(tables, id);
  if (!isNew && !before) throw new Error(`Entry "${id}" no longer exists.`);
  if (isNew && bundleOf(tables, id)) throw new Error(`An entry with id "${id}" already exists.`);

  const entry = { ...(before?.entry ?? {}), ...input.entry, id };
  const usedSense = new Set(tables.senses.rows.map((r) => r.rec.id));
  const keepSense = new Set(before?.senses.map((s) => s.id) ?? []);
  // A removed sense's id is never reused, so an old citation can never silently point at a new meaning.
  const nextSenseId = () => { let n = 1; while (usedSense.has(`${id}-${n}`)) n++; usedSense.add(`${id}-${n}`); return `${id}-${n}`; };

  const senses = [], translations = [];
  (input.senses ?? []).forEach((s, i) => {
    const sid = s.id && keepSense.has(s.id) ? s.id : nextSenseId();
    senses.push({ id: sid, entry_id: id, number: String(i + 1), definition_ta: s.definition_ta, source_id: s.source_id });
    for (const t of s.translations ?? []) {
      if (!String(t.text ?? '').trim()) continue;
      translations.push({ sense_id: sid, lang: t.lang, text: t.text, explanatory: t.explanatory ? 'y' : '', review_status: t.review_status, source_id: t.source_id });
    }
  });

  const usedNote = new Set(tables.notes.rows.map((r) => r.rec.id));
  const keepNote = new Set(before?.notes.map((n) => n.id) ?? []);
  const notes = (input.notes ?? []).filter((n) => String(n.text ?? '').trim()).map((n) => {
    let nid = n.id && keepNote.has(n.id) ? n.id : null;
    if (!nid) { let k = 1; while (usedNote.has(`n-${id}-${k}`)) k++; nid = `n-${id}-${k}`; usedNote.add(nid); }
    return { id: nid, entry_id: id, kind: n.kind, text: n.text, source_id: n.source_id };
  });

  const out = {
    entries: applyRows('entries', tables.entries, { upsert: [entry] }),
    senses: applyRows('senses', tables.senses, { upsert: senses, remove: before?.senses.map((s) => s.id) ?? [] }),
    translations: applyRows('translations', tables.translations, { upsert: translations, remove: before?.translations.map((t) => keyOf('translations', t)) ?? [] }),
    notes: applyRows('notes', tables.notes, { upsert: notes, remove: before?.notes.map((n) => n.id) ?? [] }),
    citations: tables.citations,
  };
  return { tables: out, changed: ['entries', 'senses', 'translations', 'notes'], id };
}

// ─── Import preview ─────────────────────────────────────────────────────────
/**
 * Compare an uploaded CSV with the current table: new rows, updates (with the changed columns),
 * unchanged rows, duplicate keys inside the file, missing required values, broken references,
 * and the errors validate() reports for the merged result. Nothing is written here.
 */
export function previewImport(store, tables, table, text, { allowUpdates }) {
  if (!TABLES.includes(table)) throw new Error(`Unknown table "${table}"`);
  const t = parseTable(text);
  const expected = CSV_FILES[table];
  const missingColumns = expected.filter((c) => !t.header.includes(c));
  const extraColumns = t.header.filter((c) => !expected.includes(c));
  const report = { table, rows: t.rows.length, missingColumns, extraColumns, added: [], updated: [], unchanged: 0, duplicates: [], missingFields: [], brokenRefs: [], validation: [], warnings: [], blocking: 0 };
  if (missingColumns.length || !t.rows.length) {
    report.blocking = missingColumns.length + (t.rows.length ? 0 : 1);
    if (!t.rows.length) report.validation.push('The file has no data rows.');
    return { report };
  }

  const current = new Map(tables[table].rows.map((r) => [keyOf(table, r.rec), r.rec]));
  const seen = new Map();
  const upsert = [];
  for (const row of t.rows) {
    const k = keyOf(table, row.rec);
    if (!k || k === '#') { report.missingFields.push({ line: row.line, key: k, fields: table === 'translations' ? ['sense_id', 'lang'] : ['id'] }); continue; }
    if (seen.has(k)) { report.duplicates.push({ key: k, lines: [seen.get(k), row.line] }); continue; }
    seen.set(k, row.line);
    const missing = REQUIRED[table].filter((f) => !row.rec[f]);
    if (missing.length) report.missingFields.push({ line: row.line, key: k, fields: missing });
    const old = current.get(k);
    if (!old) report.added.push({ key: k, line: row.line });
    else {
      const changes = expected.filter((h) => (old[h] ?? '') !== (row.rec[h] ?? '')).map((h) => ({ field: h, from: old[h] ?? '', to: row.rec[h] ?? '' }));
      if (changes.length) report.updated.push({ key: k, line: row.line, changes });
      else report.unchanged++;
    }
    upsert.push(row.rec);
  }

  const merged = { ...tables, [table]: applyRows(table, tables[table], { upsert }) };
  // Row-level reference checks against the merged data, so each problem names its file line.
  const has = (n, k) => merged[n].rows.some((r) => keyOf(n, r.rec) === k);
  const c = store.contentWith(merged);
  const sources = new Set(c.sources.map((s) => s.id));
  const poems = new Set(c.poems.map((p) => p.id));
  const topics = new Set(c.topics.map((x) => x.id));
  const langs = new Set(c.languages.map((l) => l.code));
  const ref = (row, field, target) => report.brokenRefs.push({ line: row.line, key: keyOf(table, row.rec), field, target });
  for (const row of t.rows) {
    const r = row.rec;
    if (r.source_id && !sources.has(r.source_id)) ref(row, 'source_id', r.source_id);
    if (table === 'senses' && r.entry_id && !has('entries', r.entry_id)) ref(row, 'entry_id', r.entry_id);
    if (table === 'notes' && r.entry_id && !has('entries', r.entry_id)) ref(row, 'entry_id', r.entry_id);
    if (table === 'translations') {
      if (r.sense_id && !has('senses', r.sense_id)) ref(row, 'sense_id', r.sense_id);
      if (r.lang && !langs.has(r.lang)) ref(row, 'lang', r.lang);
    }
    if (table === 'citations') {
      if (r.entry_id && !has('entries', r.entry_id)) ref(row, 'entry_id', r.entry_id);
      if (r.sense_id && !has('senses', r.sense_id)) ref(row, 'sense_id', r.sense_id);
      if (r.poem_id && !poems.has(r.poem_id)) ref(row, 'poem_id', r.poem_id);
    }
    if (table === 'entries') {
      for (const x of (r.related || '').split('|').map((s) => s.trim()).filter(Boolean)) if (!has('entries', x)) ref(row, 'related', x);
      for (const x of (r.topics || '').split('|').map((s) => s.trim()).filter(Boolean)) if (!topics.has(x)) ref(row, 'topics', x);
    }
  }
  const { errors, warnings } = validate(c);
  report.validation = errors;
  report.warnings = warnings;
  if (!allowUpdates && report.updated.length) report.validation = [`${report.updated.length} row(s) would change existing records; tick "Allow updates" to apply them.`, ...report.validation];
  report.blocking = report.duplicates.length + report.missingFields.length + report.brokenRefs.length + report.validation.length;
  return { report, merged };
}

export { compile };
