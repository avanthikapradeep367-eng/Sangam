import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { entryPath, headwordLabel } from '../data';
import { useMeaningLanguage } from '../context/LanguageContext';
import WordOfDay from '../components/WordOfDay';
import LanguageSelector from '../components/LanguageSelector';
import { Breadcrumb, EmptyState } from '../components/common';
import { previewMeaning, truncate } from '../utils/languages';
import { DAILY_POOL_SIZE, isoDate, parseIsoDate, recentWords, tamilDate, wordForDate } from '../utils/wordOfDay';
import { usePageTitle } from '../utils/usePageTitle';

/** Today's word, any past day's word (?date=YYYY-MM-DD, for shared links), and the past week. */
export default function TodayPage() {
  const [params] = useSearchParams();
  const [lang] = useMeaningLanguage();
  const [today] = useState(() => new Date());
  const asked = parseIsoDate(params.get('date'));
  // Future dates are not revealed; they fall back to today.
  const date = asked && asked <= today ? asked : today;
  const isToday = isoDate(date) === isoDate(today);
  const word = wordForDate(date);
  const week = recentWords(8, today).slice(1);
  usePageTitle(word ? `${isToday ? 'இன்றைய சொல்' : tamilDate(date, false)} — ${headwordLabel(word.entry)}` : 'இன்றைய சொல்');

  return (
    <main id="main-content" className="page">
      <div className="container">
        <Breadcrumb items={[{ to: '/', label: 'அகராதி' }, { label: 'இன்றைய சொல்' }]} />
        <div className="results-bar">
          <h1 className="page-title">{isToday ? 'இன்றைய சொல்' : 'அன்றைய சொல்'}</h1>
          <LanguageSelector />
        </div>
        {asked && asked > today && <p className="section-note">வருங்காலச் சொற்கள் முன்கூட்டியே காட்டப்படுவதில்லை; இன்றைய சொல் கீழே.</p>}
        {params.get('date') && !asked && <p className="section-note">தேதி புரியவில்லை; இன்றைய சொல் கீழே.</p>}

        {word ? (
          <WordOfDay word={word} heading={isToday ? 'இன்றைய சொல்' : 'அன்றைய சொல்'} />
        ) : (
          <EmptyState title="இன்றைய சொல் இல்லை">
            <p>பாடல் மேற்கோளுடன் கூடிய சொற்கள் இன்னும் சேர்க்கப்படவில்லை.</p>
          </EmptyState>
        )}
        {!isToday && <p className="section-note"><Link to="/today">இன்றைய சொல்லுக்குச் செல் →</Link></p>}

        {week.length > 0 && (
          <section className="home__section" aria-labelledby="week-title">
            <h2 id="week-title" className="section-title">கடந்த ஏழு நாள்கள்</h2>
            <ul className="wotd-week">
              {week.map((w) => {
                const p = previewMeaning(w.entry, lang);
                return (
                  <li key={isoDate(w.date)}>
                    <Link to={`/today?date=${isoDate(w.date)}`} className="wotd-week__date">{tamilDate(w.date)}</Link>
                    <Link to={entryPath(w.entry.id)} className="wotd-week__word" lang="ta">{headwordLabel(w.entry)}</Link>
                    <span className="wotd-week__gloss" lang={p.lang}>{truncate(p.text, 70)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        <p className="home__status">
          ஒவ்வொரு நாளும் பாடல் மேற்கோளுடன் கூடிய {DAILY_POOL_SIZE} சங்கச் சொற்களில் ஒன்று; எல்லாச் சொற்களும் வந்த பின்பே மீண்டும் தொடங்கும்.
          உங்கள் கணினியின் நள்ளிரவில் சொல் மாறும்.
        </p>
      </div>
    </main>
  );
}
