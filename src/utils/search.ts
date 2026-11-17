import type { DictionaryEntry, LangCode, SearchResult } from '../types';
import entriesRaw from '../data/dictionary.json';
import { truncate } from './languages';

const entries = entriesRaw as DictionaryEntry[];
const MEANING_LANGS: Exclude<LangCode, 'ta'>[] = ['en', 'hi', 'ml', 'te'];

export function getAllEntries(): DictionaryEntry[] {
  return entries;
}

export function getEntryById(id: string): DictionaryEntry | undefined {
  return entries.find((e) => e.id === id);
}

export function getEntryByHeadword(headword: string): DictionaryEntry | undefined {
  return entries.find(
    (e) => e.headword === headword || e.aliases.includes(headword)
  );
}

function getPreview(entry: DictionaryEntry): string {
  return truncate(entry.senses[0]?.definition ?? '');
}

export function search(query: string): SearchResult[] {
  if (!query.trim()) return [];

  const q = query.trim();
  const qLower = q.toLowerCase();
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  // Exact headword match
  for (const entry of entries) {
    if (entry.headword === q) {
      if (!seen.has(entry.id)) {
        results.push({ entry, matchType: 'exact', preview: getPreview(entry) });
        seen.add(entry.id);
      }
    }
  }

  // Exact alias match
  for (const entry of entries) {
    if (!seen.has(entry.id) && entry.aliases.some((a) => a === q || a.toLowerCase() === qLower)) {
      results.push({ entry, matchType: 'alias', preview: getPreview(entry) });
      seen.add(entry.id);
    }
  }

  // Exact transliteration match
  for (const entry of entries) {
    if (!seen.has(entry.id) && entry.transliteration?.toLowerCase() === qLower) {
      results.push({ entry, matchType: 'transliteration', preview: getPreview(entry) });
      seen.add(entry.id);
    }
  }

  // Prefix headword match
  for (const entry of entries) {
    if (!seen.has(entry.id) && entry.headword.startsWith(q)) {
      results.push({ entry, matchType: 'prefix', preview: getPreview(entry) });
      seen.add(entry.id);
    }
  }

  // Prefix transliteration
  for (const entry of entries) {
    if (!seen.has(entry.id) && entry.transliteration?.toLowerCase().startsWith(qLower)) {
      results.push({ entry, matchType: 'transliteration', preview: getPreview(entry) });
      seen.add(entry.id);
    }
  }

  // Partial match in headword or aliases
  for (const entry of entries) {
    if (!seen.has(entry.id)) {
      const inHead = entry.headword.includes(q);
      const inAlias = entry.aliases.some(
        (a) => a.includes(q) || a.toLowerCase().includes(qLower)
      );
      if (inHead || inAlias) {
        results.push({ entry, matchType: 'prefix', preview: getPreview(entry) });
        seen.add(entry.id);
      }
    }
  }

  // Reverse lookup: query appears inside a translated meaning (lowest rank)
  if (qLower.length >= 2) {
    for (const entry of entries) {
      if (seen.has(entry.id)) continue;
      let matched: { lang: LangCode; snippet: string } | undefined;
      for (const sense of entry.senses) {
        for (const lang of MEANING_LANGS) {
          const translation = sense.translations[lang];
          if (translation && translation.text.toLowerCase().includes(qLower)) {
            matched = { lang, snippet: truncate(translation.text) };
            break;
          }
        }
        if (matched) break;
      }
      if (matched) {
        results.push({
          entry,
          matchType: 'meaning',
          preview: getPreview(entry),
          matchedLang: matched.lang,
          matchedSnippet: matched.snippet,
        });
        seen.add(entry.id);
      }
    }
  }

  return results;
}

export function getEntriesByInitialLetter(letter: string): DictionaryEntry[] {
  return entries.filter((e) => e.headword.startsWith(letter));
}

export function getEntriesByWork(workTitle: string): DictionaryEntry[] {
  return entries.filter((e) => e.work === workTitle);
}

export function getAllInitialLetters(): string[] {
  const letters = new Set<string>();
  for (const entry of entries) {
    if (entry.headword[0]) letters.add(entry.headword[0]);
  }
  return Array.from(letters).sort();
}

/** Only entries with an editorially-verified தினை tag; empty today since no such data exists. */
export function getAllTinai(): string[] {
  const tinaiSet = new Set<string>();
  for (const entry of entries) {
    if (entry.tinai) tinaiSet.add(entry.tinai);
  }
  return Array.from(tinaiSet).sort();
}

export function getEntriesByTinai(tinai: string): DictionaryEntry[] {
  return entries.filter((e) => e.tinai === tinai);
}

export function getSuggestions(query: string): DictionaryEntry[] {
  if (!query.trim() || query.trim().length < 1) return [];
  const q = query.trim();
  const qLower = q.toLowerCase();
  const results: DictionaryEntry[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (
      entry.headword.startsWith(q) ||
      entry.transliteration?.toLowerCase().startsWith(qLower) ||
      entry.aliases.some((a) => a.startsWith(q) || a.toLowerCase().startsWith(qLower))
    ) {
      if (!seen.has(entry.id)) {
        results.push(entry);
        seen.add(entry.id);
      }
    }
  }
  return results.slice(0, 8);
}
