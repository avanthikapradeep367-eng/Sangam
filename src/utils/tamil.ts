/** Tamil text helpers: normalization, letters, collation, script detection, edit distance. */

export const TAMIL_VOWELS = ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'];
export const AYTHAM = 'ஃ';
export const TAMIL_CONSONANTS = ['க', 'ங', 'ச', 'ஞ', 'ட', 'ண', 'த', 'ந', 'ப', 'ம', 'ய', 'ர', 'ல', 'வ', 'ழ', 'ள', 'ற', 'ன'];
/** Grantha letters used for loanwords. க்ஷ is a conjunct but is filed as its own letter. */
export const GRANTHA_CONSONANTS = ['ஜ', 'ஶ', 'ஷ', 'ஸ', 'ஹ', 'க்ஷ'];
export const TAMIL_ALPHABET = [...TAMIL_VOWELS, ...TAMIL_CONSONANTS];

/**
 * Dictionary order (after Fabricius): vowels, ஃ, then consonants; within a
 * consonant the vowel series க கா கி … கௌ and the bare consonant க் last. Grantha ஜ ஶ ஷ ஸ
 * follow ச, and ஹ, க்ஷ come at the end.
 */
const CONSONANT_ORDER = ['க', 'ங', 'ச', 'ஜ', 'ஶ', 'ஷ', 'ஸ', 'ஞ', 'ட', 'ண', 'த', 'ந', 'ப', 'ம', 'ய', 'ர', 'ல', 'வ', 'ழ', 'ள', 'ற', 'ன', 'ஹ', 'க்ஷ'];
const SIGN_ORDER = ['', 'ா', 'ி', 'ீ', 'ு', 'ூ', 'ெ', 'ே', 'ை', 'ொ', 'ோ', 'ௌ', '்'];
const PULLI = '்';

export interface TamilUnit {
  /** The letter as written: அ, ஃ, கா, க், க்ஷ … */
  text: string;
  kind: 'vowel' | 'aytham' | 'consonant' | 'other';
  /** Base letter for consonants (கா → க), the letter itself otherwise. */
  base: string;
  weight: number;
}

const ZERO_WIDTH = /[​-‍⁠﻿]/g;

/** Split a word into Tamil letters (vowels, ஃ, consonant + vowel sign), each with a sort weight. */
export function tamilUnits(word: string): TamilUnit[] {
  const s = word.normalize('NFC').replace(ZERO_WIDTH, '');
  const out: TamilUnit[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const v = TAMIL_VOWELS.indexOf(ch);
    if (v >= 0) { out.push({ text: ch, kind: 'vowel', base: ch, weight: 1 + v }); continue; }
    if (ch === AYTHAM) { out.push({ text: ch, kind: 'aytham', base: ch, weight: 13 }); continue; }
    let base = ch;
    if (ch === 'க' && s[i + 1] === PULLI && s[i + 2] === 'ஷ') { base = 'க்ஷ'; i += 2; }
    const c = CONSONANT_ORDER.indexOf(base);
    if (c >= 0) {
      const next = s[i + 1] ?? '';
      const sign = SIGN_ORDER.indexOf(next) > 0 ? next : '';
      if (sign) i++;
      out.push({ text: base + sign, kind: 'consonant', base, weight: 20 + c * 13 + SIGN_ORDER.indexOf(sign) });
      continue;
    }
    // Spaces and hyphens sort before every letter; other characters after Tamil.
    if (/[\s\-–]/.test(ch)) { out.push({ text: ch, kind: 'other', base: ch, weight: 0 }); continue; }
    out.push({ text: ch, kind: 'other', base: ch, weight: 1000 + (ch.codePointAt(0) ?? 0) });
  }
  return out;
}

const keyCache = new Map<string, number[]>();
function sortKey(word: string): number[] {
  let k = keyCache.get(word);
  if (!k) { k = tamilUnits(word).map((u) => u.weight); keyCache.set(word, k); }
  return k;
}

