/**
 * Shared loading, validation and compilation for the dictionary content in /content.
 * Used by scripts/build-data.mjs and scripts/import.mjs. See DATA.md for the file formats.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const CSV_FILES = {
  entries: ['id', 'headword', 'homograph', 'transliteration', 'pos', 'roman_aliases', 'spelling_variants', 'inflected_forms', 'related', 'topics', 'tinai', 'audio', 'status', 'source_id', 'synonyms', 'antonyms'],
  senses: ['id', 'entry_id', 'number', 'definition_ta', 'source_id'],
  translations: ['sense_id', 'lang', 'text', 'explanatory', 'review_status', 'source_id'],
  citations: ['id', 'entry_id', 'sense_id', 'poem_id', 'line', 'form', 'featured', 'review_status', 'source_id'],
  notes: ['id', 'entry_id', 'kind', 'text', 'source_id'],
};
export const JSON_FILES = ['works', 'sources', 'languages', 'topics'];

const AKAM_TINAI = ['குறிஞ்சி', 'முல்லை', 'மருதம்', 'நெய்தல்', 'பாலை'];
const ENTRY_STATUS = ['draft', 'reviewed', 'demo'];
const REVIEW_STATUS = ['reviewed', 'unreviewed'];
const NOTE_KINDS = ['grammar', 'etymology', 'usage'];
/** Where a meaning came from. Shown to readers next to every translation. */
const ORIGINS = ['book', 'editor', 'machine', 'unknown'];
export const VOCAB_SOURCE = 'reference-vocabulary';
/** The id the site sees for that source; it is deliberately neutral (the book is not named publicly). */
const PUBLIC_SOURCE = 'modern-vocabulary';

// ─── CSV ──────────────────────────────────────────────────────────────────
/** RFC 4180 CSV parser: quoted fields, doubled quotes, embedded commas/newlines. */
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', i = 0, quoted = false;
  text = text.replace(/^﻿/, '');
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { quoted = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { quoted = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((f) => f.trim() !== ''));
  if (nonEmpty.length === 0) return { header: [], records: [] };
  const [header, ...body] = nonEmpty;
  const records = body.map((r, n) => {
    const rec = { __line: n + 2 };
    header.forEach((h, k) => { rec[h.trim()] = (r[k] ?? '').trim().normalize('NFC'); });
    return rec;
  });
  return { header: header.map((h) => h.trim()), records };
}

export function toCSV(header, records) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header.join(','), ...records.map((r) => header.map((h) => esc(r[h])).join(','))].join('\n') + '\n';
}

const list = (s) => (s ? s.split('|').map((x) => x.trim()).filter(Boolean) : []);

// ─── Loading ─────────────────────────────────────────────────────────────
export function loadContent(dir) {
  const content = { files: {} };
  for (const name of Object.keys(CSV_FILES)) {
    const path = join(dir, `${name}.csv`);
    if (!existsSync(path)) { content[name] = []; continue; }
    const { header, records } = parseCSV(readFileSync(path, 'utf8'));
    content.files[name] = { path, header };
    content[name] = records.map((r) => ({ ...r, __file: `${name}.csv` }));
  }
  for (const name of JSON_FILES) {
    const path = join(dir, `${name}.json`);
    content[name] = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
  }
  // A locally imported reference vocabulary keeps its own source record next to its data
  // (content/sources/vocab/, not in the public repository).
  const vocabSource = join(dir, 'sources', 'vocab', 'source.json');
  if (existsSync(vocabSource)) content.sources.push(JSON.parse(readFileSync(vocabSource, 'utf8')));
  content.poems = [];
  const poemDir = join(dir, 'poems');
  if (existsSync(poemDir)) {
    for (const f of readdirSync(poemDir).filter((f) => f.endsWith('.json')).sort()) {
      const poems = JSON.parse(readFileSync(join(poemDir, f), 'utf8'));
      for (const p of poems) content.poems.push({ ...p, __file: `poems/${f}` });
    }
  }
  // Book imports (see scripts/vocab/import.mjs). Optional: the site builds without them.
  const mc = join(dir, 'sources', 'vocab');
  const readIf = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
  const imageDir = join(dir, '..', 'public', 'source-pages', 'vocab');
  content.vocab = {
    entries: readIf(join(mc, 'import', 'entries.json'), []),
    links: readIf(join(mc, 'import', 'links.json'), []),
    topics: readIf(join(mc, 'topics.json'), { sections: [] }).sections,
    pageImages: existsSync(imageDir) ? new Set(readdirSync(imageDir)) : new Set(),
  };
  return content;
}

