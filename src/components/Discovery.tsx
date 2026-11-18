import { useId, useMemo, useState, type ComponentType, type SVGProps } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';
import { Divider, IconAlphabet, IconGlobe, IconLeaf, IconPalmLeaf, TempleEngraving } from './book/Art';
import { useUi, type UiKey } from '../context/UiLanguage';
import { entries, entryPath, headwordLabel } from '../data';
import { browse } from '../utils/search';
import { AYTHAM, TAMIL_CONSONANTS, TAMIL_VOWELS, combine, indexLetter, initialSyllable } from '../utils/tamil';

const usedLetters = new Set(entries.map((e) => indexLetter(e.headword)));
const usedSyllables = new Set(entries.map((e) => initialSyllable(e.headword)));

type Mode = 'word' | 'meaning' | 'translit';
const MODES: { id: Mode; key: UiKey; scope: string; lang: string }[] = [
  { id: 'word', key: 'modeWord', scope: 'word', lang: 'ta' },
  { id: 'meaning', key: 'modeMeaning', scope: 'meaning', lang: 'en' },
  { id: 'translit', key: 'modeTranslit', scope: 'word', lang: 'en' },
];
const PLACEHOLDER: Record<Mode, { ta: string; en: string }> = {
  word: { ta: 'தமிழ்ச் சொல்லைத் தேடுங்கள்…', en: 'Search for a Tamil word…' },
  meaning: { ta: 'ஆங்கிலப் பொருளால் தேடுங்கள் — எ.கா. heart', en: 'Search by English meaning — e.g. heart' },
  translit: { ta: 'ஆங்கில எழுத்தில் — எ.கா. nenjam, aram', en: 'In Latin letters — e.g. nenjam, aram' },
};

const FEATURES: { to: string; ta: UiKey; Icon: ComponentType<SVGProps<SVGSVGElement>>; en: string }[] = [
  { to: '/letters', ta: 'featAlphabet', en: 'Tamil Alphabet', Icon: IconAlphabet },
  { to: '/search?src=sangam', ta: 'featSangam', en: 'Sangam Vocabulary', Icon: IconPalmLeaf },
  { to: '/etymology', ta: 'featEtymology', en: 'Etymology', Icon: IconLeaf },
  { to: '#multilingual', ta: 'featMulti', en: 'Multilingual Meanings', Icon: IconGlobe },
];

/** Left page of the explorer (reference 2): title, search, alphabet index and ways into the dictionary. */
export default function Discovery({ currentLetter, multilingualHref }: {
  currentLetter?: string; multilingualHref: string;
}) {
  const { ui, t } = useUi();
  const [mode, setMode] = useState<Mode>('word');
  const [letter, setLetter] = useState<string | null>(null);
  const [syllable, setSyllable] = useState<string | null>(null);
  const id = useId();

  const isConsonant = letter ? TAMIL_CONSONANTS.includes(letter) : false;
  const syllables = useMemo(
    () => (letter && isConsonant ? [combine(letter, null), ...TAMIL_VOWELS.map((v) => combine(letter, v))] : []),
    [letter, isConsonant],
  );
  const filter = syllable ?? letter;
  const words = filter ? browse({ letter: filter }).filter((e) => !e.supersededBy) : [];

  const pick = (l: string) => { setLetter((cur) => (cur === l ? null : l)); setSyllable(null); };

  return (
    <div className="discover" data-noread>
      <TempleEngraving className="engraving engraving--corner" />
      <h1 className="discover__title" lang="ta">{t('discoverTitle')}</h1>
      <Divider className="discover__rule" width={300} />
      <p className="discover__intro">{t('discoverIntro')}</p>

      <SearchBar
        variant="plate"
        label={ui === 'ta' ? 'அகராதியில் தேடுக' : 'Search the dictionary'}
        placeholder={PLACEHOLDER[mode][ui]}
        buttonLabel={t('searchButton')}
        scope={MODES.find((m) => m.id === mode)!.scope}
      />
      <fieldset className="discover__modes">
        <legend className="visually-hidden">{ui === 'ta' ? 'தேடல் வகை' : 'Search by'}</legend>
        {MODES.map((m) => (
          <label key={m.id} className="radio">
            <input type="radio" name={`${id}-mode`} checked={mode === m.id} onChange={() => setMode(m.id)} />
            <span lang={m.id === 'word' && ui === 'ta' ? 'ta' : 'en'}>{t(m.key)}</span>
          </label>
        ))}
      </fieldset>

      <section className="alpha" aria-labelledby={`${id}-alpha`}>
        <div className="alpha__head">
          <h2 id={`${id}-alpha`} className="alpha__title">{t('alphabet')}</h2>
          <Link to="/search" className="alpha__all">{t('fullDictionary')} →</Link>
        </div>
        <div className="alpha__frame">
          <p className="visually-hidden">{t('vowels')}</p>
          <ul className="alpha__row" aria-label={t('vowels')}>
            {[...TAMIL_VOWELS, AYTHAM].map((l) => (
              <li key={l}><LetterButton l={l} active={letter === l} current={currentLetter === l} has={usedLetters.has(l)} onPick={pick} /></li>
            ))}
          </ul>
          <ul className="alpha__row" aria-label={t('consonants')}>
            {TAMIL_CONSONANTS.map((l) => (
              <li key={l}><LetterButton l={l} active={letter === l} current={currentLetter === l} has={usedLetters.has(l)} onPick={pick} /></li>
            ))}
          </ul>
          {syllables.length > 0 && (
            <ul className="alpha__row alpha__row--syllables" aria-label={`${t('syllables')}: ${letter}`}>
              {syllables.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className={`alpha__letter alpha__letter--small${syllable === s ? ' is-active' : ''}${usedSyllables.has(s) ? '' : ' is-empty'}`}
                    aria-pressed={syllable === s}
                    disabled={!usedSyllables.has(s)}
                    onClick={() => setSyllable((cur) => (cur === s ? null : s))}
                    lang="ta"
                  >{s}</button>
                </li>
              ))}
            </ul>
          )}
          {filter && (
            <div className="alpha__words" aria-live="polite">
              {words.length === 0 ? <p className="alpha__none">{t('noWordsLetter')}</p> : (
                <ul>
                  {words.slice(0, 12).map((e) => (
                    <li key={e.id}><Link to={entryPath(e.id)} lang="ta">{headwordLabel(e)}</Link></li>
                  ))}
                  {words.length > 12 && <li><Link to={`/search?letter=${encodeURIComponent(filter)}`}>{t('more')} ({words.length}) →</Link></li>}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      <nav className="discover__features" aria-label={ui === 'ta' ? 'அகராதிப் பகுதிகள்' : 'Sections'}>
        <ul>
          {FEATURES.map(({ to, ta, Icon }) => {
            const href = to === '#multilingual' ? multilingualHref : to;
            return (
              <li key={to}>
                <Link to={href} className="feature feature--small">
                  <Icon className="feature__icon" />
                  <span className="feature__text">
                    <span className="feature__ta" lang={ui}>{t(ta)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function LetterButton({ l, active, current, has, onPick }: { l: string; active: boolean; current: boolean; has: boolean; onPick: (l: string) => void }) {
  return (
    <button
      type="button"
      className={`alpha__letter${active ? ' is-active' : ''}${current ? ' is-current' : ''}${has ? '' : ' is-empty'}`}
      aria-pressed={active}
      onClick={() => onPick(l)}
      lang="ta"
      title={has ? undefined : 'சொற்கள் இல்லை'}
    >{l}</button>
  );
}
