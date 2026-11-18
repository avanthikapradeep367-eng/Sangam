import { useState, type ComponentType, type SVGProps } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import { HomeNav } from '../components/Header';
import { Book, Corners } from '../components/book/Book';
import {
  BookStack, Divider, IconBookmark, IconHistory, IconOpenBook, IconStar, InkpotQuill, LandscapeEngraving, LetterEmblem, TempleEngraving,
} from '../components/book/Art';
import { useMeaningLanguage } from '../context/LanguageContext';
import { useUi } from '../context/UiLanguage';
import { usePageTitle } from '../utils/usePageTitle';

/** The three directions of lookup. Each sets the search scope and the language meanings are shown in. */
const MODES = [
  {
    id: 'ta-en', scope: 'word', lang: 'en',
    label: { en: 'Tamil → English', ta: 'தமிழ் → ஆங்கிலம்' },
    placeholder: { en: 'Search in Tamil or English…', ta: 'தமிழ் அல்லது ஆங்கிலத்தில் தேடுங்கள்…' },
  },
  {
    id: 'en-ta', scope: 'meaning', lang: 'ta',
    label: { en: 'English → Tamil', ta: 'ஆங்கிலம் → தமிழ்' },
    placeholder: { en: 'Type an English word, e.g. heart, mountain…', ta: 'ஆங்கிலச் சொல்லைத் தட்டச்சிடுக — எ.கா. heart' },
  },
  {
    id: 'ta-ta', scope: 'word', lang: 'ta',
    label: { en: 'Tamil → Tamil', ta: 'தமிழ் → தமிழ்' },
    placeholder: { en: 'Type a Tamil word…', ta: 'தமிழ்ச் சொல்லைத் தட்டச்சிடுக…' },
  },
] as const;

/** Home-page wording in each interface language (the தமிழ் / English switch). */
const TEXT = {
  title: { en: 'Sangam Literature', ta: 'சங்க இலக்கியம்' },
  sub: { en: 'Tamil Dictionary', ta: 'தமிழ் அகராதி' },
  searchLabel: { en: 'Search the dictionary', ta: 'அகராதியில் தேடுக' },
  searchButton: { en: 'Search', ta: 'தேடு' },
  modes: { en: 'Search direction', ta: 'தேடல் திசை' },
  features: { en: 'Ways into the dictionary', ta: 'அகராதிப் பகுதிகள்' },
} as const;

const FEATURES: { to: string; en: string; ta: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { to: '/letters', en: 'Browse Words', ta: 'சொற்கள் உலாவு', Icon: IconOpenBook },
  { to: '/today', en: 'Word of the Day', ta: 'இன்றைய சொல்', Icon: IconBookmark },
  { to: '/history', en: 'Recent Searches', ta: 'சமீபத் தேடல்கள்', Icon: IconHistory },
  { to: '/saved', en: 'Favorites', ta: 'பிடித்த சொற்கள்', Icon: IconStar },
];

/** Reference 1: the dictionary lying open on the desk, title and search across the opening. */
export default function HomePage() {
  usePageTitle();
  const [, setLang] = useMeaningLanguage();
  const { ui } = useUi();
  const [mode, setMode] = useState<(typeof MODES)[number]['id']>('ta-en');
  const current = MODES.find((m) => m.id === mode)!;

  return (
    <div className="home-desk">
      <HomeNav />
      <main id="main-content" className="home">
        <Book variant="flat">
          <section className="leaf leaf--flat home__sheet" aria-labelledby="home-title">
            <Corners />
            <TempleEngraving className="engraving engraving--temple" />
            <LandscapeEngraving className="engraving engraving--landscape" />

            <div className="home__head">
              <LetterEmblem className="home__emblem" />
              <h1 id="home-title" className="home__title" lang={ui}>{TEXT.title[ui]}</h1>
              <Divider className="home__rule" width={560} />
              {/* Each interface language shows only its own wording. */}
              <p className="home__sub" lang={ui}>{TEXT.sub[ui]}</p>
            </div>

            <div className="home__search">
              <SearchBar
                variant="plate"
                label={TEXT.searchLabel[ui]}
                placeholder={current.placeholder[ui]}
                buttonLabel={TEXT.searchButton[ui]}
                scope={current.scope}
                onSubmit={() => setLang(current.lang)}
                autoFocus={typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches}
              />
              <div className="mode-pills" role="radiogroup" aria-label={TEXT.modes[ui]}>
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={mode === m.id}
                    className="mode-pill"
                    lang={ui}
                    onClick={() => { setMode(m.id); setLang(m.lang); }}
                  >
                    {m.label[ui]}
                  </button>
                ))}
              </div>
            </div>

            <Divider className="home__rule home__rule--wide" width={1000} />

            <nav className="home__features" aria-label={TEXT.features[ui]}>
              <ul>
                {FEATURES.map(({ to, en, ta, Icon }) => (
                  <li key={to}>
                    <Link to={to} className="feature">
                      <Icon className="feature__icon" />
                      <span className="feature__main" lang={ui}>{ui === 'ta' ? ta : en}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </section>
        </Book>
        <BookStack className="desk-prop desk-prop--books" />
        <InkpotQuill className="desk-prop desk-prop--ink" />
      </main>
    </div>
  );
}
