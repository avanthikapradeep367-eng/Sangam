import { useParams, Link } from 'react-router-dom';
import { getEntryById, getEntryByHeadword } from '../utils/search';
import QuotationBlock from '../components/QuotationBlock';
import BookmarkButton from '../components/BookmarkButton';
import CopyCitationButton from '../components/CopyCitationButton';
import MeaningBadge from '../components/MeaningBadge';
import { useMeaningLanguage } from '../context/LanguageContext';
import { getSenseMeaning, LANGUAGE_LABEL } from '../utils/languages';

export default function EntryPage() {
  const { id } = useParams<{ id: string }>();
  const entry = id ? (getEntryById(id) ?? getEntryByHeadword(id)) : undefined;
  const [lang] = useMeaningLanguage();

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

  const highlightTerms = [entry.headword, ...(entry.spellingVariants ?? []), ...(entry.inflectedForms ?? [])];

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
            {entry.pronunciationAudio && (
              <button
                type="button"
                className="tool-btn"
                onClick={() => new Audio(entry.pronunciationAudio).play()}
                aria-label="ஒலிப்பைக் கேளுங்கள்"
              >
                <span aria-hidden="true">🔊</span> ஒலிப்பு
              </button>
            )}
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
              — {entry.work}
            </span>
          </div>
          <div className="entry-tools">
            <BookmarkButton entryId={entry.id} />
            <CopyCitationButton entry={entry} />
          </div>
        </header>

        <div className="entry-layout">
          {/* Senses */}
          <section className="entry-senses" aria-label="பொருள் விளக்கங்கள்">
            {entry.senses.map((sense) => {
              const meaning = getSenseMeaning(sense, lang);
              return (
                <div key={sense.id} className="sense">
                  <div className="sense__number" aria-label={`பொருள் ${sense.number}`}>
                    {sense.number}.
                  </div>
                  <div className="sense__body">
                    {lang === 'ta' ? (
                      <p className="sense__definition" lang="ta">{sense.definition}</p>
                    ) : (
                      <div className="sense__meanings">
                        <div className="sense__meaning-col">
                          <div className="sense__meaning-label">தமிழ்</div>
                          <p className="sense__definition" lang="ta">{sense.definition}</p>
                        </div>
                        <div className="sense__meaning-col">
                          <div className="sense__meaning-label">
                            {meaning.status === 'fallback'
                              ? `${LANGUAGE_LABEL[lang]} — கிடைக்கவில்லை, தமிழ் மாற்று`
                              : LANGUAGE_LABEL[lang]}
                          </div>
                          <p
                            className={`sense__gloss${meaning.status === 'fallback' ? ' sense__gloss--fallback' : ''}`}
                            lang={meaning.status === 'fallback' ? 'ta' : lang}
                          >
                            {meaning.text}
                          </p>
                          <MeaningBadge status={meaning.status} />
                          {meaning.isExplanatoryGloss && meaning.status !== 'fallback' && (
                            <p className="sense__explanatory-note">
                              (இது ஒரு வார்த்தைக்கு நேரடி இணையாக அல்லாமல், விளக்கமான பொருள்)
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {sense.quotations.map((q) => (
                      <QuotationBlock key={q.id} quotation={q} highlightTerms={highlightTerms} />
                    ))}
                  </div>
                </div>
              );
            })}
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

            {entry.spellingVariants && entry.spellingVariants.length > 0 && (
              <div className="mb-6">
                <div className="aside-label">மாறு எழுத்துருக்கள்</div>
                <div className="related-words" role="list">
                  {entry.spellingVariants.map((v) => (
                    <span key={v} className="related-word" role="listitem" lang="ta" style={{ color: 'var(--color-muted)', cursor: 'default' }}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entry.inflectedForms && entry.inflectedForms.length > 0 && (
              <div>
                <div className="aside-label">வேற்றுமை வடிவங்கள்</div>
                <div className="related-words" role="list">
                  {entry.inflectedForms.map((v) => (
                    <span key={v} className="related-word" role="listitem" lang="ta" style={{ color: 'var(--color-muted)', cursor: 'default' }}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

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
