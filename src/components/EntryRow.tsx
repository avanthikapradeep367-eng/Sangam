import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { DictionaryEntry, Sense } from '../types';
import { entryPath, headwordLabel, workById, worksForEntry } from '../data';
import { useMeaningLanguage } from '../context/LanguageContext';
import { BASE_LANG, previewMeaning, truncate } from '../utils/languages';
import { CollectionTag } from './common';

interface Props {
  entry: DictionaryEntry;
  /** Show this sense's meaning (e.g. the one a meaning search matched) instead of sense 1. */
  sense?: Sense;
  note?: ReactNode;
}

/** Where the reader came from, so the entry page can offer a way back to the same results. */
export interface FromState { from?: { path: string; label: string } }

const FROM_LABEL: [RegExp, string][] = [
  [/^\/search/, 'தேடல் முடிவுகள்'],
  [/^\/letters/, 'எழுத்து வரிசை'],
  [/^\/topics/, 'தலைப்பு'],
  [/^\/saved/, 'சேமித்த சொற்கள்'],
  [/^\/works/, 'பாடல்'],
  [/^\/tinai/, 'திணை'],
  [/^\/today/, 'இன்றைய சொல்'],
];

/**
 * One dictionary row: headword, part of speech and source, and a short meaning in the reader's
 * language. Long meanings wrap; only very long ones are shortened.
 */
export default function EntryRow({ entry, sense, note }: Props) {
  const [lang] = useMeaningLanguage();
  const { pathname, search } = useLocation();
  const p = previewMeaning(entry, lang, sense);
  const label = FROM_LABEL.find(([re]) => re.test(pathname))?.[1];
  const state: FromState | undefined = label ? { from: { path: pathname + search, label } } : undefined;
  const cited = entry.collection === 'sangam' ? worksForEntry(entry.id).map((w) => workById.get(w)?.title).filter(Boolean) : [];

  return (
    <li className="entry-row">
      <Link to={entryPath(entry.id, sense?.id)} state={state} className="entry-row__word" lang="ta">
        {headwordLabel(entry)}
      </Link>
      <span className="entry-row__pos">
        {entry.collection !== 'sangam' && <CollectionTag collection={entry.collection} />}
        {entry.partOfSpeech !== 'குறிப்பிடப்படவில்லை' && entry.partOfSpeech}
        {sense && entry.senses.length > 1 && <> · பொருள் {sense.number}</>}
        {cited.length > 0 && <span className="entry-row__src"> · {cited.join(', ')}</span>}
      </span>
      <span className="entry-row__gloss">
        <span lang={p.lang}>{truncate(p.text, 160)}</span>
        {p.missing && (
          <span className="entry-row__missing"> ({p.lang === BASE_LANG ? 'தமிழ் வரையறை' : 'ஆங்கிலப் பொருள்'})</span>
        )}
      </span>
      {note && <span className="entry-row__note">{note}</span>}
    </li>
  );
}
