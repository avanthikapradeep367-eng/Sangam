import { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
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
import { lazy, Suspense } from 'react';

// The editor exists only in development builds (npm run dev); production bundles leave it out.
const EditorPage = import.meta.env.DEV ? lazy(() => import('./pages/EditorPage')) : null;
import { LanguageProvider } from './context/LanguageContext';
import './styles/main.css';

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

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container container--wide">
        <p><strong lang="ta">சங்கச் சொல்</strong> — சங்க இலக்கியச் சொல்லகராதி · வரைவுப் பதிப்பு</p>
        <p>
          பாடல் மூலம்: தமிழ் விக்கிமூலம் (CC BY-SA 4.0). நவீனத் தமிழ்ச் சொற்கள் மதிப்பாய்வுக்குக் காத்திருக்கும் படியெடுப்பு. வரையறைகளும் மொழிபெயர்ப்புகளும் மதிப்பாய்வுக்குக் காத்திருக்கும் வரைவுகள்.{' '}
          <Link to="/sources">ஆதாரங்கள்</Link>
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <ScrollReset />
        <a href="#main-content" className="skip-link">முதன்மை உள்ளடக்கத்திற்குச் செல்</a>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/entry/:id" element={<EntryPage />} />
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
        <Footer />
      </BrowserRouter>
    </LanguageProvider>
  );
}
