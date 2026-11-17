#!/usr/bin/env node
/**
 * Merge a batch of new content into /content, validating the combined result first.
 *
 *   npm run data:import -- <batch-dir> [--replace] [--dry-run]
 *
 * <batch-dir> may contain any of: entries.csv, senses.csv, translations.csv, citations.csv,
 * notes.csv (same columns as /content), poems/*.json, works.json, sources.json,
 * languages.json, topics.json.
 *
 * Rows whose id (or sense_id+lang for translations) already exists are rejected unless
 * --replace is given. Nothing is written if validation fails. See DATA.md.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CSV_FILES, JSON_FILES, loadContent, parseCSV, toCSV, validate } from './lib/content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const batchDir = args.find((a) => !a.startsWith('--'));
const replace = args.includes('--replace');
const dryRun = args.includes('--dry-run');
if (!batchDir) {
  console.error('usage: npm run data:import -- <batch-dir> [--replace] [--dry-run]');
  process.exit(1);
}
const batch = resolve(batchDir);
const contentDir = join(root, 'content');
const content = loadContent(contentDir);
const keyOf = (name, r) => (name === 'translations' ? `${r.sense_id}#${r.lang}` : name === 'languages' ? r.code : r.id);
const conflicts = [];
const changed = new Set();
let added = 0, replaced = 0;

function merge(name, rows, tag) {
  for (const row of rows) {
    const key = keyOf(name, row);
    const i = content[name].findIndex((r) => keyOf(name, r) === key);
    if (i >= 0 && !replace) { conflicts.push(`${tag}: "${key}" already exists (use --replace to overwrite)`); continue; }
    if (i >= 0) { content[name][i] = row; replaced++; } else { content[name].push(row); added++; }
    changed.add(name);
  }
}

for (const name of Object.keys(CSV_FILES)) {
  const path = join(batch, `${name}.csv`);
  if (!existsSync(path)) continue;
  const { header, records } = parseCSV(readFileSync(path, 'utf8'));
  const missingCols = CSV_FILES[name].filter((c) => !header.includes(c));
  if (missingCols.length) { console.error(`${name}.csv: missing columns ${missingCols.join(', ')}`); process.exit(1); }
  merge(name, records.map((r) => ({ ...r, __file: `batch/${name}.csv` })), `${name}.csv`);
}
for (const name of JSON_FILES) {
  const path = join(batch, `${name}.json`);
  if (existsSync(path)) merge(name, JSON.parse(readFileSync(path, 'utf8')), `${name}.json`);
}
const poemFiles = new Map();
if (existsSync(join(batch, 'poems'))) {
  for (const f of readdirSync(join(batch, 'poems')).filter((f) => f.endsWith('.json'))) {
    const rows = JSON.parse(readFileSync(join(batch, 'poems', f), 'utf8')).map((p) => ({ ...p, __file: `poems/${f}` }));
    merge('poems', rows, `poems/${f}`);
    poemFiles.set(f, true);
  }
}

// Validate even when there are conflicts, so the editor sees every problem in one pass.
const { errors, warnings } = validate(content);
warnings.forEach((w) => console.warn(`warning: ${w}`));
if (conflicts.length || errors.length) {
  conflicts.forEach((c) => console.error(`conflict: ${c}`));
  errors.forEach((e) => console.error(`error: ${e}`));
  console.error(`\nImport rejected: ${conflicts.length + errors.length} problem(s). Nothing was written.`);
  process.exit(1);
}
console.log(`ok: ${added} added, ${replaced} replaced`);
if (dryRun) { console.log('dry run: nothing written'); process.exit(0); }

const clean = (r) => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('__')));
for (const name of changed) {
  if (CSV_FILES[name]) {
    const header = content.files[name]?.header ?? CSV_FILES[name];
    writeFileSync(join(contentDir, `${name}.csv`), toCSV(header, content[name]));
  } else if (name === 'poems') {
    // Write each poem back to the file it came from (new poems go to the batch file name).
    const byFile = new Map();
    for (const p of content.poems) {
      const file = p.__file.replace(/^poems\//, '');
      byFile.set(file, [...(byFile.get(file) ?? []), clean(p)]);
    }
    for (const [file, rows] of byFile) writeFileSync(join(contentDir, 'poems', file), JSON.stringify(rows, null, 2) + '\n');
  } else {
    writeFileSync(join(contentDir, `${name}.json`), JSON.stringify(content[name].map(clean), null, 2) + '\n');
  }
}
console.log(`updated: ${[...changed].join(', ')}. Run "npm run data" to regenerate the app data.`);
