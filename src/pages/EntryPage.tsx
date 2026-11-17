import { useParams, Link } from 'react-router-dom';
import { getEntryById, getEntryByHeadword } from '../utils/search';
import QuotationBlock from '../components/QuotationBlock';

export default function EntryPage() {
  const { id } = useParams<{ id: string }>();
  const entry = id ? (getEntryById(id) ?? getEntryByHeadword(id)) : undefined;

  if (!entry) {
    return (
      <main className="entry-page" id="main-content">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">முகப்பு</Link>
            <span className="breadcrumb__sep">›</span>
            <span>அகராதி</span>
          </div>
          <div className="empty-state">
            <div className="empty-state__icon">📖</div>
            <p className="empty-state__title">சொல் கிடைக்கவில்லை</p>
            <p className="empty-state__hint">
              இந்தச் சொல் அகராதியில் இல்லை.<br />
              <Link to="/">முகப்புக்கு திரும்பு</Link> அல்லது வேறு சொல் தேடுங்கள்.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Collect all unique aliases (excluding headword)
  const variants = entry.aliases.filter((a) => a !== entry.headword && !/^[a-z]/.test(a));

  return (
    <main className="entry-page" id="main-content">
      <div className="container">

        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="வழித்தடம்">
          <Link to="/">முகப்பு</Link>
          <span className="breadcrumb__sep" aria-hidden="true">›</span>
          <Link to={`/?letter=${entry.headword[0]}`}>அகராதி</Link>
          <span className="breadcrumb__sep" aria-hidden="true">›</span>
          <span aria-current="page">{entry.headword}</span>
        </nav>

        {/* Headword + meta */}
        <header>
          <h1 className="entry-headword" lang="ta">{entry.headword}</h1>
          <div className="entry-meta">
            <span className="pos-tag">{entry.partOfSpeech}</span>
            {entry.transliteration && (
              <span className="transliteration">/ {entry.transliteration} /</span>
            )}
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
              — {entry.work}
            </span>
          </div>
        </header>

        {/* Senses */}
        <section className="entry-senses" aria-label="பொருள் விளக்கங்கள்">
          {entry.senses.map((sense) => (
            <div key={sense.id} className="sense">
              <div className="sense__number" aria-label={`பொருள் ${sense.number}`}>
                {sense.number}.
              </div>
              <div className="sense__body">
                <p className="sense__definition" lang="ta">{sense.definition}</p>
                {sense.englishGloss && (
                  <p className="sense__gloss" lang="en">{sense.englishGloss}</p>
                )}
                {sense.quotations.map((q) => (
                  <QuotationBlock key={q.id} quotation={q} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Aside: related words & variants */}
        <aside className="entry-aside">
          {entry.relatedWords && entry.relatedWords.length > 0 && (
            <div className="mb-6">
              <div className="aside-label">தொடர்புடைய சொற்கள்</div>
              <div className="related-words" role="list">
                {entry.relatedWords.map((word) => {
                  const related = getEntryByHeadword(word);
                  return related ? (
                    <Link
                      key={word}
                      to={`/entry/${related.id}`}
                      className="related-word"
                      role="listitem"
                      lang="ta"
                    >
                      {word}
                    </Link>
                  ) : (
                    <span key={word} className="related-word" role="listitem" lang="ta" style={{ color: 'var(--color-muted)', cursor: 'default' }}>
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {variants.length > 0 && (
            <div>
              <div className="aside-label">மாறு எழுத்துருக்கள்</div>
              <div className="related-words" role="list">
                {variants.map((v) => (
                  <span key={v} className="related-word" role="listitem" style={{ color: 'var(--color-muted)', cursor: 'default' }}>
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Share link */}
        <div style={{ marginTop: 'var(--space-10)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--color-rule)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
            நிரந்தர இணைப்பு:{' '}
            <code style={{ fontSize: '0.78rem', background: 'var(--color-surface)', padding: '1px 6px', borderRadius: '3px' }}>
              /entry/{entry.id}
            </code>
          </span>
        </div>

      </div>
    </main>
  );
}
