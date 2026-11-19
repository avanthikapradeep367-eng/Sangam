/**
 * Typed access to the compiled content (src/data/generated, built from /content by
 * scripts/build-data.mjs). Everything the UI knows about the corpus comes through here.
 */
import entriesRaw from './generated/dictionary.json';
import citationsRaw from './generated/citations.json';
import poemsRaw from './generated/poems.json';
import worksRaw from './generated/works.json';
import sourcesRaw from './generated/sources.json';
import languagesRaw from './generated/languages.json';
import topicsRaw from './generated/topics.json';
import coverageRaw from './generated/coverage.json';
import wordOfDayRaw from './generated/word-of-day.json';
import type {
  Citation, Coverage, DictionaryEntry, Language, LiteraryWork, Poem, Sense, Source, Topic,
} from '../types';
import { tamilCollator } from '../utils/tamil';

export const entries = (entriesRaw as unknown as DictionaryEntry[])
  .slice()
  .sort((a, b) => tamilCollator.compare(a.headword, b.headword) || (a.homograph ?? 0) - (b.homograph ?? 0));
export const citations = citationsRaw as Citation[];
export const poems = poemsRaw as Poem[];
export const works = worksRaw as LiteraryWork[];
export const sources = sourcesRaw as Source[];
export const languages = languagesRaw as Language[];
export const topics = topicsRaw as Topic[];
export const coverage = coverageRaw as Coverage;
/** Dates given a hand-picked word of the day: { 'YYYY-MM-DD': entryId }. */
export const wordOfDayChoices = wordOfDayRaw as Record<string, string>;

export const entryById = new Map(entries.map((e) => [e.id, e]));
export const senseById = new Map<string, { entry: DictionaryEntry; sense: Sense }>();
for (const entry of entries) for (const sense of entry.senses) senseById.set(sense.id, { entry, sense });
export const poemById = new Map(poems.map((p) => [p.id, p]));
export const workById = new Map(works.map((w) => [w.id, w]));
export const sourceById = new Map(sources.map((s) => [s.id, s]));
export const topicById = new Map(topics.map((t) => [t.id, t]));
export const topicChildren = new Map<string | null, Topic[]>();
for (const t of topics) topicChildren.set(t.parent, [...(topicChildren.get(t.parent) ?? []), t]);
/** True when topic `id` is `ancestor` or sits under it (A1 is under A, A under group 1). */
export function topicWithin(id: string, ancestor: string): boolean {
  for (let t = topicById.get(id); t; t = t.parent ? topicById.get(t.parent) : undefined) if (t.id === ancestor) return true;
  return false;
}
export const entriesByTopic = new Map<string, DictionaryEntry[]>();
for (const e of entries) {
  const seen = new Set<string>();
  for (const id of e.topics) for (let t = topicById.get(id); t; t = t.parent ? topicById.get(t.parent) : undefined) seen.add(t.id);
  for (const id of seen) entriesByTopic.set(id, [...(entriesByTopic.get(id) ?? []), e]);
}

export const COLLECTION_LABEL = { sangam: 'சங்க இலக்கியச் சொல்லகராதி', modern: 'நவீனத் தமிழ் அடிப்படைச் சொற்கள்' } as const;
export const COLLECTION_SHORT = { sangam: 'சங்கம்', modern: 'நவீனத் தமிழ்' } as const;

const group = <T, K>(items: T[], key: (t: T) => K) => {
  const m = new Map<K, T[]>();
  for (const it of items) m.set(key(it), [...(m.get(key(it)) ?? []), it]);
  return m;
};
export const citationsByEntry = group(citations, (c) => c.entryId);
export const citationsByPoem = group(citations, (c) => c.poemId);
export const poemsByWork = group(poems, (p) => p.workId);
export const entriesByHeadword = group(entries, (e) => e.headword);

/** Works that cite each entry, derived from its citations. */
export function worksForEntry(entryId: string): string[] {
  const ids = new Set((citationsByEntry.get(entryId) ?? []).map((c) => poemById.get(c.poemId)?.workId));
  return works.filter((w) => ids.has(w.id)).map((w) => w.id);
}

export const AKAM_TINAI = ['குறிஞ்சி', 'முல்லை', 'மருதம்', 'நெய்தல்', 'பாலை'] as const;
export const PARTS_OF_SPEECH = Array.from(new Set(entries.map((e) => e.partOfSpeech))).sort(tamilCollator.compare);

// ─── Paths and references ─────────────────────────────────────────────────
export const entryPath = (entryId: string, senseId?: string | null) =>
  `/entry/${entryId}${senseId ? `#${senseId}` : ''}`;

export function poemPath(poem: Poem, opts: { line?: number; citation?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.line) params.set('line', String(opts.line));
  if (opts.citation) params.set('c', opts.citation);
  const qs = params.toString();
  return `/works/${poem.workId}/${poem.number}${qs ? `?${qs}` : ''}`;
}

export function poemRef(poem: Poem, line?: number) {
  const work = workById.get(poem.workId);
  return `${work?.title ?? poem.workId} ${poem.number}${line ? `:${line}` : ''}`;
}

/** Headword with a superscript-style homograph number for plain-text contexts. */
export function headwordLabel(entry: DictionaryEntry) {
  const sup = ['', '¹', '²', '³', '⁴', '⁵'];
  return entry.homograph ? `${entry.headword}${sup[entry.homograph] ?? entry.homograph}` : entry.headword;
}
