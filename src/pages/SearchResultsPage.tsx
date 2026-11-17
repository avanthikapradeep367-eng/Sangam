import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar';
import EntryRow from '../components/EntryRow';
import { search } from '../utils/search';
import type { SearchResult } from '../types';

const MATCH_LABELS: Record<string, string> = {
  exact: 'சரியான பொருத்தம்',
  prefix: 'தொடக்க பொருத்தம்',
  alias: 'மாறு எழுத்துரு',
  transliteration: 'ஒலிப்பெயர்ப்பு',
};

export default function SearchResultsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get('q') ?? '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    if (query) {
      setResults(search(query));
      setFilter('');
    }
  }, [query]);

  const matchTypes = Array.from(new Set(results.map((r) => r.matchType)));

  const filtered = filter
    ? results.filter((r) => r.matchType === filter)
    : results;

  function handleSearch(q: string) {
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <main className="results-page" id="main-content">
      <div className="container">
        <div className="results-page__header">
          <SearchBar initialValue={query} onSearch={handleSearch} />
        </div>

        {query && (
          <>
            <div className="results-page__header">
              <p className="results-page__query">
                "<strong>{query}</strong>" — தேடல் முடிவுகள்
              </p>
              <p className="results-page__count">
                {results.length === 0
                  ? 'எந்த சொல்லும் கிடைக்கவில்லை'
                  : `${results.length} சொல்${results.length > 1 ? 'கள்' : ''} கிடைத்தது`}
              </p>
            </div>

            {results.length > 0 && matchTypes.length > 1 && (
              <div className="results-filter-bar" role="group" aria-label="முடிவுகளை வடிகட்டு">
                <span className="filter-label">வடிகட்டி:</span>
                <button
                  className={`filter-btn${filter === '' ? ' filter-btn--active' : ''}`}
                  onClick={() => setFilter('')}
                  aria-pressed={filter === ''}
                >
                  அனைத்தும்
                </button>
                {matchTypes.map((mt) => (
                  <button
                    key={mt}
                    className={`filter-btn${filter === mt ? ' filter-btn--active' : ''}`}
                    onClick={() => setFilter(filter === mt ? '' : mt)}
                    aria-pressed={filter === mt}
                  >
                    {MATCH_LABELS[mt]}
                  </button>
                ))}
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">🔍</div>
                <p className="empty-state__title">சொல் கிடைக்கவில்லை</p>
                <p className="empty-state__hint">
                  வேறு எழுத்துரு அல்லது ஒலிப்பெயர்ப்பில் தேடுங்கள்.<br />
                  அல்லது <Link to="/">எழுத்து வரிசையில்</Link> தேடுங்கள்.
                </p>
              </div>
            ) : (
              <nav className="entry-list" aria-label="தேடல் முடிவுகள்">
                {filtered.map((result) => (
                  <EntryRow key={result.entry.id} entry={result.entry} />
                ))}
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
