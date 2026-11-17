import { useState } from 'react';
import { Link } from 'react-router-dom';
import { entryById, entryPath, headwordLabel, senseById } from '../data';
import { useMeaningLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { Breadcrumb, EmptyState } from '../components/common';
import { savedWords, useSavedWords } from '../utils/storage';
import { downloadFile, savedWordsCSV } from '../utils/citation';
import { previewMeaning, truncate } from '../utils/languages';
import { normalize, romanKey } from '../utils/tamil';
import { usePageTitle } from '../utils/usePageTitle';

export default function SavedPage() {
  usePageTitle('சேமித்த சொற்கள்');
  const saved = useSavedWords();
  const [lang] = useMeaningLanguage();
  const [filter, setFilter] = useState('');

  const rows = saved
    .map((s) => {
      const entry = entryById.get(s.entryId);
      if (!entry) return null;
      const sense = (s.senseId && senseById.get(s.senseId)?.sense) || entry.senses[0];
      return { entry, sense, savedAt: s.savedAt };
    })
    .filter((r) => r !== null);
  const missing = saved.length - rows.length;

  const f = normalize(filter);
  const shown = rows.filter(({ entry, sense }) => {
    if (!f) return true;
    const hay = [entry.headword, entry.transliteration ?? '', sense.definition, ...Object.values(sense.translations).map((t) => t.text)].map(normalize);
    return hay.some((h) => h.includes(f)) || (entry.transliteration && romanKey(entry.transliteration).includes(romanKey(f)) && romanKey(f).length > 1);
  });

  return (
    <main id="main-content" className="page">
      <div className="container">
        <Breadcrumb items={[{ to: '/', label: 'அகராதி' }, { label: 'சேமித்த சொற்கள்' }]} />
        <h1 className="page-title">சேமித்த சொற்கள்</h1>
        <p className="page-lede">
          இச்சொற்கள் இந்தச் சாதனத்தின் உலாவியில் மட்டும் சேமிக்கப்படுகின்றன; கணக்கு தேவையில்லை. உலாவித் தரவை அழித்தால் இவையும் அழியும்.
        </p>

        {rows.length === 0 ? (
          <EmptyState title="இன்னும் எந்தச் சொல்லும் சேமிக்கப்படவில்லை">
            <p>சொல் பக்கத்தில் “☆ சேமி” பொத்தானை அழுத்துங்கள். <Link to="/">அகராதிக்குச் செல்க</Link></p>
          </EmptyState>
        ) : (
          <>
            <div className="saved-bar">
              <label className="field field--inline">
                <span>சேமித்தவற்றில் தேடு</span>
                <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} lang="ta" />
              </label>
              <LanguageSelector />
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => downloadFile(`sangam-sol-saved-${new Date().toISOString().slice(0, 10)}.csv`, savedWordsCSV(rows, lang), 'text/csv;charset=utf-8')}
              >
                CSV ஆக இறக்கு
              </button>
            </div>
            <p className="results-count" role="status">{shown.length} / {rows.length} சொற்கள்</p>
            <ul className="saved-list">
              {shown.map(({ entry, sense, savedAt }) => {
                const p = previewMeaning(entry, lang, sense);
                return (
                  <li key={entry.id}>
                    <Link to={entryPath(entry.id, sense.id)} className="entry-row__word" lang="ta">{headwordLabel(entry)}</Link>
                    <span className="saved-list__gloss">
                      {entry.senses.length > 1 && <span className="muted">பொருள் {sense.number}: </span>}
                      <span lang={p.lang}>{truncate(p.text, 110)}</span>
                    </span>
                    <span className="saved-list__date">{new Date(savedAt).toLocaleDateString('ta-IN')}</span>
                    <button type="button" className="link-btn" onClick={() => savedWords.remove(entry.id)}>
                      நீக்கு<span className="visually-hidden">: {entry.headword}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {missing > 0 && <p className="muted">{missing} சேமித்த பதிவுகள் இப்போது அகராதியில் இல்லை.</p>}
          </>
        )}
      </div>
    </main>
  );
}
