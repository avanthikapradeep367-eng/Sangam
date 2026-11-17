import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LangCode } from '../types';
import { languages } from '../data';
import { BASE_LANG } from '../utils/languages';
import { storage } from '../utils/storage';

const STORAGE_KEY = 'sangam:meaningLang';

function readStoredLang(): LangCode {
  const stored = storage.get(STORAGE_KEY);
  return stored && languages.some((l) => l.code === stored) ? stored : BASE_LANG;
}

interface LanguageContextValue {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LangCode>(readStoredLang);

  useEffect(() => { storage.set(STORAGE_KEY, lang); }, [lang]);

  // Keep several open tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setLang(readStoredLang()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useMeaningLanguage(): [LangCode, (lang: LangCode) => void] {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useMeaningLanguage must be used within a LanguageProvider');
  return [ctx.lang, ctx.setLang];
}
