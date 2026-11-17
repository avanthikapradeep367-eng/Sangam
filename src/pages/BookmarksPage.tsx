import { useState } from 'react';
import { Link } from 'react-router-dom';
import EntryRow from '../components/EntryRow';
import { getBookmarkedIds } from '../utils/bookmarks';
import { getEntryById } from '../utils/search';

export default function BookmarksPage() {
  const [entries] = useState(() =>
    getBookmarkedIds()
      .map((id) => getEntryById(id))
      .filter((e): e is NonNullable<typeof e> => Boolean(e))
  );

  return (
    <main className="bookmarks-page" id="main-content">
      <div className="container">
        <nav className="breadcrumb" aria-label="வழித்தடம்">
          <Link to="/">முகப்பு</Link>
          <span className="breadcrumb__sep" aria-hidden="true">›</span>
          <span aria-current="page">குறிப்புகள்</span>
        </nav>

        <h1 className="page-title">சேமித்த சொற்கள்</h1>
        <p className="page-subtitle">
          இந்த உலாவியில் நீங்கள் குறிப்பாக சேமித்த சொற்கள். கணக்கு தேவையில்லை —
          இந்தச் சாதனத்தில் மட்டும் சேமிக்கப்படும்.
        </p>

        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">★</div>
            <p className="empty-state__title">இன்னும் சொற்கள் சேமிக்கப்படவில்லை</p>
            <p className="empty-state__hint">
              ஒரு சொல் பக்கத்தில் "குறிப்பாக சேமி" பொத்தானை அழுத்தி சேமிக்கலாம்.<br />
              <Link to="/">முகப்புக்கு திரும்பு</Link>
            </p>
          </div>
        ) : (
          <nav className="entry-list" aria-label="சேமித்த சொற்கள்">
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </nav>
        )}
      </div>
    </main>
  );
}
