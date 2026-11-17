import { useId } from 'react';
import { languages } from '../data';
import { useMeaningLanguage } from '../context/LanguageContext';

/**
 * Chooses the language meanings are shown in. It never changes what can be typed in search
 * or how headwords and verses are displayed (always Tamil).
 */
export default function LanguageSelector({ variant = 'select' }: { variant?: 'select' | 'pills' }) {
  const [lang, setLang] = useMeaningLanguage();
  const id = useId();

  if (variant === 'pills') {
    return (
      <fieldset className="lang-pills">
        <legend className="lang-pills__legend">பொருள் மொழி</legend>
        <div className="lang-pills__options">
          {languages.map((l) => (
            <label key={l.code} className={`lang-pill${lang === l.code ? ' is-active' : ''}`}>
              <input
                type="radio"
                name={`${id}-lang`}
                value={l.code}
                checked={lang === l.code}
                onChange={() => setLang(l.code)}
              />
              <span lang={l.code}>{l.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <div className="lang-select">
      <label htmlFor={id}>பொருள் மொழி</label>
      <select id={id} value={lang} onChange={(e) => setLang(e.target.value)}>
        {languages.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}