// ─── Validation ──────────────────────────────────────────────────────────
export function validate(c) {
  const errors = [];
  const warnings = [];
  const where = (r) => (r.__file ? `${r.__file}${r.__line ? ':' + r.__line : ''}` : '');
  const err = (r, msg) => errors.push(`${where(r)} ${msg}`.trim());
  const warn = (r, msg) => warnings.push(`${where(r)} ${msg}`.trim());

  const index = (rows, label) => {
    const map = new Map();
    for (const r of rows) {
      if (!r.id) { err(r, `${label}: missing id`); continue; }
      if (!/^[a-z0-9][a-z0-9-]*$/.test(r.id)) err(r, `${label} "${r.id}": id must be lowercase ASCII letters, digits and hyphens`);
      if (map.has(r.id)) err(r, `${label}: duplicate id "${r.id}" (also at ${where(map.get(r.id))})`);
      else map.set(r.id, r);
    }
    return map;
  };

  const sources = index(c.sources, 'source');
  for (const s of c.sources) if (!ORIGINS.includes(s.origin)) errors.push(`sources.json: source "${s.id}" needs "origin": one of ${ORIGINS.join(', ')}`);
  const bookSenses = new Set((c.vocab?.entries ?? []).flatMap((e) => e.senses.map((s) => s.id)));
  const works = index(c.works, 'work');
  const topics = index(c.topics, 'topic');
  const entries = index(c.entries, 'entry');
  const senses = index(c.senses, 'sense');
  index(c.citations, 'citation');
  const poems = index(c.poems, 'poem');
  index(c.notes, 'note');

  const langs = new Map();
  for (const l of c.languages) {
    if (langs.has(l.code)) errors.push(`languages.json: duplicate language "${l.code}"`);
    langs.set(l.code, l);
  }
  if ([...langs.values()].filter((l) => l.base).length !== 1) errors.push('languages.json: exactly one language must have "base": true');

  const needSource = (r, id) => { if (!id) err(r, 'missing source_id'); else if (!sources.has(id)) err(r, `unknown source "${id}"`); };

  for (const w of c.works) if (w.sourceId && !sources.has(w.sourceId)) errors.push(`works.json: work "${w.id}" refers to unknown source "${w.sourceId}"`);

  // Poems
  const poemNumbers = new Set();
  for (const p of c.poems) {
    if (!works.has(p.workId)) err(p, `poem "${p.id}": unknown work "${p.workId}"`);
    if (!sources.has(p.sourceId)) err(p, `poem "${p.id}": unknown source "${p.sourceId}"`);
    const key = `${p.workId}/${p.number}`;
    if (poemNumbers.has(key)) err(p, `poem "${p.id}": duplicate poem number ${key}`);
    poemNumbers.add(key);
    if (p.id !== `${p.workId}-${p.number}`) err(p, `poem "${p.id}": id must be "<workId>-<number>"`);
    if (!Array.isArray(p.lines) || p.lines.length === 0 || p.lines.some((l) => !l.trim())) err(p, `poem "${p.id}": lines must be non-empty strings`);
    if (!REVIEW_STATUS.includes(p.reviewStatus)) err(p, `poem "${p.id}": reviewStatus must be one of ${REVIEW_STATUS.join(', ')}`);
  }

  // Entries
  const headwordKeys = new Map();
  for (const e of c.entries) {
    if (!e.headword) err(e, `entry "${e.id}": missing headword`);
    if (!/^[஀-௿\s]+$/.test(e.headword)) err(e, `entry "${e.id}": headword must be Tamil script`);
    if (!e.pos) err(e, `entry "${e.id}": missing pos`);
    if (!ENTRY_STATUS.includes(e.status)) err(e, `entry "${e.id}": status must be one of ${ENTRY_STATUS.join(', ')}`);
    needSource(e, e.source_id);
    const hwKey = `${e.headword}#${e.homograph || ''}`;
    if (headwordKeys.has(hwKey)) err(e, `entry "${e.id}": same headword and homograph number as "${headwordKeys.get(hwKey)}"; give each a distinct homograph number`);
    headwordKeys.set(hwKey, e.id);
    for (const r of list(e.related)) if (!entries.has(r)) err(e, `entry "${e.id}": related entry "${r}" does not exist`);
    for (const t of list(e.topics)) if (!topics.has(t)) err(e, `entry "${e.id}": unknown topic "${t}"`);
    for (const w of [...list(e.synonyms), ...list(e.antonyms)]) if (!/^[஀-௿\s]+$/.test(w)) err(e, `entry "${e.id}": synonym/antonym "${w}" must be Tamil script`);
    if (e.tinai && !AKAM_TINAI.includes(e.tinai)) err(e, `entry "${e.id}": tinai must be one of ${AKAM_TINAI.join(', ')}`);
  }
  // Homographs: if two entries share a headword, both need a number.
  const byHeadword = new Map();
  for (const e of c.entries) byHeadword.set(e.headword, [...(byHeadword.get(e.headword) ?? []), e]);
  for (const [hw, group] of byHeadword) {
    if (group.length > 1 && group.some((e) => !e.homograph)) err(group[0], `headword "${hw}" has ${group.length} entries; each needs a homograph number`);
  }

  // Senses
  const senseNumbers = new Set();
  for (const s of c.senses) {
    if (!entries.has(s.entry_id)) err(s, `sense "${s.id}": entry "${s.entry_id}" does not exist`);
    if (!s.definition_ta) err(s, `sense "${s.id}": missing Tamil definition`);
    const key = `${s.entry_id}#${s.number}`;
    if (!/^\d+$/.test(s.number)) err(s, `sense "${s.id}": number must be a positive integer`);
    if (senseNumbers.has(key)) err(s, `sense "${s.id}": duplicate sense number ${s.number} for entry "${s.entry_id}"`);
    senseNumbers.add(key);
    needSource(s, s.source_id);
  }
  for (const e of c.entries) if (!c.senses.some((s) => s.entry_id === e.id)) err(e, `entry "${e.id}" has no senses`);

  // Translations
  const tKeys = new Set();
  for (const t of c.translations) {
    if (!senses.has(t.sense_id) && !bookSenses.has(t.sense_id)) err(t, `translation: sense "${t.sense_id}" does not exist`);
    const lang = langs.get(t.lang);
    if (!lang) err(t, `translation: unknown language "${t.lang}" (add it to languages.json first)`);
    else if (lang.base) err(t, `translation: "${t.lang}" is the base language; put it in senses.csv definition_ta`);
    const key = `${t.sense_id}#${t.lang}`;
    if (tKeys.has(key)) err(t, `translation: duplicate ${t.lang} translation for sense "${t.sense_id}"`);
    tKeys.add(key);
    if (!t.text) err(t, `translation ${key}: empty text`);
    if (!REVIEW_STATUS.includes(t.review_status)) err(t, `translation ${key}: review_status must be one of ${REVIEW_STATUS.join(', ')}`);
    if (t.explanatory && t.explanatory !== 'y') err(t, `translation ${key}: explanatory must be "y" or empty`);
    if (/[஀-௿]/.test(t.text)) warn(t, `translation ${key}: contains Tamil script; transliterate embedded terms into the target script`);
    needSource(t, t.source_id);
  }

  // Citations: the key integrity check — the attested form must appear in the cited line.
  for (const ct of c.citations) {
    const entry = entries.get(ct.entry_id);
    const sense = senses.get(ct.sense_id);
    const poem = poems.get(ct.poem_id);
    if (!entry) err(ct, `citation "${ct.id}": entry "${ct.entry_id}" does not exist`);
    if (ct.sense_id && !sense) err(ct, `citation "${ct.id}": sense "${ct.sense_id}" does not exist`);
    if (sense && sense.entry_id !== ct.entry_id) err(ct, `citation "${ct.id}": sense "${ct.sense_id}" belongs to entry "${sense.entry_id}", not "${ct.entry_id}"`);
    if (!poem) { err(ct, `citation "${ct.id}": poem "${ct.poem_id}" does not exist (broken entry-to-poem link)`); continue; }
    const line = Number(ct.line);
    if (!Number.isInteger(line) || line < 1 || line > poem.lines.length) {
      err(ct, `citation "${ct.id}": line ${ct.line} is outside ${ct.poem_id} (1–${poem.lines.length})`);
      continue;
    }
    if (!ct.form) err(ct, `citation "${ct.id}": missing attested form`);
    else if (!poem.lines[line - 1].normalize('NFC').includes(ct.form)) err(ct, `citation "${ct.id}": form "${ct.form}" not found in ${ct.poem_id} line ${line}: "${poem.lines[line - 1]}"`);
    if (ct.featured && ct.featured !== 'y') err(ct, `citation "${ct.id}": featured must be "y" or empty`);
    if (!REVIEW_STATUS.includes(ct.review_status)) err(ct, `citation "${ct.id}": review_status must be one of ${REVIEW_STATUS.join(', ')}`);
    needSource(ct, ct.source_id);
  }

  for (const n of c.notes) {
    if (!entries.has(n.entry_id)) err(n, `note "${n.id}": entry "${n.entry_id}" does not exist`);
    if (!NOTE_KINDS.includes(n.kind)) err(n, `note "${n.id}": kind must be one of ${NOTE_KINDS.join(', ')}`);
    if (!n.text) err(n, `note "${n.id}": empty text`);
    needSource(n, n.source_id);
  }

  // Book imports
  if (c.vocab?.entries.length) {
    if (!sources.has(VOCAB_SOURCE)) errors.push(`sources.json: the vocabulary import needs a source with id "${VOCAB_SOURCE}"`);
    const seen = new Set();
    for (const e of c.vocab.entries) {
      if (seen.has(e.id)) errors.push(`vocab: duplicate record ${e.id}`);
      seen.add(e.id);
      if (entries.has(e.id)) errors.push(`vocab: record id ${e.id} clashes with an entry in entries.csv`);
      if (!e.headword) errors.push(`vocab ${e.ref}: missing headword`);
    }
    for (const l of c.vocab.links) {
      const where = `sources/vocab/links.csv (ref ${l.ref})`;
      if (!seen.has(`mc-${l.ref}`)) errors.push(`${where}: no vocabulary record ${l.ref}`);
      if (!entries.has(l.entryId)) errors.push(`${where}: entry "${l.entryId}" does not exist`);
      if (l.senseId && senses.get(l.senseId)?.entry_id !== l.entryId) errors.push(`${where}: sense "${l.senseId}" is not a sense of "${l.entryId}"`);
    }
  }

  // Coverage warnings (non-fatal)
  const translatable = [...langs.values()].filter((l) => !l.base).map((l) => l.code);
  let missing = 0;
  for (const id of [...c.senses.map((s) => s.id), ...bookSenses]) for (const l of translatable) if (!tKeys.has(`${id}#${l}`) && !(l === 'en' && bookSenses.has(id))) missing++;
  if (missing) warnings.push(`${missing} sense/language pairs have no translation yet (shown to readers as "not yet added")`);

  return { errors, warnings };
}

