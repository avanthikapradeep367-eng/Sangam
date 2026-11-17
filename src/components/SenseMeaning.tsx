import type { LangCode, Sense } from '../types';
import { BASE_LANG, getSenseMeaning, LANGUAGE_LABEL, MISSING_DEFINITION, MISSING_TRANSLATION } from '../utils/languages';
import { OriginTag, ReviewTag, UsageTags } from './common';

/**
 * Modern Tamil definition plus the reader's chosen translation, as one numbered sense shows them.
 * When a sense has no Tamil definition yet (book imports), the book's English gloss is shown instead
 * of an empty line, clearly labelled.
 */
export default function SenseMeaning({ sense, lang, compact = false }: { sense: Sense; lang: LangCode; compact?: boolean }) {
  const m = getSenseMeaning(sense, lang);
  const en = sense.translations.en;
  const showBookEnglish = !sense.definition && en?.origin === 'book' && lang !== 'en';
  return (
    <div className={`meaning${compact ? ' meaning--compact' : ''}`}>
      {sense.definition ? (
        <p className="meaning__ta" lang="ta">
          {sense.definition}
          {!compact && sense.definitionOrigin && sense.definitionOrigin !== 'book' && <> <OriginTag origin={sense.definitionOrigin} /></>}
        </p>
      ) : (
        <p className="meaning__ta meaning__missing" lang="ta">{MISSING_DEFINITION}</p>
      )}
      {showBookEnglish && (
        <div className="meaning__tr">
          <span className="meaning__lang">{LANGUAGE_LABEL.en}</span>
          <p lang="en">{en.text}</p>
          {!compact && <OriginTag origin="book" />}
        </div>
      )}
      {!compact && sense.usage && sense.usage.length > 0 && <UsageTags usage={sense.usage} />}
      {lang !== BASE_LANG && !(lang === 'en' && showBookEnglish) && (
        <div className="meaning__tr">
          <span className="meaning__lang">{LANGUAGE_LABEL[lang]}</span>
          {m.text ? (
            <p lang={lang}>
              {m.text}
              {!compact && m.isExplanatoryGloss && <span className="meaning__gloss-note" lang="ta"> — விளக்கப் பொருள்</span>}
            </p>
          ) : (
            <p className="meaning__missing" lang="ta">{MISSING_TRANSLATION}</p>
          )}
          {m.text && m.origin && (m.origin !== 'book' || !compact) && <OriginTag origin={m.origin} />}
          {!compact && m.text && <ReviewTag status={m.status === 'reviewed' ? 'reviewed' : 'unreviewed'} what="மொழிபெயர்ப்பு" />}
        </div>
      )}
    </div>
  );
}
