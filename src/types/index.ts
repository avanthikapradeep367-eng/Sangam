export type LangCode = 'ta' | 'en' | 'hi' | 'ml' | 'te';

export interface Translation {
  text: string;
  /** Short explanatory gloss rather than a forced one-word equivalent. */
  isExplanatoryGloss?: boolean;
  reviewStatus: 'reviewed' | 'unreviewed';
}

/** Per-language translations, keyed by every LangCode except Tamil (which is the base definition). */
export type Translations = Partial<Record<Exclude<LangCode, 'ta'>, Translation>>;

export interface Quotation {
  id: string;
  text: string;
  work: string;
  poemNumber: string;
  /** Edition / source publication, rendered as "பதிப்பு". */
  source: string;
  verified: boolean;
  /** Sourced translation of the passage itself, only when supplied. */
  translations?: Translations;
}

export interface Sense {
  id: string;
  number: number;
  definition: string;
  translations: Translations;
  quotations: Quotation[];
}

export interface DictionaryEntry {
  id: string;
  headword: string;
  transliteration?: string;
  partOfSpeech: string;
  /** Romanized search aliases. */
  aliases: string[];
  /** Verified Tamil orthographic variants, only when sourced. */
  spellingVariants?: string[];
  /** Verified inflected forms, only when sourced. */
  inflectedForms?: string[];
  /** URL to a recorded pronunciation, only when available. */
  pronunciationAudio?: string;
  senses: Sense[];
  relatedWords?: string[];
  work: string;
  /** திணை classification, only when editorially verified. */
  tinai?: string;
  topics?: string[];
}

export interface LiteraryWork {
  id: string;
  title: string;
  transliteration: string;
  type: string;
  poemCount: number | null;
  description: string;
  englishDescription: string;
}

export interface SearchResult {
  entry: DictionaryEntry;
  matchType: 'exact' | 'prefix' | 'alias' | 'transliteration' | 'meaning';
  preview: string;
  /** Set when matchType === 'meaning': which language and sense matched. */
  matchedLang?: LangCode;
  matchedSnippet?: string;
}
