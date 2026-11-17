import { Link, NavLink, useLocation } from 'react-router-dom';
import SearchBar from './SearchBar';
import { useSavedWords } from '../utils/storage';

const NAV = [
  { to: '/', label: 'அகராதி', end: true, also: ['/search', '/entry', '/letters', '/topics', '/today'] },
  { to: '/works', label: 'நூல்கள்' },
  { to: '/tinai', label: 'திணை' },
  { to: '/saved', label: 'சேமித்த சொற்கள்' },
  { to: '/about', label: 'பற்றி', also: ['/sources'] },
];

export default function Header() {
  const { pathname } = useLocation();
  const saved = useSavedWords();
  const onHome = pathname === '/';

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-header__wordmark" aria-label="சங்கச் சொல் — முகப்பு">
          சங்கச் சொல்
        </Link>
        <nav className="site-nav" aria-label="முதன்மை வழிசெலுத்தல்">
          <ul>
            {NAV.map((item) => {
              const extra = item.also?.some((p) => pathname.startsWith(p));
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => (isActive || extra ? 'active' : undefined)}
                    aria-current={pathname === item.to || extra ? 'page' : undefined}
                  >
                    {item.label}
                    {item.to === '/saved' && saved.length > 0 && (
                      <span className="site-nav__count" aria-label={`${saved.length} சொற்கள்`}>{saved.length}</span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      {!onHome && (
        <div className="site-header__search">
          <SearchBar compact />
        </div>
      )}
    </header>
  );
}
