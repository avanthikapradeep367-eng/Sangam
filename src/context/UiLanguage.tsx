/**
 * Site language (the language selector in the masthead and home bar). Tamil is the default and the
 * choice is remembered in this browser.
 *
 *   siteLang  any Azure Translator language code: definitions, notes and quotations are shown in it
 *             (stored meanings first, otherwise Azure machine translation, always marked).
 *   ui        the language of menus and buttons: Tamil or English. Languages without interface
 *             strings fall back to English (uiFallback = true), which the selector says.
 *
 * Headwords, transliterations, Tamil quotations and source citations always stay in the original.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { storage } from '../utils/storage';

export type UiLang = 'ta' | 'en';
const KEY = 'sangam:siteLang';
const LEGACY_KEY = 'sangam:uiLang';
/** Interface strings exist for these; any other site language shows the interface in English. */
export const UI_LANGS: readonly UiLang[] = ['ta', 'en'];
const FALLBACK_UI: UiLang = 'en';

const STRINGS = {
  brand: { ta: 'சொல்வளம்', en: 'Solvaḷam' },
  brandSub: { ta: 'Tamil Lexicon & Literary Archive', en: 'Tamil Lexicon & Literary Archive' },
  navDictionary: { ta: 'அகராதி', en: 'Dictionary' },
  navSangam: { ta: 'சங்க இலக்கியம்', en: 'Sangam Literature' },
  navEtymology: { ta: 'சொற்பிறப்பியல்', en: 'Etymology' },
  navCollections: { ta: 'தொகுப்புகள்', en: 'Collections' },
  saved: { ta: 'சேமித்த சொற்கள்', en: 'Saved words' },
  discoverTitle: { ta: 'சொற்களில் வாழும் தமிழ்', en: 'Tamil, living in its words' },
  discoverIntro: {
    ta: 'சங்க இலக்கியம் முதல் நவீனத் தமிழ் வரை, தமிழின் சொல்வளம், பொருள், சொற்பிறப்பியல் மற்றும் இலக்கியப் பயன்பாடுகளைக் கொண்டிடும் தமிழ்க் களஞ்சியம்.',
    en: 'From Sangam poetry to modern Tamil: a treasury of Tamil words, their meanings, origins and use in literature.',
  },
  searchPlaceholder: { ta: 'தமிழ்ச் சொல்லைத் தேடுங்கள்…', en: 'Search for a Tamil word…' },
  searchButton: { ta: 'தேடு', en: 'Search' },
  modeWord: { ta: 'தமிழ் சொல்', en: 'Tamil word' },
  modeMeaning: { ta: 'English meaning', en: 'English meaning' },
  modeTranslit: { ta: 'Transliteration', en: 'Transliteration' },
  alphabet: { ta: 'அகர வரிசை', en: 'Alphabetical index' },
  fullDictionary: { ta: 'முழு அகராதி', en: 'Full dictionary' },
  vowels: { ta: 'உயிர்', en: 'Vowels' },
  consonants: { ta: 'மெய்', en: 'Consonants' },
  syllables: { ta: 'உயிர்மெய்', en: 'Syllables' },
  noWordsLetter: { ta: 'இவ்வெழுத்தில் தொடங்கும் சொற்கள் இன்னும் இல்லை.', en: 'No words beginning with this letter yet.' },
  more: { ta: 'மேலும்', en: 'More' },
  featAlphabet: { ta: 'தமிழ் எழுத்துகள்', en: 'Tamil Alphabet' },
  featSangam: { ta: 'சங்கச் சொற்கள்', en: 'Sangam Vocabulary' },
  featEtymology: { ta: 'சொற்பிறப்பியல்', en: 'Etymology' },
  featMulti: { ta: 'பன்மொழி அர்த்தங்கள்', en: 'Multilingual Meanings' },
  showSearch: { ta: 'தேடல்', en: 'Search' },
  showWord: { ta: 'சொல்', en: 'Word' },
  secEtymology: { ta: 'சொற்பிறப்பியல்', en: 'Etymology' },
  secSynonyms: { ta: 'இணைச்சொற்கள்', en: 'Synonyms' },
  secAntonyms: { ta: 'எதிர்ச்சொற்கள்', en: 'Antonyms' },
  secUsage: { ta: 'இலக்கியப் பயன்பாடு', en: 'Literary usage' },
  secGrammar: { ta: 'இலக்கணக் குறிப்பு', en: 'Grammar note' },
  secCitation: { ta: 'சங்க இலக்கியச் சான்று', en: 'Sangam citation' },
  secRelated: { ta: 'தொடர்புடைய சொற்கள்', en: 'Related words' },
  secMulti: { ta: 'பன்மொழி அர்த்தங்கள்', en: 'Multilingual meanings' },
  secOccurrences: { ta: 'பிற பாடல்களில்', en: 'In other poems' },
  secForms: { ta: 'வடிவங்கள்', en: 'Forms' },
  secSources: { ta: 'ஆதாரம்', en: 'Sources' },
  readSource: { ta: 'மூலப் பாடல் பார்க்க', en: 'Read the poem' },
  prev: { ta: 'முந்தைய சொல்', en: 'Previous entry' },
  next: { ta: 'அடுத்த சொல்', en: 'Next entry' },
  listen: { ta: 'ஒலிப்பைக் கேள்', en: 'Listen' },
  save: { ta: 'சேமி', en: 'Save' },
  unsave: { ta: 'சேமித்ததிலிருந்து நீக்கு', en: 'Remove from saved' },
  share: { ta: 'பகிர்', en: 'Share' },
  textSmaller: { ta: 'எழுத்தைச் சிறிதாக்கு', en: 'Smaller text' },
  textNormal: { ta: 'இயல்பு எழுத்தளவு', en: 'Normal text' },
  textLarger: { ta: 'எழுத்தைப் பெரிதாக்கு', en: 'Larger text' },
  notSourced: { ta: 'ஆதாரம் இன்னும் சேர்க்கப்படவில்லை', en: 'No cited source added yet' },
  noCitation: {
    ta: 'இக்களஞ்சியத்தில் தொகுக்கப்பட்ட பாடல்களில் இச்சொல் இன்னும் இணைக்கப்படவில்லை. சரிபார்க்கப்பட்ட மேற்கோள் சேர்க்கப்படும் வரை இங்கு எதுவும் காட்டப்படாது.',
    en: 'This word is not yet linked to any poem indexed here. Nothing is shown until a verified quotation is added.',
  },
  siteLanguage: { ta: 'மொழி', en: 'Language' },
  meaningsOnly: { ta: 'பொருள் மட்டும் மொழிபெயர்க்கப்படும்', en: 'Meanings translated; menus in English' },
  uiFallbackNote: { ta: 'இடைமுகம்: ஆங்கிலம்', en: 'Menus in English' },
  readPage: { ta: 'இப்பக்கத்தைப் படி', en: 'Read this page' },
  pause: { ta: 'இடைநிறுத்து', en: 'Pause' },
  resume: { ta: 'தொடர்', en: 'Resume' },
  stop: { ta: 'நிறுத்து', en: 'Stop' },
  translating: { ta: 'மொழிபெயர்க்கிறது…', en: 'Translating…' },
  machineAzure: { ta: 'இயந்திர மொழிபெயர்ப்பு · Azure', en: 'Machine translation · Azure' },
  quoteTranslation: { ta: 'மொழிபெயர்ப்பு', en: 'Translation' },
  originalKept: { ta: 'மூல உரை மட்டும் காட்டப்படுகிறது', en: 'Showing the original only' },
  homeTitle: { ta: 'Dictionary Tamil', en: 'Dictionary Tamil' },
  homeSub: { ta: 'Tamil Dictionary / தமிழ் அகராதி', en: 'Tamil Dictionary / தமிழ் அகராதி' },
} as const;