// ─── Compilation ─────────────────────────────────────────────────────────
const strip = (r) => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('__')));

export function compile(c) {
  const originOf = new Map(c.sources.map((s) => [s.id, s.origin]));
  const translationsBySense = new Map();
  for (const t of c.translations) {
    const m = translationsBySense.get(t.sense_id) ?? {};
    m[t.lang] = {
      text: t.text,
      ...(t.explanatory === 'y' ? { isExplanatoryGloss: true } : {}),
      reviewStatus: t.review_status,
      sourceId: t.source_id,
      origin: originOf.get(t.source_id) ?? 'unknown',
    };
    translationsBySense.set(t.sense_id, m);
  }

  const entries = c.entries.map((e) => {
    const senses = c.senses
      .filter((s) => s.entry_id === e.id)
      .sort((a, b) => Number(a.number) - Number(b.number))
      .map((s) => ({
        id: s.id,
        number: Number(s.number),
        definition: s.definition_ta,
        definitionOrigin: originOf.get(s.source_id) ?? 'unknown',
        sourceId: s.source_id,
        reviewStatus: 'unreviewed',
        translations: translationsBySense.get(s.id) ?? {},
      }));
    return {
      id: e.id,
      collection: 'sangam',
      headword: e.headword,
      ...(e.homograph ? { homograph: Number(e.homograph) } : {}),
      transliteration: e.transliteration || undefined,
      partOfSpeech: e.pos,
      aliases: list(e.roman_aliases),
      spellingVariants: list(e.spelling_variants),
      inflectedForms: list(e.inflected_forms),
      relatedIds: list(e.related),
      synonyms: list(e.synonyms),
      antonyms: list(e.antonyms),
      topics: list(e.topics),
      ...(e.tinai ? { tinai: e.tinai } : {}),
      ...(e.audio ? { pronunciationAudio: e.audio } : {}),
      status: e.status,
      sourceId: e.source_id,
      senses,
      notes: c.notes.filter((n) => n.entry_id === e.id).map((n) => ({ id: n.id, kind: n.kind, text: n.text, sourceId: n.source_id })),
    };
  });

  const book = compileVocabulary(c, translationsBySense);
  // Cross-source links are shown on both entries.
  const linksByEntry = new Map();
  for (const l of c.vocab?.links ?? []) {
    const mcId = `mc-${l.ref}`;
    const push = (id, link) => linksByEntry.set(id, [...(linksByEntry.get(id) ?? []), link]);
    push(l.entryId, { entryId: mcId, senseId: null, ownSenseId: l.senseId, relation: l.relation, note: null });
    push(mcId, { entryId: l.entryId, senseId: l.senseId, ownSenseId: null, relation: l.relation, note: null });
  }
  const bookById = new Map(book.entries.map((b) => [b.id, b]));
  for (const e of [...entries, ...book.entries]) e.links = linksByEntry.get(e.id) ?? [];
  // A sample entry of unknown origin is superseded once a linked book record has been approved.
  for (const e of entries) {
    const approved = e.links.map((l) => bookById.get(l.entryId)).find((b) => b?.status === 'reviewed');
    if (approved && e.sourceId === 'legacy-sample') e.supersededBy = approved.id;
  }
  entries.push(...book.entries);

  const citations = c.citations.map((ct) => ({
    id: ct.id,
    entryId: ct.entry_id,
    senseId: ct.sense_id || null,
    poemId: ct.poem_id,
    line: Number(ct.line),
    form: ct.form,
    featured: ct.featured === 'y',
    reviewStatus: ct.review_status,
    sourceId: ct.source_id,
  }));

  const poems = c.poems.map(strip).sort((a, b) =>
    a.workId === b.workId ? Number(a.number) - Number(b.number) : a.workId.localeCompare(b.workId));

  const langs = c.languages;
  const translatable = langs.filter((l) => !l.base).map((l) => l.code);
  const coverage = {
    generatedAt: new Date().toISOString().slice(0, 10),
    entries: entries.length,
    senses: entries.reduce((n, e) => n + e.senses.length, 0),
    tamilDefinitions: entries.reduce((n, e) => n + e.senses.filter((s) => s.definition).length, 0),
    collections: {
      sangam: entries.filter((e) => e.collection === 'sangam').length,
      modern: book.stats,
    },
    citations: citations.length,
    entriesByStatus: Object.fromEntries(ENTRY_STATUS.map((s) => [s, entries.filter((e) => e.status === s).length])),
    translations: Object.fromEntries(translatable.map((l) => {
      const ts = entries.flatMap((e) => e.senses.map((s) => s.translations[l]).filter(Boolean));
      const byOrigin = {};
      for (const t of ts) byOrigin[t.origin] = (byOrigin[t.origin] ?? 0) + 1;
      return [l, { total: ts.length, reviewed: ts.filter((t) => t.reviewStatus === 'reviewed').length, byOrigin }];
    })),
    works: Object.fromEntries(c.works.map((w) => {
      const ps = poems.filter((p) => p.workId === w.id);
      return [w.id, { poems: ps.length, numbers: ps.map((p) => p.number), reviewedPoems: ps.filter((p) => p.reviewStatus === 'reviewed').length }];
    })),
  };

  return {
    'dictionary.json': entries,
    'citations.json': citations,
    'poems.json': poems,
    'works.json': c.works,
    // Reference books used for the modern-Tamil layer are not named on the site (owner's decision);
    // full provenance stays in content/sources/ and in the dev-only editor.
    'sources.json': c.sources.filter((src) => src.kind !== 'reference'),
    'languages.json': langs,
    'topics.json': [...c.topics.map((t) => ({ ...t, scheme: 'sangam', parent: null })), ...book.topics],
    'coverage.json': coverage,
  };
}

