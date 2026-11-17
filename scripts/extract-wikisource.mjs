#!/usr/bin/env node
/**
 * Extract poem text + metadata from Tamil Wikisource wikitext (fetched with `action=raw`).
 *
 * Only the verse, திணை, கூற்று, துறை and poet name are extracted. Modern commentary
 * on those pages (செய்தி, அருஞ்சொற் பொருள் …) is deliberately skipped.
 *
 * Usage:
 *   node scripts/extract-wikisource.mjs kuruntokai <out.json> <raw1.txt> [raw2.txt …]
 *   node scripts/extract-wikisource.mjs purananuru <out.json> <raw1.txt> [raw2.txt …]
 *
 * Output: an array of poem records in the shape documented in DATA.md (normally content/poems/<work>.json). Every record is
 * written with reviewStatus "unreviewed" — a person must compare it against a print edition.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , format, outPath, ...inputs] = process.argv;
if (!format || !outPath || inputs.length === 0) {
  console.error('usage: extract-wikisource.mjs <kuruntokai|purananuru> <out.json> <raw.txt…>');
  process.exit(1);
}

const TINAI = ['குறிஞ்சி', 'முல்லை', 'மருதம்', 'நெய்தல்', 'பாலை'];
const clean = (s) =>
  s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/'''?/g, '').replace(/\s+/g, ' ').trim();

/** Pull "(… பாடம் …)" style alternate-reading notes out of the verse line. */
function splitReadings(lines) {
  const readings = [];
  const out = lines.map((l, i) => {
    const m = l.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (m) { readings.push({ line: i + 1, note: m[2].trim() }); l = m[1]; }
    // NFC + drop a stray virama that follows a vowel sign (a source typo, e.g. "நீ்க்கி")
    return l.normalize('NFC').replace(/([ா-ௌ])்/g, '$1').replace(/\s{2,}/g, ' ').trim();
  });
  return { lines: out, readings };
}

function poemRecord(workId, number, fields) {
  const { lines, readings } = splitReadings(fields.lines);
  return {
    id: `${workId}-${number}`,
    workId,
    number: String(number),
    tinai: fields.tinai ?? null,
    turai: fields.turai ?? null,
    speaker: fields.speaker ?? null,
    poet: fields.poet ?? null,
    lines,
    readings,
    sourceId: `wikisource-${workId}`,
    reviewStatus: 'unreviewed',
    provenance: 'Extracted from Tamil Wikisource by scripts/extract-wikisource.mjs; not yet compared with a print edition.',
  };
}

function parseKuruntokai(text) {
  const out = [];
  const sections = text.split(/^==\s*பாடல்[:\s]*/m).slice(1);
  for (const sec of sections) {
    const num = parseInt(sec.match(/^(\d+)/)?.[1] ?? '', 10);
    if (!num) continue;
    const rows = sec.split('\n').slice(1);
    let tinai = null, speaker = null, poet = null;
    const lines = [];
    let inVerse = false, verseDone = false;
    for (const raw of rows) {
      const row = raw.trim();
      if (/^==/.test(row)) break; // next subsection (commentary)
      if (!verseDone && row.startsWith(':') && !/^:\s*(என்பது|என்றது)/.test(row)) {
        inVerse = true;
        lines.push(row.replace(/^:+/, '').trim());
        continue;
      }
      if (inVerse) verseDone = true;
      const head = row.replace(/^;/, '');
      if (!inVerse && /கூற்று/.test(head)) {
        const [a, b] = head.replace(/\.$/, '').split(/\s*-\s*/);
        if (b) { const t = a.trim().replace(/மு$/, 'ம்'); tinai = TINAI.includes(t) ? t : null; speaker = b.trim(); }
        else speaker = a.trim();
      }
      const p = row.match(/^;?\s*பாடியவர்\s*:?\s*(.+)$/);
      if (p) poet = clean(p[1]).replace(/\s*\(.*\)\s*$/, '').replace(/\.$/, '');
    }
    out.push(poemRecord('kuruntokai', num, { tinai, speaker, poet, lines }));
  }
  return out;
}

function parsePurananuru(text) {
  const out = [];
  // Each poem number appears either alone on a line or after a closing </poem>.
  const re = /(?:^|(?<=<\/poem>))[ \t]*(\d{1,3})\s*\n\s*(?:===[^\n]*===\s*\n)?<poem>\n([\s\S]*?)<\/poem>/gm;
  let m;
  while ((m = re.exec(text))) {
    const num = parseInt(m[1], 10);
    const body = m[2].split('\n').map((l) => l.trim());
    let poet = null, tinai = null, turai = null;
    const lines = [];
    let started = false;
    for (const row of body) {
      const p = row.match(/^பாடியவர்\s*:?\s*(.+)$/);
      if (p) { poet = p[1].replace(/\.$/, '').trim(); continue; }
      const t = row.match(/^திணை\s*[:-]\s*(.+?)(?:\s*துறை\s*:\s*(.+))?$/);
      if (t) { tinai = t[1].replace(/[.]/g, '').replace(/\s*திணை$/, '').trim(); turai = t[2]?.replace(/\.$/, '').trim() ?? null; continue; }
      if (/^பாடப்பட்டோன்/.test(row)) continue;
      if (!row) { if (started) { if (lines.length) break; } continue; }
      if (/^[-.(]/.test(row)) break; // signature / alternate-edition separator
      started = true;
      lines.push(row.replace(/`+/g, '"').replace(/\s+([;,!])/g, '$1').replace(/\s{2,}/g, ' '));
    }
    out.push(poemRecord('purananuru', num, { poet, tinai, turai, lines }));
  }
  return out;
}

const parse = format === 'kuruntokai' ? parseKuruntokai : parsePurananuru;
const poems = inputs.flatMap((f) => parse(readFileSync(f, 'utf8')));
poems.sort((a, b) => Number(a.number) - Number(b.number));
writeFileSync(outPath, JSON.stringify(poems, null, 2) + '\n');
console.log(`${poems.length} poems → ${outPath}`);
