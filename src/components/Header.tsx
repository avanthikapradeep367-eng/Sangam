import { Link, NavLink, useLocation } from 'react-router-dom';
import { useSavedWords } from '../utils/storage';
import { useUi, type UiKey } from '../context/UiLanguage';
import { IconBookmark, TreeEmblem } from './book/Art';
import { dictionaryPath } from '../utils/wordOfDay';
import { LanguageSelect, PageReader } from './SiteControls';

const NAV: { to: string; key: UiKey; end?: boolean; also?: string[] }[] = [
  // The dictionary has no fixed address of its own: it opens at today's word (dictionaryPath).
  { to: '/entry', key: 'navDictionary', also: ['/search', '/letters', '/today', '/history'] },
  { to: '/works', key: 'navSangam', also: ['/tinai'] },
  { to: '/etymology', key: 'navEtymology' },
  { to: '/topics', key: 'navCollections' },
];

/** Dark wooden masthead of the dictionary explorer and interior pages. */
export default function Header() {
  const { pathname } = useLocation();
  const saved = useSavedWords();
  const { ui, t } = useUi();

  return (
    <header className="masthead">
      <div className="masthead__inner">
        <Link to="/" className="masthead__brand" aria-label={`${t('brand')} — முகப்பு`}>
          <TreeEmblem className="masthead__emblem" />
          <span className="masthead__names">
            <span className="masthead__name" lang="ta">சொல்வளம்</span>
          </span>
        </Link>
        <span className="masthead__sep" aria-hidden="true" />
        <nav className="masthead__nav" aria-label={ui === 'ta' ? 'முதன்மை வழிசெலுத்தல்' : 'Main navigation'}>
          <ul>
            {NAV.map((item) => {
              const active = pathname.startsWith(item.to) || item.also?.some((p) => pathname.startsWith(p));
              return (
                <li key={item.to}>
                  <NavLink to={item.key === 'navDictionary' ? dictionaryPath() : item.to} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
                    {t(item.key)}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="masthead__tools">
          <PageReader />
          <LanguageSelect />
          <Link to="/saved" className="masthead__saved" aria-label={`${t('saved')} (${saved.length})`} title={t('saved')}>
            <IconBookmark />
            {saved.length > 0 && <span className="masthead__count" aria-hidden="true">{saved.length}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}

/** The narrow navigation bar of the home page (reference 1), with the reader and language selector at the right. */
export function HomeNav() {
  const { pathname } = useLocation();
  const { ui } = useUi();
  const items = [
    { to: '/', en: 'Home', ta: 'முகப்பு' },
    { to: dictionaryPath(), en: 'Browse', ta: 'உலாவு' },
    { to: '/today', en: 'Word of the Day', ta: 'இன்றைய சொல்' },
    { to: '/about', en: 'About', ta: 'பற்றி' },
  ];
  return (
    <header className="homenav">
      <div className="homenav__inner">
        <nav aria-label={ui === 'ta' ? 'முதன்மை வழிசெலுத்தல்' : 'Main navigation'}>
          <ul>
            {items.map((i) => (
              <li key={i.to}>
                <Link to={i.to} lang={ui} className={pathname === i.to ? 'active' : undefined} aria-current={pathname === i.to ? 'page' : undefined}>{i[ui]}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="homenav__tools">
          <PageReader />
          <LanguageSelect />
        </div>
      </div>
    </header>
  );
}
