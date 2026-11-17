import { Link } from 'react-router-dom';
import type { DictionaryEntry } from '../types';

interface EntryRowProps {
  entry: DictionaryEntry;
}

export default function EntryRow({ entry }: EntryRowProps) {
  const preview = entry.senses[0]?.definition ?? '';
  const previewText = preview.length > 72 ? preview.slice(0, 69) + '…' : preview;

  return (
    <Link to={`/entry/${entry.id}`} className="entry-row" aria-label={`${entry.headword}: ${previewText}`}>
      <span className="entry-row__word">{entry.headword}</span>
      <span className="entry-row__preview">{previewText}</span>
      <span className="entry-row__work">{entry.work}</span>
    </Link>
  );
}
