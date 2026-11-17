import type { DictionaryEntry, LangCode, MeaningOrigin, Sense } from '../types';
import { languages } from '../data';

export const BASE_LANG: LangCode = languages.find((l) => l.base)?.code ?? 'ta';
export const LANGUAGE_LABEL: Record<LangCode, string> = Object.fromEntries(languages.map((l) => [l.code, l.label]));
export const MISSING_TRANSLATION = 'இந்த மொழியில் பொருள் இன்னும் சேர்க்கப்படவில்லை';

export type MeaningStatus = 'tamil' | 'reviewed' | 'unreviewed' | 'missing';

export interface SenseMeaning {
  /** Text to show in the chosen language, or null when the translation is missing. */
  text: string | null;
  status: MeaningStatus;
  isExplanatoryGloss?: boolean;
  origin?: MeaningOrigin | null;
}

export function getSenseMeaning(sense: Sense, lang: LangCode): SenseMeaning {
  if (lang === BASE_LANG) return { text: sense.definition || null, status: sense.definition ? 'tamil' : 'missing', origin: sense.definitionOrigin };
  const t = sense.translations[lang];
  if (!t) return { text: null, status: 'missing' };
  return { text: t.text, status: t.reviewStatus, isExplanatoryGloss: t.isExplanatoryGloss, origin: t.origin };
}

/**
 * One-line preview for result rows: the chosen language, else the Tamil definition, else the
 * book's English gloss (modern-Tamil records have an English gloss but no Tamil definition yet).
 */
export function previewMeaning(entry: DictionaryEntry, lang: LangCode, sense: Sense | undefined = entry.senses[0]) {
  if (!sense) return { text: '', lang: BASE_LANG, missing: false };
  const m = getSenseMeaning(sense, lang);
  if (m.text) return { text: m.text, lang, missing: false };
  if (sense.definition) return { text: sense.definition, lang: BASE_LANG, missing: lang !== BASE_LANG };
  const en = sense.translations.en;
  return en ? { text: en.text, lang: 'en', missing: true } : { text: '', lang: BASE_LANG, missing: true };
}

export const ORIGIN_LABEL: Record<MeaningOrigin, string> = {
  book: 'மூலத்திலிருந்து',
  editor: 'ஆசிரியர் எழுதியது',
  machine: 'இயந்திர மொழிபெயர்ப்பு',
  unknown: 'மூலம் அறியப்படவில்லை',
};
export const MISSING_DEFINITION = 'தமிழ் விளக்கம் இன்னும் சேர்க்கப்படவில்லை';

export function truncate(text: string, max = 90): string {
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max - 1).join('') + '…' : text;
}
