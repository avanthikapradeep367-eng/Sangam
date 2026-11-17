import type { DictionaryEntry, LangCode, Sense } from '../types';

export const LANGUAGES: { code: LangCode; label: string }[] = [
  { code: 'ta', label: 'தமிழ்' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'te', label: 'తెలుగు' },
];

export const LANGUAGE_LABEL: Record<LangCode, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l.label])
) as Record<LangCode, string>;

export type MeaningStatus = 'tamil' | 'reviewed' | 'unreviewed' | 'fallback';

export interface SenseMeaning {
  text: string;
  status: MeaningStatus;
  isExplanatoryGloss?: boolean;
}

export function getSenseMeaning(sense: Sense, lang: LangCode): SenseMeaning {
  if (lang === 'ta') {
    return { text: sense.definition, status: 'tamil' };
  }
  const translation = sense.translations[lang];
  if (!translation) {
    return { text: sense.definition, status: 'fallback' };
  }
  return {
    text: translation.text,
    status: translation.reviewStatus,
    isExplanatoryGloss: translation.isExplanatoryGloss,
  };
}

export function getEntryPreviewMeaning(entry: DictionaryEntry, lang: LangCode): SenseMeaning {
  const firstSense = entry.senses[0];
  if (!firstSense) return { text: '', status: 'tamil' };
  return getSenseMeaning(firstSense, lang);
}

export function truncate(text: string, max = 80): string {
  return text.length > max ? text.slice(0, max - 3) + '…' : text;
}
