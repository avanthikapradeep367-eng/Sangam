import { Link } from 'react-router-dom';
import { Breadcrumb, EmptyState } from '../components/common';
import { searchHistory, useSearchHistory } from '../utils/history';
import { usePageTitle } from '../utils/usePageTitle';
import { dictionaryPath } from '../utils/wordOfDay';

const SCOPE_LABEL: Record<string, string> = { word: 'சொல்', meaning: 'பொருள்', poem: 'பாடல்' };

/** Recent searches (this browser only), newest first. */
export default function HistoryPage() {
  usePageTitle('சமீபத் தேடல்கள்');
  const items = useSearchHistory();
  const fmt = new Intl.DateTimeFormat('ta-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <main id="main-content" className="page">
      <div className="container">
        <Breadcrumb items={[{ to: dictionaryPath(), label: 'அகராதி' }, { label: 'சமீபத் தேடல்கள்' }]} />
        <h1 className="page-title">சமீபத் தேடல்கள் <span className="page-title__en" lang="en">Recent Searches</span></h1>
        <p className="page-lede">நீங்கள் தேடியவை இந்த உலாவியில் மட்டும் சேமிக்கப்படுகின்றன; வேறெங்கும் அனுப்பப்படுவதில்லை.</p>
        {items.length === 0 ? (
          <EmptyState title="இன்னும் தேடல் எதுவும் இல்லை">
            <p><Link to={dictionaryPath()}>அகராதியில் தேடுங்கள்</Link> அல்லது <Link to="/letters">எழுத்து வரிசையில் உலாவுங்கள்</Link>.</p>
          </EmptyState>
        ) : (
          <>
            <ul className="history-list">
              {items.map((h) => {
                const params = new URLSearchParams({ q: h.q });
                if (h.scope) params.set('scope', h.scope);
                return (
                  <li key={h.q}>
                    <Link to={`/search?${params.toString()}`} className="history-list__q">{h.q}</Link>
                    {h.scope && <span className="history-list__scope">{SCOPE_LABEL[h.scope] ?? h.scope}</span>}
                    <time dateTime={h.at}>{fmt.format(new Date(h.at))}</time>
                    <button type="button" className="link-btn" onClick={() => searchHistory.remove(h.q)} aria-label={`“${h.q}” நீக்கு`}>நீக்கு</button>
                  </li>
                );
              })}
            </ul>
            <p><button type="button" className="tool-btn" onClick={() => searchHistory.clear()}>எல்லாவற்றையும் அழி</button></p>
          </>
        )}
      </div>
    </main>
  );
}
