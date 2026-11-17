import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import LetterIndex from '../components/LetterIndex';
import EntryRow from '../components/EntryRow';
import { getAllEntries, getEntriesByInitialLetter } from '../utils/search';
import worksRaw from '../data/works.json';
import type { LiteraryWork } from '../types';

const works = worksRaw as LiteraryWork[];
const allEntries = getAllEntries();

export default function HomePage() {
  const navigate = useNavigate();
  const [activeLetter, setActiveLetter] = useState('');

  const displayEntries = activeLetter
    ? getEntriesByInitialLetter(activeLetter)
    : allEntries;

  function handleSearch(q: string) {
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  function handleLetterSelect(letter: string) {
    setActiveLetter(letter);
  }

  return (
    <main className="home" id="main-content">
      <div className="container">

        {/* Search Section */}
        <section className="home__search-section" aria-label="சொல் தேடு">
          <h1 className="home__search-heading">சங்க இலக்கியச் சொற்களஞ்சியம்</h1>
          <SearchBar autoFocus onSearch={handleSearch} />
          <LetterIndex activeLetter={activeLetter} onSelect={handleLetterSelect} />
        </section>

        {/* Entries List */}
        <section aria-label="அகரவரிசைப் பட்டியல்">
          <div className="home__section-label">
            {activeLetter ? `'${activeLetter}' எழுத்தில் தொடங்கும் சொற்கள்` : 'சொற்கள்'}
          </div>
          {displayEntries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">📖</div>
              <p className="empty-state__title">சொல் கிடைக்கவில்லை</p>
              <p className="empty-state__hint">
                வேறொரு எழுத்தைத் தேர்ந்தெடுங்கள்.
              </p>
            </div>
          ) : (
            <nav className="entry-list" aria-label="சொற்கள் பட்டியல்">
              {displayEntries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </nav>
          )}
        </section>

        {/* Works Browse */}
        <section className="mt-10" aria-label="நூல் வழி தேடு">
          <div className="home__section-label">நூல் வழி தேடு</div>
          <ul className="works-list" role="list">
            {works.map((work) => (
              <li key={work.id}>
                <Link to={`/works/${work.id}`} className="work-item">
                  <div className="work-item__title">{work.title}</div>
                  <div className="work-item__meta">
                    <span className="work-item__type">{work.type}</span>
                    {work.poemCount && (
                      <span className="work-item__count">{work.poemCount} பாடல்கள்</span>
                    )}
                  </div>
                  <p className="work-item__desc">{work.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

      </div>
    </main>
  );
}
