import { useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import LetterIndex from '../components/LetterIndex';
import LanguageSelector from '../components/LanguageSelector';
import EntryRow from '../components/EntryRow';
import WordOfDay from '../components/WordOfDay';
import { coverage, entries, entryById, poemsByWork, topics, works } from '../data';
import { usePageTitle } from '../utils/usePageTitle';
import { wordForDate } from '../utils/wordOfDay';

/** A short, fixed sample that shows the range of the dictionary (landscape, people, plants, feeling). */
const SAMPLE = ['nenjam', 'kelir', 'kurinji', 'natan', 'pasalai', 'matal', 'kanal', 'punnai', 'ma-horse', 'ma-mango'];

/**
 * The opening page of the book: title and search, then the alphabet and a column of entries,
 * with the day's word and the ways into works and topics in the margin.
 */
export default function HomePage() {
  usePageTitle();
  const [today] = useState(() => wordForDate(new Date()));
  const sample = SAMPLE.map((id) => entryById.get(id)).filter((e) => e !== undefined);
  const indexed = works.filter((w) => poemsByWork.has(w.id));
  const usedTopics = topics.filter((t) => t.scheme === 'sangam' && entries.some((e) => e.topics.includes(t.id)));
  const poemTotal = Object.values(coverage.works).reduce((n, w) => n + w.poems, 0);

  return (
    <main id="main-content" className="page home">
      <div className="container container--wide">
        <section className="home-title" aria-labelledby="home-title">
          <h1 id="home-title" className="home-title__h">சங்க இலக்கியச் சொல்லகராதி</h1>
          <p className="home-title__desc">
            சங்கப் பாடல்களில் வரும் சொற்களின் பொருள், அவை வரும் அடிகள், நவீனத் தமிழ், ஆங்கிலம், இந்தி, மலையாளம், தெலுங்கில் விளக்கம்.
          </p>
          {/* Autofocus only with a mouse/trackpad, so phones do not pop up the keyboard on load. */}
          <SearchBar
            label="சொல் அல்லது பொருளைத் தேடுக"
            autoFocus={typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches}
          />
          <LanguageSelector variant="pills" />
        </section>

        <div className="home-grid">
          <div className="home-grid__main">
            <LetterIndex />

            <section aria-labelledby="sample-title" className="home__section">
              <div className="section-head">
                <h2 id="sample-title" className="section-label">சில சொற்கள்</h2>
                <Link to="/search">எல்லாச் சொற்களும் ({coverage.entries}) →</Link>
              </div>
              <ul className="entry-list">{sample.map((e) => <EntryRow key={e.id} entry={e} />)}</ul>
            </section>
          </div>

          <aside className="home-grid__aside" aria-label="இன்றைய சொல், நூல்கள், தலைப்புகள்">
            {today && (
              <section aria-label="இன்றைய சொல்">
                <WordOfDay word={today} variant="compact" />
                <p className="home__wotd-more"><Link to="/today">கடந்த நாள்களின் சொற்கள் →</Link></p>
              </section>
            )}

            <section aria-labelledby="works-title">
              <h2 id="works-title" className="section-label">நூல்கள்</h2>
              <ul className="toc">
                {indexed.map((w) => (
                  <li key={w.id}>
                    <Link to={`/works/${w.id}`} lang="ta">{w.title}</Link>
                    <span className="toc__n">{coverage.works[w.id]?.poems} பாடல்</span>
                  </li>
                ))}
              </ul>
              <p className="home__more"><Link to="/works">எல்லா நூல்களும் →</Link></p>
            </section>

            <section aria-labelledby="topics-title">
              <h2 id="topics-title" className="section-label">தலைப்புகள்</h2>
              <ul className="chips chips--links">
                {usedTopics.map((t) => <li key={t.id}><Link className="chip" to={`/search?topic=${t.id}`}>{t.label}</Link></li>)}
                <li><Link className="chip" to="/tinai">திணை</Link></li>
              </ul>
              <p className="home__more"><Link to="/topics">நவீனத் தமிழ்ச் சொற்களின் தலைப்புகள் →</Link></p>
            </section>
          </aside>
        </div>

        <p className="home__status">
          வளர்ந்து வரும் வரைவுப் பதிப்பு: சங்கச் சொற்கள் {coverage.collections.sangam}, பாடல்கள் {poemTotal};
          நவீனத் தமிழ் அடிப்படைச் சொற்கள் {coverage.collections.modern.total} (ஒப்புதல் பெற்றவை {coverage.collections.modern.approved}).
          வரையறைகளும் மொழிபெயர்ப்புகளும் மதிப்பாய்வுக்குக் காத்திருக்கின்றன. <Link to="/sources">ஆதாரங்களும் உள்ளடக்க அளவும்</Link>
        </p>
      </div>
    </main>
  );
}