// ─── Imported reference vocabulary (data kept locally in content/sources/vocab/) ──
/** Strip the book's underline markers (_x_ colloquial-only, __x__ explanation) for plain display. */
const plainGloss = (g) => g.replace(/__?/g, '');

/** Topic id for an Appendix I heading code (A1 → mc-a1). */
export const mcTopicId = (code) => `mc-${code.toLowerCase()}`;

function compileVocabulary(c, translationsBySense) {
  const mc = c.vocab ?? { entries: [], links: [], topics: [], pageImages: new Set() };
  let group = null;
  const topics = mc.topics.map((t) => {
    // 1–5 are the book's section groups; A–X sit under the preceding group, A1 under A, B1a under B1.
    if (/^\d$/.test(t.code)) group = t.code;
    const parent = /^\d$/.test(t.code) ? null : /^[A-Z]$/.test(t.code) ? group : t.code.slice(0, -1);
    return { id: mcTopicId(t.code), label: t.ta, code: t.code, scheme: 'modern', parent: parent ? mcTopicId(parent) : null };
  });
  const usage = (s) => [
    ...(s.colloquialOnly ? ['colloquial-only'] : []),
    ...(s.literaryOnly ? ['literary-only'] : []),
    ...(s.explanation ? ['explanation'] : []),
  ];

  const entries = mc.entries.map((e) => {
    const approved = e.review.status === 'approved';
    return {
      id: e.id,
      collection: 'modern',
      headword: e.headword,
      partOfSpeech: e.partOfSpeech,
      aliases: [],
      spellingVariants: e.mltForms.slice(1),
      inflectedForms: [],
      relatedIds: [],
      topics: e.topics.map(mcTopicId),
      status: approved ? 'reviewed' : 'draft',
      sourceId: PUBLIC_SOURCE,
      register: e.register,
      star: e.star,
      literaryForms: e.hlt,
      colloquial: e.colloquial,
      grammarNote: e.grammar,
      verbClass: e.verbClass,
      irregularForms: e.irregularForms,
      subforms: e.subforms.map((s) => ({
        id: s.id, mlt: s.mlt, hlt: s.hlt, grammar: s.grammar, colloquial: s.colloquial,
        english: s.english ? plainGloss(s.english) : s.english,
      })),
      review: { status: e.review.status, transcription: e.review.transcription },
      noMltInBook: e.flags.some((f) => f.kind === 'no-mlt-in-book'),
      senses: e.senses.map((s) => {
        const m = s.meanings ?? {};
        const extra = {};
        for (const [lang, v] of Object.entries(m)) {
          if (lang !== 'ta') extra[lang] = { text: v.text, reviewStatus: v.reviewed ? 'reviewed' : 'unreviewed', sourceId: 'editorial-draft', origin: v.origin };
        }
        return {
          id: s.id,
          number: s.number,
          definition: m.ta?.text ?? '',
          definitionOrigin: m.ta ? m.ta.origin : null,
          sourceId: m.ta ? 'editorial-draft' : PUBLIC_SOURCE,
          reviewStatus: m.ta?.reviewed ? 'reviewed' : 'unreviewed',
          usage: usage(s),
          bookNumber: s.bookNumber,
          translations: {
            ...(translationsBySense.get(s.id) ?? {}),
            ...extra,
            en: { text: plainGloss(s.gloss), reviewStatus: approved ? 'reviewed' : 'unreviewed', sourceId: PUBLIC_SOURCE, origin: 'book' },
          },
        };
      }),
      notes: [],
    };
  });
  const count = (st) => mc.entries.filter((e) => e.review.status === st).length;
  return {
    entries,
    topics,
    stats: {
      total: entries.length, approved: count('approved'), pending: count('pending'), flagged: count('flagged'),
      withValidationFlags: mc.entries.filter((e) => e.flags.some((f) => f.kind !== 'no-mlt-in-book')).length,
    },
  };
}
