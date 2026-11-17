import type { BrowseFilters, DictionaryEntry, LangCode, Poem, Sense } from '../types';
import {
  entries, citationsByEntry, poems, languages, topicWithin, worksForEntry,
} from '../data';
import {
  compact, compactWithMap, detectScript, editDistance, graphemes, indexLetter, initialSyllable, normalize, romanKey, tamilCollator, transliterate,
} from './tamil';

// ─── Index ───────────────────────────────────────────────────────────────
type FormKind = 'headword' | 'variant' | 'inflected' | 'attested' | 'spoken' | 'literary' | 'subform';
interface IndexedForm { text: string; kind: FormKind }

const formIndex = new Map<string, IndexedForm[]>();
const romanIndex = new Map<string, string[]>();
for (const e of entries) {
  const forms: IndexedForm[] = [{ text: normalize(e.headword), kind: 'headword' }];
  for (const v of e.spellingVariants) forms.push({ text: normalize(v), kind: 'variant' });
  for (const v of e.inflectedForms) forms.push({ text: normalize(v), kind: 'inflected' });
  for (const c of citationsByEntry.get(e.id) ?? []) {
    const f = normalize(c.form);
    // Only whole-token attested forms are indexed; fragments split by sandhi (e.g. "குரு") are not useful queries.
    if (!forms.some((x) => x.text === f) && graphemes(f).length >= 2 && !f.includes(' ')) forms.push({ text: f, kind: 'attested' });
  }
  const add = (text: string | null | undefined, kind: FormKind) => {
    for (const t of splitForms(text)) if (!forms.some((x) => x.text === t)) forms.push({ text: t, kind });
  };
  add(e.colloquial?.tamil, 'spoken');
  for (const h of e.literaryForms ?? []) add(h, 'literary');
  for (const sf of e.subforms ?? []) { add(sf.mlt, 'subform'); add(sf.colloquial.tamil, 'spoken'); for (const h of sf.hlt) add(h, 'literary'); }
  formIndex.set(e.id, forms);
  const roman = [
    ...(e.transliteration ? [e.transliteration] : []), ...e.aliases,
    // The book's own Roman transcription of the spoken form (the source's own notation), and a plain romanization of every Tamil form.
    ...splitForms(e.colloquial?.roman), ...(e.subforms ?? []).flatMap((sf) => splitForms(sf.colloquial.roman)),
    ...forms.filter((x) => x.kind !== 'attested').map((x) => transliterate(x.text)),
  ];
  romanIndex.set(e.id, Array.from(new Set(roman.map(romanKey))).filter(Boolean));
}

/** "வய்யி (வக்க்ய, வச்சு)" → [வய்யி, வக்க்ய, வச்சு]; drops the book's sense numbers and verb-class marks. */
function splitForms(s: string | null | undefined): string[] {
  if (!s) return [];
  return s.split(/[,;()/]/).map((x) => normalize(x.replace(/^s*d.s*/, '').replace(/[=-]+$/, ''))).filter((x) => x && !/^d/.test(x));
}

export const FORM_LABEL: Record<FormKind, string> = {
  headword: 'தலைச்சொல்',
  variant: 'மாற்று எழுத்துக்கூட்டு',
  inflected: 'சொல் வடிவம்',
  attested: 'பாடலில் வரும் வடிவம்',
  spoken: 'பேச்சு வழக்கு வடிவம்',
  literary: 'உயர் இலக்கிய வடிவம்',
  subform: 'தொடர்புடைய வடிவம்',
};

// ─── Filters ─────────────────────────────────────────────────────────────
export function matchesFilters(entry: DictionaryEntry, f: BrowseFilters): boolean {
  if (f.letter && indexLetter(entry.headword) !== f.letter && initialSyllable(entry.headword) !== f.letter) return false;
  if (f.src && entry.collection !== f.src) return false;
  if (f.pos && entry.partOfSpeech !== f.pos) return false;
  if (f.tinai && entry.tinai !== f.tinai) return false;
  if (f.topic && !entry.topics.some((t) => topicWithin(t, f.topic!))) return false;
  if (f.work && !worksForEntry(entry.id).includes(f.work)) return false;
  return true;
}

export function hasFilters(f: BrowseFilters) {
  return Boolean(f.letter || f.pos || f.tinai || f.topic || f.work || f.src);
}

export function browse(f: BrowseFilters): DictionaryEntry[] {
  return entries.filter((e) => matchesFilters(e, f));
}

// ─── Word search ─────────────────────────────────────────────────────────
export interface WordResult {
  entry: DictionaryEntry;
  rank: number;
  /** Set when the entry was reached through a form other than the headword. */
  via?: { form: string; kind: FormKind | 'roman' };
}

export function searchWords(query: string, f: BrowseFilters = {}): WordResult[] {
  const q = normalize(query);
  if (!q) return [];
  const script = detectScript(q);
  const rq = script === 'latin' ? romanKey(q) : '';
  const results: WordResult[] = [];

  for (const entry of entries) {
    if (!matchesFilters(entry, f)) continue;
    let best: WordResult | null = null;
    const consider = (rank: number, via?: WordResult['via']) => {
      if (!best || rank < best.rank) best = { entry, rank, via };
    };
    if (script === 'tamil') {
      for (const form of formIndex.get(entry.id) ?? []) {
        const via = form.kind === 'headword' ? undefined : { form: form.text, kind: form.kind };
        if (form.text === q) consider(form.kind === 'headword' ? 0 : 1, via);
        else if (form.text.startsWith(q)) consider(form.kind === 'headword' ? 3 : 4, via);
        else if (form.kind === 'headword' && graphemes(q).length >= 2 && form.text.includes(q)) consider(6);
      }
    } else if (rq) {
      for (const r of romanIndex.get(entry.id) ?? []) {
        if (r === rq) consider(2, { form: query.trim(), kind: 'roman' });
        else if (rq.length >= 2 && r.startsWith(rq)) consider(5, { form: query.trim(), kind: 'roman' });
      }
    }
    if (best) results.push(best);
  }
  return results.sort((a, b) => a.rank - b.rank || tamilCollator.compare(a.entry.headword, b.entry.headword));
}

