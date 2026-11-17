import { Link } from 'react-router-dom';
import { entryPath, headwordLabel, poemById, poemPath, poemRef } from '../data';
import { useMeaningLanguage } from '../context/LanguageContext';
import SenseMeaning from './SenseMeaning';
import { CopyButton, Marked, SaveButton } from './common';
import { absoluteUrl } from '../utils/citation';
import { isoDate, tamilDate, type DailyWord } from '../utils/wordOfDay';

/** The day's word: headword, meaning in the reader's language, and the poem line it comes from. */
export default function WordOfDay({ word, heading = 'இன்றைய சொல்', level = 2, variant = 'full' }: {
  word: DailyWord; heading?: string; level?: 2 | 3;
  /** compact: the home-page margin version — one meaning and the source reference, no verse or actions. */
  variant?: 'full' | 'compact';
}) {
  const [lang] = useMeaningLanguage();
  const { entry, quote } = word;
  const sense = entry.senses.find((s) => s.id === quote.senseId) ?? entry.senses[0];
  const poem = poemById.get(quote.poemId)!;
  const line = poem.lines[quote.line - 1];
  const at = line.normalize('NFC').indexOf(quote.form);
  const H = level === 2 ? 'h2' : 'h3';
  const id = `wotd-${isoDate(word.date)}`;

  return (
    <article className={`wotd${variant === 'compact' ? ' wotd--compact' : ''}`} aria-labelledby={id}>
      <p className="wotd__label">
        <span>{heading}</span>
        <time dateTime={isoDate(word.date)}>{tamilDate(word.date)}</time>
      </p>
      <H id={id} className="wotd__word" lang="ta">
        <Link to={entryPath(entry.id, sense?.id)}>{headwordLabel(entry)}</Link>
      </H>
      <p className="wotd__meta">
        {entry.transliteration && <span lang="ta-Latn">{entry.transliteration}</span>}
        <span>{entry.partOfSpeech}</span>
        {entry.tinai && <span>திணை: {entry.tinai}</span>}
      </p>
      {sense && <SenseMeaning sense={sense} lang={lang} compact />}
      {variant === 'compact' ? (
        <p className="wotd__ref">
          <Link to={poemPath(poem, { line: quote.line, citation: quote.id })}>{poemRef(poem, quote.line)}</Link>
          {' · '}<Link to={entryPath(entry.id, sense?.id)}>முழுப் பதிவு</Link>
        </p>
      ) : (<>
      <figure className="wotd__quote">
        <blockquote lang="ta"><Marked text={line} ranges={at >= 0 ? [[at, at + quote.form.length]] : []} /></blockquote>
        <figcaption>
          <Link to={poemPath(poem, { line: quote.line, citation: quote.id })}>{poemRef(poem, quote.line)} — பாடலில் படிக்க</Link>
        </figcaption>
      </figure>
      <div className="wotd__actions">
        <Link to={entryPath(entry.id, sense?.id)} className="wotd__more">முழுப் பதிவு →</Link>
        <SaveButton entryId={entry.id} senseId={sense?.id} />
        <CopyButton
          text={() => absoluteUrl(`/today?date=${isoDate(word.date)}`)}
          label="பகிர்"
          done="இணைப்பு நகலெடுக்கப்பட்டது"
        />
      </div>
      </>)}
      {variant === 'full' && entry.status !== 'reviewed' && <p className="wotd__draft">வரைவுப் பதிவு — பொருள் இன்னும் மதிப்பாய்வு செய்யப்படவில்லை.</p>}
    </article>
  );
}
