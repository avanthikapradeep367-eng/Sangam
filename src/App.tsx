import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import EntryPage from './pages/EntryPage';
import WorksPage from './pages/WorksPage';
import WorkDetailPage from './pages/WorkDetailPage';
import PoemPage from './pages/PoemPage';
import TinaiPage from './pages/TinaiPage';
import SavedPage from './pages/SavedPage';
import AboutPage from './pages/AboutPage';
import SourcesPage from './pages/SourcesPage';
import NotFound from './pages/NotFound';
import LettersPage from './pages/LettersPage';
import TopicsPage from './pages/TopicsPage';
import TodayPage from './pages/TodayPage';
import HistoryPage from './pages/HistoryPage';
import EtymologyPage from './pages/EtymologyPage';
import { dictionaryPath } from './utils/wordOfDay';
import { Corners } from './components/book/Book';
import { UiLanguageProvider, useUi } from './context/UiLanguage';
import { useMeaningLanguage } from './context/LanguageContext';
import { languages } from './data';
import { reader, stopWord } from './utils/speech';
import { lazy, Suspense, type ReactNode } from 'react';

// The editor exists only in development builds (npm run dev); production bundles leave it out.
const EditorPage = import.meta.env.DEV ? lazy(() => import('./pages/EditorPage')) : null;
import { LanguageProvider } from './context/LanguageContext';
import './styles/main.css';
import './styles/book.css';

/**
 * Scroll handling: a new page starts at the top (unless the URL targets a sense or a poem line);
 * going Back or Forward returns to where the reader was, so results lists keep their place.
 */
// Kept in sessionStorage so positions survive a reload anywhere in the tab's history.
const SCROLL_KEY = 'sangam:scroll';
const scrollPositions = {
  read(): Record<string, number> { try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? '{}'); } catch { return {}; } },
  get(key: string): number | undefined { return this.read()[key]; },
  set(key: string, y: number) {
    try {
      const all = this.read();
      all[key] = y;
      const keys = Object.keys(all);
      for (const k of keys.slice(0, Math.max(0, keys.length - 50))) delete all[k];
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify(all));
    } catch { /* storage unavailable: Back simply starts at the top */ }
  },
};
/** Leaving a page stops "Read this page" and any word pronunciation. */
function StopAudioOnNavigate() {
  const { pathname, search } = useLocation();
  useEffect(() => () => { reader.stop(); stopWord(); }, [pathname, search]);
  return null;
}

/**
 * Keeps the stored-meaning language (search results, word lists) in step with the site language:
 * the same language when the dictionary has meanings in it, otherwise English.
 */
function SyncMeaningLanguage() {
  const { siteLang } = useUi();
  const [, setLang] = useMeaningLanguage();
  useEffect(() => {
    setLang(languages.some((l) => l.code === siteLang) ? siteLang : 'en');
  }, [siteLang, setLang]);
  return null;
}

function ScrollReset() {
  const { pathname, hash, search, key } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);
  useEffect(() => {
    const save = () => scrollPositions.set(key, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [key]);
  useEffect(() => {
    const saved = scrollPositions.get(key);
    if (navType === 'POP' && saved !== undefined) {
      // Wait a frame so the restored page has its full height before scrolling.
      requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'instant' }));
      return;
    }
    if (!hash && !search.includes('line=')) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash, search, key, navType]);
  return null;
}

/**
 * Page furniture by route: the home page draws its own open book; the explorer (/entry/<id>)
 * is a two-page spread; every other page is set on a single parchment leaf.
 */
function Frame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  if (pathname === '/') return <>{children}</>;
  const spread = pathname.startsWith('/entry/');
  return (
    <div className="desk">
      <Header />
      {spread ? children : (
        <div className="book book--single">
          <div className="book__edges" aria-hidden="true" />
          <div className="book__pages">
            <div className="leaf leaf--single">
              <Corners />
              <div className="turn-in" key={pathname}>{children}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <UiLanguageProvider>
    <LanguageProvider>
      <BrowserRouter>
        <ScrollReset />
        <StopAudioOnNavigate />
        <SyncMeaningLanguage />
        <a href="#main-content" className="skip-link">முதன்மை உள்ளடக்கத்திற்குச் செல்</a>
        <Frame>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          {/* Old links to /explore open the dictionary at today's word. */}
          <Route path="/explore" element={<Navigate to={dictionaryPath()} replace />} />
          <Route path="/entry/:id" element={<EntryPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/etymology" element={<EtymologyPage />} />
          <Route path="/works" element={<WorksPage />} />
          <Route path="/works/:workId" element={<WorkDetailPage />} />
          <Route path="/works/:workId/:number" element={<PoemPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/letters" element={<LettersPage />} />
          <Route path="/topics" element={<TopicsPage />} />
          <Route path="/topics/:id" element={<TopicsPage />} />
          <Route path="/tinai" element={<TinaiPage />} />
          {EditorPage && <Route path="/editor" element={<Suspense fallback={<p className="page">…</p>}><EditorPage /></Suspense>} />}
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/bookmarks" element={<SavedPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Frame>
      </BrowserRouter>
    </LanguageProvider>
    </UiLanguageProvider>
  );
}