/** Compare two words in Tamil dictionary order. */
export function tamilCompare(a: string, b: string): number {
  const x = sortKey(a), y = sortKey(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}

/** Drop-in for Intl.Collator: `tamilCollator.compare(a, b)`. */
export const tamilCollator = { compare: tamilCompare };

/**
 * Canonical form used for matching: NFC, no zero-width joiners, collapsed whitespace,
 * lower-cased Latin. Distinct letters are never merged (ஒள stays ஒ + ள, unlike ஔ).
 */
export function normalize(s: string): string {
  return s
    .normalize('NFC')
    .replace(ZERO_WIDTH, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** The base letter a word files under: its initial vowel, ஃ, or consonant (கே → க, க்ஷா → க்ஷ). */
export function indexLetter(word: string): string {
  return tamilUnits(normalize(word))[0]?.base ?? '';
}

/** The first written letter of a word: அ, கா, க், … (the உயிர்மெய் level of the letter browser). */
export function initialSyllable(word: string): string {
  return tamilUnits(normalize(word))[0]?.text ?? '';
}

/** Consonant + vowel → the combined letter (க + ஆ → கா; க + pulli → க்). */
export function combine(consonant: string, vowel: string | null): string {
  if (vowel === null) return consonant + PULLI;
  return consonant + (VOWEL_SIGN[vowel] ?? '');
}

const ROMAN_VOWEL: Record<string, string> = {
  'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ii', 'உ': 'u', 'ஊ': 'uu', 'எ': 'e', 'ஏ': 'ee', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oo', 'ஔ': 'au',
};
const ROMAN_SIGN: Record<string, string> = {
  '': 'a', 'ா': 'aa', 'ி': 'i', 'ீ': 'ii', 'ு': 'u', 'ூ': 'uu', 'ெ': 'e', 'ே': 'ee', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oo', 'ௌ': 'au', '்': '',
};
const ROMAN_CONSONANT: Record<string, string> = {
  'க': 'k', 'ங': 'ng', 'ச': 'c', 'ஞ': 'nj', 'ட': 't', 'ண': 'n', 'த': 'th', 'ந': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r',
  'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n', 'ஜ': 'j', 'ஶ': 'sh', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h', 'க்ஷ': 'ksh',
};

/** Rough phonetic romanization, used only as a search key (ற்ற is read "tr" as in வெற்றி vetri). */
export function transliterate(word: string): string {
  return tamilUnits(normalize(word)).map((u) => {
    if (u.kind === 'vowel') return ROMAN_VOWEL[u.text];
    if (u.kind === 'aytham') return 'h';
    if (u.kind === 'consonant') return ROMAN_CONSONANT[u.base] + ROMAN_SIGN[u.text.slice(u.base.length)];
    return u.text === ' ' ? ' ' : '';
  }).join('').replace(/rr/g, 'tr');
}

/** Loose key for romanized Tamil: strips diacritics and folds common spelling choices. */
export function romanKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/zh/g, 'l')
    .replace(/([tdkgpbcs])h/g, '$1')
    .replace(/nj/g, 'nc')
    .replace(/j/g, 'c').replace(/s/g, 'c')
    .replace(/g/g, 'k').replace(/b/g, 'p').replace(/d/g, 't')
    .replace(/(.)\1+/g, '$1');
}

export type Script = 'tamil' | 'latin' | 'devanagari' | 'malayalam' | 'telugu' | 'other';

export function detectScript(s: string): Script {
  if (/[஀-௿]/.test(s)) return 'tamil';
  if (/[ऀ-ॿ]/.test(s)) return 'devanagari';
  if (/[ഀ-ൿ]/.test(s)) return 'malayalam';
  if (/[ఀ-౿]/.test(s)) return 'telugu';
  if (/[a-zA-Z]/.test(s)) return 'latin';
  return 'other';
}

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  ? new Intl.Segmenter('ta', { granularity: 'grapheme' })
  : null;

/** Split into user-perceived characters (கே, க், ஔ …). */
export function graphemes(s: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(s), (x) => x.segment);
  return Array.from(s);
}

/** Levenshtein distance over grapheme clusters, so one Tamil letter counts as one edit. */
export function editDistance(a: string, b: string, max = Infinity): number {
  const x = graphemes(a), y = graphemes(b);
  if (Math.abs(x.length - y.length) > max) return max + 1;
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[y.length];
}

/** Vowel letter → the vowel sign it becomes after a consonant (அ is the inherent vowel). */
export const VOWEL_SIGN: Record<string, string> = {
  'அ': '', 'ஆ': 'ா', 'இ': 'ி', 'ஈ': 'ீ', 'உ': 'ு', 'ஊ': 'ூ', 'எ': 'ெ', 'ஏ': 'ே', 'ஐ': 'ை', 'ஒ': 'ொ', 'ஓ': 'ோ', 'ஔ': 'ௌ',
};
const PUNCT = /[\s.,;:!?'"‘’“”`()\-–—]/;

/**
 * Remove spaces and punctuation, and join a final consonant with a following vowel
 * (யாதும் ஊரே → யாதுமூரே), so word-separated and sandhi-joined editions match.
 */
export function compact(s: string): string {
  return compactWithMap(s).text;
}

/** compact() plus, for each output character, the index of the source character it came from. */
export function compactWithMap(s: string): { text: string; map: number[] } {
  const src = s.normalize('NFC');
  let text = '';
  const map: number[] = [];
  for (let k = 0; k < src.length; k++) {
    const raw = normalize(src[k]) || (PUNCT.test(src[k]) ? '' : src[k]);
    if (!raw || PUNCT.test(raw)) continue;
    const sign = VOWEL_SIGN[raw];
    if (sign !== undefined && text.endsWith(PULLI) && /[க-ஹ]/.test(text[text.length - 2] ?? '')) {
      text = text.slice(0, -1);
      map.pop();
      if (sign) { text += sign; map.push(k); }
      continue;
    }
    text += raw;
    map.push(k);
  }
  return { text, map };
}
