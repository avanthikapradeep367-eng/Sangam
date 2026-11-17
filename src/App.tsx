import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import EntryPage from './pages/EntryPage';
import WorksPage from './pages/WorksPage';
import WorkDetailPage from './pages/WorkDetailPage';
import AboutPage from './pages/AboutPage';
import './styles/main.css';

function Footer() {
  return (
    <footer className="site-footer" role="contentinfo">
      <p>
        <strong style={{ fontFamily: 'var(--font-serif)' }}>சங்கச் சொல்</strong>
        {' '}— சங்க இலக்கிய சொற்களஞ்சியம்
      </p>
      <p style={{ marginTop: '0.4rem' }}>
        CC BY 4.0 · தரவு: கழக வெளியீடுகள், சென்னைப் பல்கலைக்கழக அகராதி
      </p>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <a href="#main-content" className="visually-hidden" style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 9999, background: 'var(--color-bg)', padding: '8px 16px', borderRadius: '4px' }}>
        முதன்மை உள்ளடக்கத்திற்கு செல்
      </a>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/entry/:id" element={<EntryPage />} />
        <Route path="/works" element={<WorksPage />} />
        <Route path="/works/:id" element={<WorkDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={
          <main className="about-page" id="main-content">
            <div className="container">
              <div className="empty-state" style={{ paddingTop: '4rem' }}>
                <div className="empty-state__icon">🔍</div>
                <p className="empty-state__title">பக்கம் கிடைக்கவில்லை</p>
                <p className="empty-state__hint">
                  <a href="/">முகப்புக்கு திரும்பு</a>
                </p>
              </div>
            </div>
          </main>
        } />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
