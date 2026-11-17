import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LangCode } from '../types';

const STORAGE_KEY = 'sangam:meaningLang';
const DEFAULT_LANG: LangCode = 'ta';

function readStoredLang(): LangCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ta' || stored === 'en' || stored === 'hi' || stored === 'ml' || stored === 'te') {
      return stored;
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) — fall back silently.
  }
  return DEFAULT_LANG;
}

interface LanguageContextValue {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LangCode>(readStoredLang);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore persistence failures
    }
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useMeaningLanguage(): [LangCode, (lang: LangCode) => void] {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useMeaningLanguage must be used within a LanguageProvider');
  return [ctx.lang, ctx.setLang];
}
