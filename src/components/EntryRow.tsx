import { Link } from 'react-router-dom';
import type { DictionaryEntry, LangCode } from '../types';
import { useMeaningLanguage } from '../context/LanguageContext';
import { getEntryPreviewMeaning, truncate, LANGUAGE_LABEL } from '../utils/languages';

interface EntryRowProps {
  entry: DictionaryEntry;
  matchNote?: { lang: LangCode; snippet: string };
}

export default function EntryRow({ entry, matchNote }: EntryRowProps) {
  const [lang] = useMeaningLanguage();
  const meaning = getEntryPreviewMeaning(entry, lang);
  const previewText = truncate(meaning.text, 72);

  return (
    <Link to={`/entry/${entry.id}`} className="entry-row" aria-label={`${entry.headword}: ${previewText}`}>
      <span className="entry-row__word">{entry.headword}</span>
      <span className="entry-row__preview">
        {previewText}
        {meaning.status === 'fallback' && lang !== 'ta' && (
          <span className="entry-row__fallback-tag"> (தமிழ்)</span>
        )}
      </span>
      <span className="entry-row__work">{entry.work}</span>
      {matchNote && (
        <span className="entry-row__match-note">
          {LANGUAGE_LABEL[matchNote.lang]} பொருளில் பொருந்தியது: "{matchNote.snippet}"
        </span>
      )}
    </Link>
  );
}
