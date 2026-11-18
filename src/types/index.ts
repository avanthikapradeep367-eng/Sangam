/** Language codes come from content/languages.json, so new languages need no code change. */
export type LangCode = string;
export type ReviewStatus = 'reviewed' | 'unreviewed';

export interface Language {
  code: LangCode;
  label: string;
  englishName: string;
  base?: boolean;
}

/** Where a meaning came from: printed in a book, written by an editor, machine-drafted, or undocumented. */
export type MeaningOrigin = 'book' | 'editor' | 'machine' | 'unknown';

export interface Translation {
  text: string;
  /** A short explanatory gloss rather than a one-word equivalent. */
  isExplanatoryGloss?: boolean;
  reviewStatus: ReviewStatus;
  sourceId: string;
  origin: MeaningOrigin;
}

/** Book markings on a meaning: underlined (colloquial only), bracketed (literary only), double-underlined (explanation). */
export type SenseUsage = 'colloquial-only' | 'literary-only' | 'explanation';

export interface Sense {
  id: string;
  number: number;
  /** Modern Tamil definition; empty when not yet written. */
  definition: string;
  definitionOrigin?: MeaningOrigin | null;
  sourceId: string;
  reviewStatus: ReviewStatus;
  /** Keyed by language code; the base language (Tamil) is `definition`. */
  translations: Record<LangCode, Translation>;
  usage?: SenseUsage[];
  /** The meaning number printed in the book, when it numbers meanings. */
  bookNumber?: number | null;
}

export type Collection = 'sangam' | 'modern';
export type Register = 'modern-literary' | 'high-literary';

export interface SpokenForm { tamil: string | null; roman: string | null }

export interface BookSubform {
  id: string;
  mlt: string | null;
  hlt: string[];
  grammar: string | null;
  colloquial: SpokenForm;
  english: string;
  note: string | null;
  pdfPage: number;
  printedPage: number;
}

export interface BookReference {
  sourceId: string;
  ref: string;
  printedPage: number;
  pdfPage: number;
  section: string;
  /** Page image path under /public, or null when the images are not part of this build. */
  image: string | null;
  /** The book's English with its underline markers (_x_, __x__) kept. */
  englishMarkup: string;
}

export interface EntryLink {
  entryId: string;
  /** Sense of the linked entry the link is about. */
  senseId: string | null;
  /** Sense of this entry the link is about. */
  ownSenseId: string | null;
  relation: 'same-word' | 'related' | 'variant';
  note: string | null;
}

export interface ImportReview {
  status: 'pending' | 'approved' | 'flagged';
  reviewer: string | null;
  reviewedAt: string | null;
  note: string | null;
  transcription: string;
}

export interface EntryNote {
  id: string;
  kind: 'grammar' | 'etymology' | 'usage';
  text: string;
  sourceId: string;
}

export interface DictionaryEntry {
  id: string;
  /** Which dictionary the record belongs to. */
  collection: Collection;
  headword: string;
  /** Distinguishes separate words with the same spelling (மா¹, மா²). */
  homograph?: number;
  transliteration?: string;
  partOfSpeech: string;
  /** Romanized search aliases. */
  aliases: string[];
  spellingVariants: string[];
  inflectedForms: string[];
  relatedIds: string[];
  /** Plain Tamil words; linked when the dictionary has them. Empty until sourced. */
  synonyms?: string[];
  antonyms?: string[];
  topics: string[];
  tinai?: string;
  pronunciationAudio?: string;
  status: 'draft' | 'reviewed' | 'demo';
  sourceId: string;
  senses: Sense[];
  notes: EntryNote[];
  links: EntryLink[];
  /** A sample entry replaced by an approved book record. */
  supersededBy?: string;
  // Book records only ───────────────────────────────────────────────
  register?: Register;
  /** ★ in the book: all MLT forms are now also used in colloquial Tamil. */
  star?: boolean;
  /** High-literary (HLT) forms. */
  literaryForms?: string[];
  colloquial?: SpokenForm;
  grammarNote?: string | null;
  verbClass?: string | null;
  irregularForms?: string | null;
  subforms?: Pick<BookSubform, 'id' | 'mlt' | 'hlt' | 'grammar' | 'colloquial' | 'english'>[];
  review?: Pick<ImportReview, 'status' | 'transcription'>;
  /** The book prints no MLT form; the headword is the colloquial form. */
  noMltInBook?: boolean;
}

/** One attested occurrence of an entry in an indexed poem line. */
export interface Citation {
  id: string;
  entryId: string;
  senseId: string | null;
  poemId: string;
  /** 1-based line number. */
  line: number;
  /** The form exactly as it appears in the line. */
  form: string;
  /** The quotation shown under its sense on the entry page. */
  featured: boolean;
  reviewStatus: ReviewStatus;
  sourceId: string;
}

export interface Poem {
  id: string;
  workId: string;
  number: string;
  tinai: string | null;
  turai: string | null;
  speaker: string | null;
  poet: string | null;
  lines: string[];
  readings: { line: number; note: string }[];
  sourceId: string;
  reviewStatus: ReviewStatus;
  provenance: string;
}

export interface LiteraryWork {
  id: string;
  title: string;
  transliteration: string;
  type: string;
  poemCount: number | null;
  description: string;
  englishDescription: string;
  sourceId: string | null;
}

export interface Source {
  id: string;
  kind: 'edition' | 'editorial' | 'reference';
  origin: MeaningOrigin;
  title: string;
  url: string | null;
  license: string;
  retrieved: string | null;
  covers: string;
  notes: string;
}

export interface Topic {
  id: string;
  label: string;
  scheme: 'sangam' | 'modern';
  parent: string | null;
  /** The source's own heading and section code. */
  labelEn?: string;
  code?: string;
}

export interface Coverage {
  generatedAt: string;
  entries: number;
  senses: number;
  tamilDefinitions: number;
  citations: number;
  entriesByStatus: Record<string, number>;
  collections: {
    sangam: number;
    modern: { total: number; approved: number; pending: number; flagged: number; withValidationFlags: number };
  };
  translations: Record<LangCode, { total: number; reviewed: number; byOrigin: Partial<Record<MeaningOrigin, number>> }>;
  works: Record<string, { poems: number; numbers: string[]; reviewedPoems: number }>;
}

export type SearchScope = 'word' | 'meaning' | 'poem';

export interface BrowseFilters {
  letter?: string;
  work?: string;
  pos?: string;
  tinai?: string;
  topic?: string;
  /** Limit to one dictionary. */
  src?: Collection;
}
