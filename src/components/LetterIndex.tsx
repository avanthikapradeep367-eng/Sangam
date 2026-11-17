import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TAMIL_ALPHABET, indexLetter } from '../utils/tamil';
import { entries } from '../data';

const used = new Set(entries.map((e) => indexLetter(e.headword)));

/** Tamil alphabet index (vowels, then consonants). Collapsed behind a button on small screens. */
export default function LetterIndex({ active, hrefFor, title = 'எழுத்து வரிசை' }: {
  active?: string;
  /** Where a letter links to; defaults to the letter browser. The search page uses it to filter results. */
  hrefFor?: (letter: string) => string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <nav className={`letter-index${open ? ' is-open' : ''}`} aria-labelledby="letter-index-label">
      <div className="letter-index__head">
        <h2 id="letter-index-label" className="section-label">{title}</h2>
        <button
          type="button"
          className="letter-index__toggle"
          aria-expanded={open}
          aria-controls="letter-index-list"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'மூடு' : active ? `${active} — மாற்று` : 'எழுத்துகளைக் காட்டு'}
        </button>
      </div>
      <ul id="letter-index-list" className="letter-index__list">
        {TAMIL_ALPHABET.map((l) => (
          <li key={l}>
            {used.has(l) ? (
              <Link
                to={hrefFor ? hrefFor(l) : `/letters?l=${encodeURIComponent(l)}`}
                className={`letter${active === l ? ' is-active' : ''}`}
                aria-current={active === l ? 'true' : undefined}
                aria-label={`${l} — இவ்வெழுத்தில் தொடங்கும் சொற்கள்`}
                lang="ta"
              >
                {l}
              </Link>
            ) : (
              <span className="letter is-empty" aria-label={`${l} — சொற்கள் இல்லை`} lang="ta">{l}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="letter-index__more"><Link to="/letters">உயிர்மெய், கிரந்த எழுத்துகளுடன் முழு எழுத்து வரிசை →</Link></p>
    </nav>
  );
}

/** Narrow vertical alphabet beside search results (desktop). */
export function LetterRail({ active, hrefFor }: { active?: string; hrefFor: (letter: string) => string }) {
  return (
    <nav className="letter-rail" aria-label="எழுத்து வாரியாக வடிகட்டு">
      <p className="letter-rail__title" aria-hidden="true">எழுத்து</p>
      <ul>
        {TAMIL_ALPHABET.map((l) => (
          <li key={l}>
            {used.has(l) ? (
              <Link to={hrefFor(l)} className={`letter${active === l ? ' is-active' : ''}`} aria-current={active === l ? 'true' : undefined} lang="ta">{l}</Link>
            ) : (
              <span className="letter is-empty" aria-hidden="true" lang="ta">{l}</span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
