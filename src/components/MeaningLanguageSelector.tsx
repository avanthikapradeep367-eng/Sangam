import { LANGUAGES } from '../utils/languages';
import { useMeaningLanguage } from '../context/LanguageContext';

export default function MeaningLanguageSelector() {
  const [lang, setLang] = useMeaningLanguage();

  return (
    <div className="lang-selector" role="group" aria-label="பொருள் மொழி — பொருள் காட்டப்பட வேண்டிய மொழி">
      <span className="lang-selector__label">பொருள் மொழி</span>
      <div className="lang-selector__options">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            className={`lang-pill${lang === l.code ? ' lang-pill--active' : ''}`}
            aria-pressed={lang === l.code}
            onClick={() => setLang(l.code)}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