// ─── Meaning (reverse) search ────────────────────────────────────────────
export interface MeaningResult {
  entry: DictionaryEntry;
  sense: Sense;
  lang: LangCode;
  text: string;
  score: number;
}

const TOKEN_SPLIT = /[\s;,.:()'"‘’“”!?।/–—-]+/u;

function scoreText(text: string, q: string): number | null {
  const t = normalize(text);
  if (!t.includes(q)) return null;
  const tokens = t.split(TOKEN_SPLIT);
  if (tokens.includes(q)) return 0;
  // Multi-word query matching a phrase on token boundaries.
  if (q.includes(' ') && new RegExp(`(^|[\\s;,.(])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s;,.)])`, 'u').test(t)) return 0;
  if (tokens.some((tok) => tok.startsWith(q))) return 1;
  return graphemes(q).length >= 3 ? 2 : null;
}

export function searchMeanings(query: string, preferredLang: LangCode, f: BrowseFilters = {}): MeaningResult[] {
  const q = normalize(query);
  if (graphemes(q).length < 2) return [];
  const out: MeaningResult[] = [];
  for (const entry of entries) {
    if (!matchesFilters(entry, f)) continue;
    for (const sense of entry.senses) {
      let best: MeaningResult | null = null;
      const candidates: [LangCode, string][] = [
        ['ta', sense.definition],
        ...Object.entries(sense.translations).map(([l, t]) => [l, t.text] as [LangCode, string]),
      ];
      for (const [lang, text] of candidates) {
        const s = scoreText(text, q);
        if (s === null) continue;
        const pos = normalize(text).indexOf(q) / Math.max(1, text.length);
        const adj = s + (lang === preferredLang ? 0 : 0.1) + pos * 0.05;
        if (!best || adj < best.score) best = { entry, sense, lang, text, score: adj };
      }
      if (best) out.push(best);
    }
  }
  return out.sort((a, b) => a.score - b.score || tamilCollator.compare(a.entry.headword, b.entry.headword));
}

// ─── Poem text search ────────────────────────────────────────────────────
export interface PoemResult {
  poem: Poem;
  line: number;
  text: string;
  /** [start, end) of the match within `text`, when it can be located. */
  range: [number, number] | null;
}

/** Match against verse text ignoring spaces and punctuation, so sandhi-joined and word-separated editions both match. */
export function searchPoems(query: string, f: BrowseFilters = {}): PoemResult[] {
  const q = compact(query);
  if (graphemes(q).length < 2) return [];
  const out: PoemResult[] = [];
  for (const poem of poems) {
    if (f.work && poem.workId !== f.work) continue;
    if (f.tinai && poem.tinai !== f.tinai) continue;
    poem.lines.forEach((text, i) => {
      const norm = text.normalize('NFC');
      // `map` points each compact character back to its index in the original line, for highlighting.
      const { text: packed, map } = compactWithMap(norm);
      const at = packed.indexOf(q);
      if (at >= 0) out.push({ poem, line: i + 1, text: norm, range: [map[at], map[at + q.length - 1] + 1] });
    });
  }
  return out;
}

// ─── Autocomplete and suggestions ────────────────────────────────────────
export function getSuggestions(query: string, limit = 8): WordResult[] {
  return searchWords(query).filter((r) => r.rank !== 6).slice(0, limit);
}

/** Dictionary words close in spelling to the query (for "did you mean"). */
export function spellingSuggestions(query: string, limit = 5): DictionaryEntry[] {
  const q = normalize(query);
  if (!q) return [];
  const script = detectScript(q);
  const scored: { entry: DictionaryEntry; d: number }[] = [];
  if (script === 'tamil') {
    const max = Math.max(1, Math.floor(graphemes(q).length / 3));
    for (const e of entries) {
      let d = Infinity;
      for (const form of formIndex.get(e.id) ?? []) d = Math.min(d, editDistance(q, form.text, max));
      if (d <= max) scored.push({ entry: e, d });
    }
  } else if (script === 'latin') {
    const rq = romanKey(q);
    const max = Math.max(1, Math.floor(rq.length / 4));
    for (const e of entries) {
      let d = Infinity;
      for (const r of romanIndex.get(e.id) ?? []) d = Math.min(d, editDistance(rq, r, max));
      if (d <= max) scored.push({ entry: e, d });
    }
  }
  return scored.sort((a, b) => a.d - b.d || tamilCollator.compare(a.entry.headword, b.entry.headword)).slice(0, limit).map((s) => s.entry);
}

/** Queries typed in a meaning language's own script go straight to meaning search. */
export function defaultScopeFor(query: string): 'word' | 'meaning' {
  const s = detectScript(query);
  return s === 'devanagari' || s === 'malayalam' || s === 'telugu' ? 'meaning' : 'word';
}

export function languageLabel(code: LangCode) {
  return languages.find((l) => l.code === code)?.label ?? code;
}

