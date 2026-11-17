import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { Citation, DictionaryEntry, Sense } from '../types';
import {
  citationsByEntry, entriesByHeadword, entryById, entryPath, headwordLabel, languages, poemById,
  poemPath, poemRef, sourceById, topicById, workById, works,
} from '../data';
import { useMeaningLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import SenseMeaning from '../components/SenseMeaning';
import ReportDialog from '../components/ReportDialog';
import { Breadcrumb, CollectionTag, CopyButton, Marked, OriginTag, ReviewTag, SaveButton, SourceName } from '../components/common';
import { BookForms, BookNotice, LinkedEntries, Subforms } from '../components/BookRecord';
import { absoluteUrl, citationText } from '../utils/citation';
import { BASE_LANG, MISSING_DEFINITION, MISSING_TRANSLATION, previewMeaning } from '../utils/languages';
import { initialSyllable } from '../utils/tamil';
import { usePageTitle } from '../utils/usePageTitle';
import type { FromState } from '../components/EntryRow';
import NotFound from './NotFound';

const NOTE_LABEL = { grammar: 'இலக்கணக் குறிப்பு', etymology: 'சொல்லாக்கம்', usage: 'வழக்குக் குறிப்பு' } as const;

/** Range of the attested form in a line (first occurrence). */
function formRange(line: string, form: string): [number, number][] {
  const at = line.normalize('NFC').indexOf(form);
  return at >= 0 ? [[at, at + form.length]] : [];
}

function Quotation({ c }: { c: Citation }) {
  const poem = poemById.get(c.poemId)!;
  const source = sourceById.get(poem.sourceId);
  // The cited line with one line of context either side, keeping the original line breaks.
  const from = Math.max(1, c.line - 1);
  const to = Math.min(poem.lines.length, c.line + 1);
  const lines = poem.lines.slice(from - 1, to);
  return (
    <figure className="quote">
      <blockquote lang="ta">
        {lines.map((text, i) => {
          const n = from + i;
          return (
            <span key={n} className={`quote__line${n === c.line ? ' is-cited' : ''}`}>
              <span className="quote__n" aria-hidden="true">{n}</span>
              {n === c.line ? <Marked text={text} ranges={formRange(text, c.form)} /> : text}
            </span>
          );
        })}
      </blockquote>
      <figcaption>
        <span className="quote__ref">{poemRef(poem)}, அடி {c.line}</span>
        <span>பதிப்பு: {source ? <SourceName id={source.id} /> : '—'}</span>
        <ReviewTag status={poem.reviewStatus} what="பாடம்" />
        <Link to={poemPath(poem, { line: c.line, citation: c.id })} className="quote__open">பாடலில் காண்க →</Link>
      </figcaption>
    </figure>
  );
}

function SenseBlock({ entry, sense, featured, highlighted }: {
  entry: DictionaryEntry; sense: Sense; featured: Citation[]; highlighted: boolean;
}) {
  const [lang] = useMeaningLanguage();
  const translations = languages.filter((l) => !l.base);
  return (
    <li id={sense.id} className={`sense${highlighted ? ' is-target' : ''}`} tabIndex={-1} aria-labelledby={`${sense.id}-n`}>
      <span className="sense__n" id={`${sense.id}-n`}>{entry.senses.length > 1 ? `${sense.number}.` : <span className="visually-hidden">பொருள்</span>}</span>
      <div className="sense__body">
        <SenseMeaning sense={sense} lang={lang} />
        <div className="sense__actions">
          <CopyButton
            className="link-btn"
            text={() => absoluteUrl(entryPath(entry.id, sense.id))}
            label={<>இப்பொருளுக்கான இணைப்பு<span className="visually-hidden"> ({sense.number})</span></>}
            done="இணைப்பு நகலெடுக்கப்பட்டது"
          />
          <CopyButton
            className="link-btn"
            text={() => citationText(entry, sense)}
            label={<>மேற்கோள்<span className="visually-hidden">: பொருள் {sense.number}</span></>}
            done="மேற்கோள் நகலெடுக்கப்பட்டது"
          />
        </div>
        <details className="all-langs">
          <summary>எல்லா மொழிகளிலும்</summary>
          <dl>
            <div>
              <dt>{languages.find((l) => l.base)?.label}</dt>
              {sense.definition
                ? <dd lang={BASE_LANG}>{sense.definition}{sense.definitionOrigin && <> <OriginTag origin={sense.definitionOrigin} /></>}</dd>
                : <dd className="meaning__missing" lang="ta">{MISSING_DEFINITION}</dd>}
            </div>
            {translations.map((l) => {
              const t = sense.translations[l.code];
              return (
                <div key={l.code}>
                  <dt>{l.label}</dt>
                  {t ? (
                    <dd lang={l.code}>{t.text}{' '}<OriginTag origin={t.origin} /> <ReviewTag status={t.reviewStatus} /></dd>
                  ) : (
                    <dd className="meaning__missing" lang="ta">{MISSING_TRANSLATION}</dd>
                  )}
                </div>
              );
            })}
          </dl>
        </details>
        {featured.map((c) => <Quotation key={c.id} c={c} />)}
      </div>
    </li>
  );
}

function Occurrences({ list }: { list: Citation[] }) {
  const [work, setWork] = useState('');
  const workIds = works.filter((w) => list.some((c) => poemById.get(c.poemId)?.workId === w.id));
  const shown = list.filter((c) => !work || poemById.get(c.poemId)?.workId === work);
  return (
    <section className="occurrences" aria-labelledby="occ-title">
      <h2 id="occ-title" className="section-title">பிற பாடல்களில்</h2>
      <p className="section-note">
        இக்களஞ்சியத்தில் தொகுக்கப்பட்ட பாடல்களில் மட்டும் உள்ள இடங்கள் ({list.length}). எல்லாச் சங்க நூல்களிலும் உள்ள முழுப் பட்டியல் அன்று.
      </p>
      {workIds.length > 1 && (
        <div className="chips" role="group" aria-label="நூல் வாரியாக">
          <button type="button" className="chip" aria-pressed={!work} onClick={() => setWork('')}>எல்லாம்</button>
          {workIds.map((w) => (
            <button key={w.id} type="button" className="chip" aria-pressed={work === w.id} onClick={() => setWork(w.id)}>
              {w.title} ({list.filter((c) => poemById.get(c.poemId)?.workId === w.id).length})
            </button>
          ))}
        </div>
      )}
      <ul className="occ-list">
        {shown.map((c) => {
          const poem = poemById.get(c.poemId)!;
          const text = poem.lines[c.line - 1];
          return (
            <li key={c.id}>
              <span className="occ-list__line" lang="ta"><Marked text={text} ranges={formRange(text, c.form)} /></span>
              <Link to={poemPath(poem, { line: c.line, citation: c.id })} className="occ-list__ref">
                {poemRef(poem)}:{c.line}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function EntryPage() {
  const { id = '' } = useParams();
  const { hash, state } = useLocation();
  const from = (state as FromState | null)?.from;
  const entry = entryById.get(id) ?? entriesByHeadword.get(decodeURIComponent(id))?.[0];
  const [lang] = useMeaningLanguage();
  usePageTitle(entry ? headwordLabel(entry) : 'சொல் கிடைக்கவில்லை');
  const target = decodeURIComponent(hash.slice(1));

  // Jump to a shared sense link (#sense-id) and move focus there.
  useEffect(() => {
    if (!target) return;
    const el = document.getElementById(target);
    if (el) { el.scrollIntoView({ block: 'start', behavior: 'instant' }); el.focus({ preventScroll: true }); }
  }, [target, entry?.id]);

  const all = useMemo(() => (entry ? citationsByEntry.get(entry.id) ?? [] : []), [entry]);
  if (!entry) {
    return (
      <NotFound title="இந்தச் சொல் அகராதியில் இல்லை">
        <p><Link to={`/search?q=${encodeURIComponent(id)}`}>“{decodeURIComponent(id)}” எனத் தேடுக</Link> அல்லது <Link to="/">எழுத்து வரிசையில் உலாவுக</Link>.</p>
      </NotFound>
    );
  }

  const featured = all.filter((c) => c.featured);
  const others = all.filter((c) => !c.featured);
  // Same spelling, different word. Entries an editor has linked as the same word are listed separately.
  const linkedIds = new Set(entry.links.map((l) => l.entryId));
  const homographs = (entriesByHeadword.get(entry.headword) ?? []).filter((e) => e.id !== entry.id && !linkedIds.has(e.id));
  const letter = initialSyllable(entry.headword);
  const superseded = entry.supersededBy ? entryById.get(entry.supersededBy) : undefined;
  const related = entry.relatedIds.map((rid) => entryById.get(rid)).filter((e): e is DictionaryEntry => Boolean(e));
  const attested = Array.from(new Set(all.map((c) => c.form))).filter((f) => f !== entry.headword && !f.includes(' '));
  const firstMeaning = entry.senses[0];

  return (
    <main id="main-content" className="page entry">
      <div className="container container--wide">
        <Breadcrumb items={[
          { to: '/', label: 'அகராதி' },
          { to: `/letters?l=${encodeURIComponent(letter)}`, label: letter },
          { label: headwordLabel(entry) },
        ]} running={<>{letter} — {entry.collection === 'sangam' ? 'சங்கச் சொல்லகராதி' : 'நவீனத் தமிழ்'}</>} />
        {from && <p className="entry__back"><Link to={from.path}>← திரும்பிச் செல்: {from.label}</Link></p>}

        <header className="entry__head">
          <h1 className="entry__headword" lang="ta">
            {entry.headword}
            {entry.homograph && <sup className="entry__homograph" aria-label={`சொல் ${entry.homograph}`}>{entry.homograph}</sup>}
          </h1>
          <p className="entry__meta">
            {entry.transliteration && <span className="entry__translit" lang="ta-Latn">{entry.transliteration}</span>}
            <CollectionTag collection={entry.collection} />
            <span className="entry__pos">{entry.partOfSpeech}</span>
            {entry.tinai && <Link className="entry__tag" to={`/tinai?t=${encodeURIComponent(entry.tinai)}`}>திணை: {entry.tinai}</Link>}
            {entry.topics.map((t) => (
              <Link key={t} className="entry__tag" to={`/topics/${t}`}>{topicById.get(t)?.code ? `${topicById.get(t)?.code} · ` : ''}{topicById.get(t)?.label}</Link>
            ))}
          </p>
          {entry.pronunciationAudio && <Pronunciation src={entry.pronunciationAudio} />}
          {entry.collection === 'modern' && <BookForms entry={entry} />}
          {superseded && (
            <p className="draft-note">
              <strong>மாதிரிப் பதிவு.</strong> இதன் வரையறைகளின் மூலம் அறியப்படவில்லை. சரிபார்க்கப்பட்ட பதிவு:{' '}
              <Link to={entryPath(superseded.id)} lang="ta">{headwordLabel(superseded)}</Link> (<SourceName id={superseded.sourceId} />)
            </p>
          )}
          {entry.collection === 'modern' ? <BookNotice entry={entry} /> : entry.status !== 'reviewed' && (
            <p className="draft-note">
              <strong>வரைவுப் பதிவு.</strong> வரையறைகளும் மொழிபெயர்ப்புகளும் இன்னும் அறிஞர் மதிப்பாய்வு செய்யப்படவில்லை.{' '}
              <Link to="/sources">ஆதாரங்கள் பற்றி</Link>
            </p>
          )}
          {homographs.length > 0 && (
            <p className="entry__homographs">
              இதே எழுத்துக்கூட்டில் வேறு சொல்:{' '}
              {homographs.map((h) => (
                <span key={h.id} className="entry__homograph-link">
                  <Link to={entryPath(h.id)} lang="ta">{headwordLabel(h)}</Link>{' '}
                  <CollectionTag collection={h.collection} />{' '}
                  ({previewMeaning(h, BASE_LANG).text.split(/[;.]/)[0]})
                </span>
              ))}
            </p>
          )}
          <div className="toolbar">
            <SaveButton entryId={entry.id} senseId={firstMeaning?.id} />
            <CopyButton text={() => absoluteUrl(entryPath(entry.id))} label="இணைப்பை நகலெடு" done="இணைப்பு நகலெடுக்கப்பட்டது" />
            <CopyButton text={() => citationText(entry)} label="மேற்கோள் நகலெடு" done="மேற்கோள் நகலெடுக்கப்பட்டது" />
            <ReportDialog kind="entry" recordId={entry.id} reference={`${headwordLabel(entry)}${entry.transliteration ? ` (${entry.transliteration})` : ''}`} />
          </div>
        </header>

        <div className="entry__layout">
          <div className="entry__main">
            <div className="entry__langbar"><LanguageSelector /></div>
            <h2 className="visually-hidden">பொருள்கள்</h2>
            <ol className="senses">
              {entry.senses.map((s) => (
                <SenseBlock
                  key={s.id}
                  entry={entry}
                  sense={s}
                  featured={featured.filter((c) => c.senseId === s.id)}
                  highlighted={target === s.id}
                />
              ))}
            </ol>

            {entry.notes.length > 0 && (
              <section aria-labelledby="notes-title" className="notes">
                <h2 id="notes-title" className="section-title">குறிப்புகள்</h2>
                {entry.notes.map((n) => (
                  <div key={n.id} className="note">
                    <h3>{NOTE_LABEL[n.kind]}</h3>
                    <p lang="ta">{n.text}</p>
                    <p className="note__src">ஆதாரம்: <SourceName id={n.sourceId} /></p>
                  </div>
                ))}
              </section>
            )}

            {entry.collection === 'modern' && <Subforms entry={entry} />}

            {others.length > 0 && <><hr className="ornament" /><Occurrences list={others} /></>}
            {all.length === 0 && entry.collection === 'sangam' && (
              <p className="section-note">இக்களஞ்சியத்தில் உள்ள பாடல்களில் இச்சொல்லுக்கு இன்னும் மேற்கோள் இணைக்கப்படவில்லை.</p>
            )}
          </div>

          <aside className="entry__aside" aria-label="தொடர்புடையவை">
            {(entry.spellingVariants.length > 0 || entry.inflectedForms.length > 0 || attested.length > 0) && (
              <section>
                <h2 className="aside-title">வடிவங்கள்</h2>
                <dl className="forms">
                  {entry.spellingVariants.length > 0 && <><dt>மாற்று எழுத்துக்கூட்டு</dt><dd lang="ta">{entry.spellingVariants.join(', ')}</dd></>}
                  {entry.inflectedForms.length > 0 && <><dt>சொல் வடிவங்கள்</dt><dd lang="ta">{entry.inflectedForms.join(', ')}</dd></>}
                  {attested.length > 0 && <><dt>பாடல்களில் வரும் வடிவங்கள்</dt><dd lang="ta">{attested.join(', ')}</dd></>}
                </dl>
              </section>
            )}
            {related.length > 0 && (
              <section>
                <h2 className="aside-title">தொடர்புடைய சொற்கள்</h2>
                <ul className="related">
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link to={entryPath(r.id)} lang="ta">{headwordLabel(r)}</Link>
                      <span className="related__gloss" lang={r.senses[0] && (lang === BASE_LANG || r.senses[0].translations[lang]) ? lang : 'ta'}>
                        {r.senses[0] && previewMeaning(r, lang).text.split(/[;.]/)[0]}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <LinkedEntries entry={entry} />
            {entry.collection === 'sangam' && <section>
              <h2 className="aside-title">ஆதாரம்</h2>
              <p className="aside-text">வரையறை: <SourceName id={firstMeaning?.sourceId ?? entry.sourceId} /></p>
              {all.length > 0 && (
                <p className="aside-text">
                  மேற்கோள்கள்: {Array.from(new Set(all.map((c) => workById.get(poemById.get(c.poemId)!.workId)?.title))).join(', ')}
                </p>
              )}
              <p className="aside-text">நிரந்தர இணைப்பு: <code>/entry/{entry.id}</code></p>
            </section>}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Pronunciation({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => new Audio(src));
  useEffect(() => {
    const stop = () => setPlaying(false);
    audio.addEventListener('ended', stop);
    audio.addEventListener('pause', stop);
    return () => { audio.pause(); audio.removeEventListener('ended', stop); audio.removeEventListener('pause', stop); };
  }, [audio]);
  return (
    <p className="pron">
      <button
        type="button"
        className="tool-btn"
        aria-pressed={playing}
        onClick={() => { if (playing) audio.pause(); else { audio.currentTime = 0; void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); } }}
      >
        <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span> {playing ? 'நிறுத்து' : 'ஒலிப்பைக் கேள்'}
      </button>
      <span className="pron__label">இன்றைய தமிழ் ஒலிப்பு (சங்ககால ஒலிப்பு அல்ல)</span>
    </p>
  );
}

