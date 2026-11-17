export interface Quotation {
  id: string;
  text: string;
  work: string;
  poemNumber: string;
  source: string;
  verified: boolean;
}

export interface Sense {
  id: string;
  number: number;
  definition: string;
  englishGloss?: string;
  quotations: Quotation[];
}

export interface DictionaryEntry {
  id: string;
  headword: string;
  transliteration?: string;
  partOfSpeech: string;
  aliases: string[];
  senses: Sense[];
  relatedWords?: string[];
  work: string;
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
  matchType: 'exact' | 'prefix' | 'alias' | 'transliteration';
  preview: string;
}
