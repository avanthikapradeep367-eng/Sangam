#!/usr/bin/env node
/**
 * Validate /content and compile it into src/data/generated/*.json for the app.
 *
 *   npm run data          # validate + write generated files
 *   npm run data:check    # validate only (exit 1 on any error)
 *
 * Runs automatically before `npm run dev` and `npm run build`.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, validate, compile } from './lib/content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

// The imported reference vocabulary is optional and kept locally (see DATA.md). When its data and
// import script are present, refresh its merged output first; a fresh clone skips this step.
const vocabImport = join(root, 'scripts', 'vocab', 'import.mjs');
if (existsSync(vocabImport) && existsSync(join(root, 'content', 'sources', 'vocab', 'transcription'))) {
  execFileSync(process.execPath, [vocabImport], { stdio: 'inherit' });
}

const content = loadContent(join(root, 'content'));
const { errors, warnings } = validate(content);

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`\n${errors.length} error(s). Fix the content files and run again.`);
  process.exit(1);
}

const out = compile(content);
const cov = out['coverage.json'];
console.log(`ok: ${cov.entries} entries, ${cov.senses} senses, ${cov.citations} citations, ${out['poems.json'].length} poems`);

if (!checkOnly) {
  const dir = join(root, 'src', 'data', 'generated');
  mkdirSync(dir, { recursive: true });
  for (const [name, data] of Object.entries(out)) writeFileSync(join(dir, name), JSON.stringify(data, null, 1) + '\n');
  console.log(`wrote ${Object.keys(out).length} files to src/data/generated/`);
}
