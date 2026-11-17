import { useParams, Link } from 'react-router-dom';
import worksRaw from '../data/works.json';
import type { LiteraryWork } from '../types';
import { getEntriesByWork } from '../utils/search';
import EntryRow from '../components/EntryRow';

const works = worksRaw as LiteraryWork[];

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const work = works.find((w) => w.id === id);

  if (!work) {
    return (
      <main className="work-detail-page" id="main-content">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state__icon">📚</div>
            <p className="empty-state__title">நூல் கிடைக்கவில்லை</p>
            <p className="empty-state__hint">
              <Link to="/works">நூல்கள் பட்டியலுக்கு திரும்பு</Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  const entries = getEntriesByWork(work.title);

  return (
    <main className="work-detail-page" id="main-content">
      <div className="container">
        <nav className="breadcrumb" aria-label="வழித்தடம்">
          <Link to="/">முகப்பு</Link>
          <span className="breadcrumb__sep" aria-hidden="true">›</span>
          <Link to="/works">நூல்கள்</Link>
          <span className="breadcrumb__sep" aria-hidden="true">›</span>
          <span aria-current="page">{work.title}</span>
        </nav>

        <div className="work-header">
          <h1 className="work-title" lang="ta">{work.title}</h1>
          <p className="work-transliteration">{work.transliteration}</p>
          <div className="work-item__meta" style={{ marginBottom: 'var(--space-5)' }}>
            <span className="work-item__type">{work.type}</span>
            {work.poemCount && (
              <span className="work-item__count">{work.poemCount} பாடல்கள்</span>
            )}
          </div>
          <p className="work-desc" lang="ta">{work.description}</p>
          {work.englishDescription && (
            <p className="work-desc" lang="en" style={{ marginTop: 'var(--space-3)', fontStyle: 'italic' }}>
              {work.englishDescription}
            </p>
          )}
        </div>

        <section aria-label={`${work.title} — சொற்கள்`}>
          <div className="home__section-label">
            இந்த நூலிலிருந்து அகராதியில் உள்ள சொற்கள்
            {entries.length > 0 && ` (${entries.length})`}
          </div>
          {entries.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-10) 0' }}>
              <p className="empty-state__hint">
                இந்த நூலிலிருந்து இப்போது சொற்கள் சேர்க்கப்படவில்லை.
              </p>
            </div>
          ) : (
            <nav className="entry-list">
              {entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}