export type UiKey = keyof typeof STRINGS;

interface Ctx {
  /** Content language (any Translator code). */
  siteLang: string;
  setSiteLang: (code: string) => void;
  /** Interface language actually used for menus and buttons. */
  ui: UiLang;
  /** True when siteLang has no interface strings and the interface fell back to English. */
  uiFallback: boolean;
  t: (k: UiKey) => string;
}
const UiContext = createContext<Ctx | null>(null);

const isCode = (s: string | null): s is string => Boolean(s && /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4}){0,2}$/.test(s));

export function UiLanguageProvider({ children }: { children: ReactNode }) {
  const [siteLang, setSiteLang] = useState<string>(() => {
    const saved = storage.get(KEY) ?? storage.get(LEGACY_KEY);
    return isCode(saved) ? saved : 'ta';
  });
  const ui: UiLang = (UI_LANGS as readonly string[]).includes(siteLang) ? (siteLang as UiLang) : FALLBACK_UI;
  useEffect(() => {
    storage.set(KEY, siteLang);
    document.documentElement.lang = ui;
  }, [siteLang, ui]);
  const t = (k: UiKey) => STRINGS[k][ui];
  return (
    <UiContext.Provider value={{ siteLang, setSiteLang: (c) => { if (isCode(c)) setSiteLang(c); }, ui, uiFallback: ui !== siteLang, t }}>
      {children}
    </UiContext.Provider>
  );
}

export function useUi(): Ctx {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used within a UiLanguageProvider');
  return ctx;
}
