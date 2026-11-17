import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  const path = location.pathname;

  function isActive(href: string) {
    if (href === '/') return path === '/';
    return path.startsWith(href);
  }

  return (
    <header className="site-header" role="banner">
      <div className="site-header__inner">
        <Link to="/" className="site-header__wordmark" aria-label="சங்கச் சொல் — முகப்பு">
          சங்கச் சொல்
        </Link>
        <nav className="site-header__nav" aria-label="முதன்மை வழிசெலுத்தல்">
          <Link
            to="/"
            aria-current={isActive('/') && path === '/' ? 'page' : undefined}
          >
            அகராதி
          </Link>
          <Link
            to="/works"
            aria-current={isActive('/works') ? 'page' : undefined}
          >
            நூல்கள்
          </Link>
          <Link
            to="/bookmarks"
            aria-current={isActive('/bookmarks') ? 'page' : undefined}
          >
            குறிப்புகள்
          </Link>
          <Link
            to="/about"
            aria-current={isActive('/about') ? 'page' : undefined}
          >
            பற்றி
          </Link>
        </nav>
      </div>
    </header>
  );
}
