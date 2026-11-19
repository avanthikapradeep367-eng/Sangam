import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { Citation, DictionaryEntry } from '../types';
import {
  citationsByEntry, entries, entriesByHeadword, entryById, entryPath, headwordLabel, languages, poemById,
  poemPath, poemRef, topicById, workById,
} from '../data';
import { useMeaningLanguage } from '../context/LanguageContext';
import { useUi } from '../context/UiLanguage';
import Discovery from '../components/Discovery';
import LanguageSelector from '../components/LanguageSelector';
import ReportDialog from '../components/ReportDialog';
import { Book, Leaf } from '../components/book/Book';
import { IconBookmark, IconHome, IconLotus, IconOpenBook, IconShare, IconSpeaker } from '../components/book/Art';
import { CollectionTag, CopyButton, Marked, OriginTag, ReviewTag, SourceName } from '../components/common';
import { BookForms, BookNotice, LinkedEntries, Subforms } from '../components/BookRecord';
import { absoluteUrl, citationText, copyText } from '../utils/citation';
import { BASE_LANG, LANGUAGE_LABEL, MISSING_DEFINITION, MISSING_TRANSLATION, previewMeaning } from '../utils/languages';
import { savedWords, storage, useSavedWords } from '../utils/storage';
import { indexLetter, initialSyllable } from '../utils/tamil';
import { usePageTitle } from '../utils/usePageTitle';
import { dictionaryPath } from '../utils/wordOfDay';
import { describeError, useTranslations, type TranslationState } from '../utils/azure';
import { pronounceTamil, stopWord } from '../utils/speech';
import type { FromState } from '../components/EntryRow';
import NotFound from './NotFound';

const POS_ABBR: Record<string, string> = {
  'பெயர்ச்சொல்': 'n.', 'வினைச்சொல்': 'v.', 'இடைச்சொல்': 'part.', 'உரிச்சொல்': 'adj.', 'வினையடை': 'adv.', 'பெயரடை': 'adj.',
};
const SIZES = [0.9, 1, 1.15] as const;
const SIZE_KEY = 'sangam:textSize';

/** Range of the attested form in a line (first occurrence). */
function formRange(line: string, form: string): [number, number][] {
  const at = line.normalize('NFC').indexOf(form);
  return at >= 0 ? [[at, at + form.length]] : [];
}

/** Reference 2: the dictionary open at a word, discovery on the left and the entry on the right. */
export default function EntryPage() {
  const { id = '' } = useParams();
  const { hash, state } = useLocation();
  const from = (state as FromState | null)?.from;
  const entry = entryById.get(id) ?? entriesByHeadword.get(decodeURIComponent(id))?.[0];
  const { ui, t } = useUi();
  const savedNow = useSavedWords().some((x) => x.entryId === entry?.id);
  usePageTitle(entry ? headwordLabel(entry) : 'சொல் கிடைக்கவில்லை');
  const target = decodeURIComponent(hash.slice(1));
  // On small screens one leaf shows at a time. A new word or a #target opens the word leaf again.
  const paneKey = `${entry?.id}#${target}`;
  const [paneState, setPaneState] = useState<{ key: string; pane: 'search' | 'word' }>({ key: paneKey, pane: 'word' });
  const pane = paneState.key === paneKey ? paneState.pane : 'word';
  const setPane = (p: 'search' | 'word') => setPaneState({ key: paneKey, pane: p });

  useEffect(() => {
    if (!target) return;
    const el = document.getElementById(target);
    if (el) { el.scrollIntoView({ block: 'start', behavior: 'instant' }); el.focus({ preventScroll: true }); }
  }, [target, entry?.id]);

  if (!entry) {
    return (
      <NotFound title="இந்தச் சொல் அகராதியில் இல்லை">
        <p><Link to={`/search?q=${encodeURIComponent(id)}`}>“{decodeURIComponent(id)}” எனத் தேடுக</Link> அல்லது <Link to="/letters">எழுத்து வரிசையில் உலாவுக</Link>.</p>
      </NotFound>
    );
  }

  return (
    <main id="main-content" className="explorer">
      <div className="pane-tabs" role="group" aria-label={ui === 'ta' ? 'பக்கம்' : 'Page'}>
        <button type="button" aria-pressed={pane === 'search'} onClick={() => setPane('search')}>{t('showSearch')}</button>
        <button type="button" aria-pressed={pane === 'word'} onClick={() => setPane('word')} lang="ta">{entry.headword}</button>
      </div>
      <Book variant="spread" className={`show-${pane}`}>
        <Leaf side="left" aria-label={t('showSearch')}>
          <Discovery currentLetter={indexLetter(entry.headword)} multilingualHref={`${entryPath(entry.id)}#multilingual`} />
        </Leaf>
        <div className="book__gutter" aria-hidden="true" />
        <Leaf side="right" aria-labelledby="headword">
          <span className={`ribbon${savedNow ? ' is-saved' : ''}`} aria-hidden="true" />
          {/* On wide screens the entry scrolls inside its own page, so the spread is as tall as the discovery page. */}
          <div className="leaf__scroll" key={entry.id}>
            <EntryLeaf entry={entry} target={target} from={from} />
          </div>
        </Leaf>
      </Book>
    </main>
  );
}

/**
 * The entry as readers see it. Also used by /admin for its live preview, which passes the
 * citations compiled from the unsaved form instead of the published ones.
 */
export function EntryLeaf({ entry, target, from, citations }: { entry: DictionaryEntry; target: string; from?: FromState['from']; citations?: Citation[] }) {
  const { ui, t } = useUi();
  const [lang] = useMeaningLanguage();
  const glossLang = lang === BASE_LANG ? 'en' : lang;
  const saved = useSavedWords().some((s) => s.entryId === entry.id);
  const [size, setSize] = useState<number>(() => {
    const v = Number(storage.get(SIZE_KEY));
    return (SIZES as readonly number[]).includes(v) ? v : 1;
  });
  useEffect(() => { storage.set(SIZE_KEY, String(size)); }, [size]);

  const all = useMemo(() => (citations ?? citationsByEntry.get(entry.id) ?? []).filter((c) => poemById.has(c.poemId)), [entry, citations]);
  const featured = all.filter((c) => c.featured);
  const shownQuotes = (featured.length ? featured : all).slice(0, 2);
  const others = all.filter((c) => !shownQuotes.includes(c));
  const letter = initialSyllable(entry.headword);
  const related = entry.relatedIds.map((rid) => entryById.get(rid)).filter((e): e is DictionaryEntry => Boolean(e));
  const linkedIds = new Set(entry.links.map((l) => l.entryId));
  const homographs = (entriesByHeadword.get(entry.headword) ?? []).filter((e) => e.id !== entry.id && !linkedIds.has(e.id));
  const superseded = entry.supersededBy ? entryById.get(entry.supersededBy) : undefined;
  const attested = Array.from(new Set(all.map((c) => c.form))).filter((f) => f !== entry.headword && !f.includes(' '));
  const notesOf = (kind: 'etymology' | 'usage' | 'grammar') => entry.notes.filter((n) => n.kind === kind);
  const usageWorks = Array.from(new Set(all.map((c) => workById.get(poemById.get(c.poemId)!.workId)?.title))).filter(Boolean);

  // Alphabetical neighbours for previous / next.
  const list = entries.filter((e) => !e.supersededBy);
  const at = list.findIndex((e) => e.id === entry.id);
  const prev = at > 0 ? list[at - 1] : undefined;
  const next = at >= 0 && at < list.length - 1 ? list[at + 1] : undefined;

  const glosses = entry.senses.map((s) => s.translations[glossLang]).filter(Boolean);

  // ── Site language: what gets translated, and how ────────────────────────────
  // Tamil: nothing. English: the stored English gloss line, plus notes and quotations by Azure.
  // Any other language: each definition gets a line in that language — the dictionary's stored
  // meaning when it has one, otherwise Azure machine translation — and notes and quotations are
  // translated too. Headword, transliteration, quotations and sources stay in the original.
  const { siteLang } = useUi();
  const translateTo = siteLang === BASE_LANG ? null : siteLang;
  const perSense = translateTo && translateTo !== 'en' ? translateTo : null;
  const azureTexts: string[] = [];
  const ask = (text: string) => { azureTexts.push(text); return azureTexts.length - 1; };
  const defIndex = new Map<string, number>();
  if (perSense) for (const s of entry.senses) if (s.definition && !s.translations[perSense]) defIndex.set(s.id, ask(s.definition));
  const noteIndex = new Map<string, number>();
  if (translateTo) for (const n of entry.notes) noteIndex.set(n.id, ask(n.text));
  const quoteIndex = new Map<string, number>();
  if (translateTo) for (const c of shownQuotes) quoteIndex.set(c.id, ask(quoteLines(c).join(' / ')));
  const tr = useTranslations(azureTexts, translateTo && azureTexts.length ? translateTo : null);
  const shown = (i: number | undefined) => i !== undefined && tr.status === 'done' && Boolean(tr.texts[i]);
  const noteTr = (id: string) => {
    const i = noteIndex.get(id);
    return translateTo && i !== undefined ? <MachineText state={tr} index={i} lang={translateTo} /> : null;
  };

  return (
    <article className="entry-leaf turn-in" style={{ ['--leaf-scale' as string]: size }}>
      <div className="entry-leaf__top">
        <nav className="crumbs" aria-label={ui === 'ta' ? 'வழித்தடம்' : 'Breadcrumb'}>
          <ol>
            <li><Link to={dictionaryPath()} aria-label={t('navDictionary')}><IconHome className="crumbs__home" /></Link></li>
            <li><Link to={dictionaryPath()}>{t('navDictionary')}</Link></li>
            <li><Link to={`/letters?l=${encodeURIComponent(letter)}`} lang="ta">{letter}</Link></li>
            <li><span aria-current="page" lang="ta">{headwordLabel(entry)}</span></li>
          </ol>
        </nav>
        <div className="leaf-tools">
          <button
            type="button"
            className={`icon-tool${saved ? ' is-on' : ''}`}
            aria-pressed={saved}
            aria-label={saved ? t('unsave') : t('save')}
            title={saved ? t('unsave') : t('save')}
            onClick={() => (saved ? savedWords.remove(entry.id) : savedWords.add(entry.id, entry.senses[0]?.id))}
          ><IconBookmark /></button>
          <ShareButton entry={entry} />
          <div className="size-tools" role="group" aria-label={ui === 'ta' ? 'எழுத்தளவு' : 'Text size'}>
            {SIZES.map((s, i) => (
              <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)}
                aria-label={[t('textSmaller'), t('textNormal'), t('textLarger')][i]}>
                அ{i === 0 ? '−' : i === 2 ? '+' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>
      {from && <p className="entry__back"><Link to={from.path}>← {from.label}</Link></p>}

      <header className="hw">
        <div className="hw__line">
          <h1 id="headword" className="hw__word" lang="ta">
            {entry.headword}
            {entry.homograph && <sup aria-label={`சொல் ${entry.homograph}`}>{entry.homograph}</sup>}
          </h1>
          <Pronounce entry={entry} />
        </div>
        {entry.transliteration && <p className="hw__translit" lang="ta-Latn">{entry.transliteration}</p>}
        <p className="hw__pos">
          <span lang="ta">{entry.partOfSpeech}</span>{POS_ABBR[entry.partOfSpeech] && <span lang="en"> ({POS_ABBR[entry.partOfSpeech]})</span>}
          <CollectionTag collection={entry.collection} />
          {entry.tinai && <Link className="hw__tag" to={`/tinai?t=${encodeURIComponent(entry.tinai)}`}>திணை: {entry.tinai}</Link>}
          {entry.topics.map((tp) => <Link key={tp} className="hw__tag" to={`/topics/${tp}`}>{topicById.get(tp)?.label}</Link>)}
        </p>
      </header>

      {entry.collection === 'modern' && <BookForms entry={entry} />}
      {entry.status === 'demo' && (
        <p className="draft-note"><strong>மாதிரிப் பதிவு (demonstration).</strong> வடிவமைப்பைக் காட்டச் சேர்க்கப்பட்ட, ஆதாரம் இணைக்கப்படாத வரைவு. அறிஞர் மதிப்பாய்வு செய்யப்படவில்லை.</p>
      )}
      {entry.status === 'draft' && entry.collection === 'sangam' && (
        <p className="draft-note"><strong>வரைவுப் பதிவு.</strong> வரையறைகளும் மொழிபெயர்ப்புகளும் இன்னும் மதிப்பாய்வு செய்யப்படவில்லை. <Link to="/sources">ஆதாரங்கள்</Link></p>
      )}
      {entry.collection === 'modern' && <BookNotice entry={entry} />}
      {superseded && (
        <p className="draft-note">சரிபார்க்கப்பட்ட பதிவு: <Link to={entryPath(superseded.id)} lang="ta">{headwordLabel(superseded)}</Link></p>
      )}

      <ol className="defs">
        {entry.senses.map((s) => {
          const text = s.definition || previewMeaning(entry, glossLang, s).text;
          const stored = perSense ? s.translations[perSense] : undefined;
          const hasTr = Boolean(perSense && s.definition && (stored || shown(defIndex.get(s.id))));
          return (
            <li key={s.id} id={s.id} tabIndex={-1} className={target === s.id ? 'is-target' : undefined}>
              <span className="defs__n" aria-hidden="true">{s.number}</span>
              <span className="visually-hidden">{s.number}. </span>
              <span className="defs__body">
                {/* The Tamil original stays; when a translation is shown, the page reader reads that instead. */}
                <span lang={s.definition ? 'ta' : glossLang} data-has-translation={hasTr ? '' : undefined}>{text || MISSING_DEFINITION}</span>
                {perSense && s.definition && (
                  <span className="defs__tr">
                    {stored
                      ? <><span lang={perSense} dir="auto">{stored.text}</span> <OriginTag origin={stored.origin} /></>
                      : <MachineText state={tr} index={defIndex.get(s.id)!} lang={perSense} />}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {tr.status === 'error' && <p className="mt-notice" role="note">{describeError(tr.error, 'translate')} — {t('originalKept')}</p>}
      {!perSense && <p className="gloss-line">
        <span className="gloss-line__label">{LANGUAGE_LABEL[glossLang]}:</span>{' '}
        {glosses.length ? (
          <>
            <span lang={glossLang}>{capitalize(glosses.map((g) => g!.text).join('; '))}.</span>{' '}
            <OriginTag origin={glosses[0]!.origin} />
          </>
        ) : <span className="placeholder" lang="ta">{MISSING_TRANSLATION}</span>}
      </p>}

      <dl className="lex">
        <LexRow label={t('secEtymology')}>
          {notesOf('etymology').length ? notesOf('etymology').map((n) => <NoteText key={n.id} text={n.text} src={n.sourceId} tr={noteTr(n.id)} hasTr={shown(noteIndex.get(n.id))} />) : <Placeholder />}
        </LexRow>
        <LexRow label={t('secSynonyms')}>
          {entry.synonyms?.length ? <WordList words={entry.synonyms} /> : <Placeholder />}
        </LexRow>
        <LexRow label={t('secAntonyms')}>
          {entry.antonyms?.length ? <WordList words={entry.antonyms} /> : <Placeholder />}
        </LexRow>
        <LexRow label={t('secUsage')}>
          {notesOf('usage').map((n) => <NoteText key={n.id} text={n.text} src={n.sourceId} tr={noteTr(n.id)} hasTr={shown(noteIndex.get(n.id))} />)}
          {all.length > 0 && (
            <p lang="ta">இக்களஞ்சியத்தில் தொகுக்கப்பட்ட பாடல்களில் {all.length} இடங்களில் வருகிறது: {usageWorks.join(', ')}.</p>
          )}
          {!notesOf('usage').length && !all.length && <Placeholder />}
        </LexRow>
        {notesOf('grammar').length > 0 && (
          <LexRow label={t('secGrammar')}>
            {notesOf('grammar').map((n) => <NoteText key={n.id} text={n.text} src={n.sourceId} tr={noteTr(n.id)} hasTr={shown(noteIndex.get(n.id))} />)}
          </LexRow>
        )}
      </dl>

      <section className="citation" aria-labelledby="citation-title">
        <h2 id="citation-title" className="citation__title"><IconLotus className="citation__lotus" /> {t('secCitation')}</h2>
        {shownQuotes.length ? shownQuotes.map((c) => (
          <Quote key={c.id} c={c} label={t('readSource')}
            translation={translateTo && quoteIndex.has(c.id) ? <MachineText state={tr} index={quoteIndex.get(c.id)!} lang={translateTo} /> : null} />
        )) : (
          <p className="placeholder citation__empty">{t('noCitation')}</p>
        )}
      </section>

      <div className="related-row">
        <span className="ribbon-label">{t('secRelated')}</span>
        {related.length ? (
          <ul className="related-links">
            {related.map((r) => <li key={r.id}><Link to={entryPath(r.id)} lang="ta">{headwordLabel(r)}</Link></li>)}
          </ul>
        ) : <Placeholder />}
      </div>

      {homographs.length > 0 && (
        <p className="section-note">
          இதே எழுத்துக்கூட்டில் வேறு சொல்:{' '}
          {homographs.map((h, i) => <span key={h.id}>{i > 0 && ' · '}<Link to={entryPath(h.id)} lang="ta">{headwordLabel(h)}</Link> <CollectionTag collection={h.collection} /></span>)}
        </p>
      )}

      <section id="multilingual" tabIndex={-1} className="multi" aria-labelledby="multi-title">
        <div className="multi__head">
          <h2 id="multi-title" className="leaf-heading">{t('secMulti')}</h2>
          <LanguageSelector />
        </div>
        {entry.senses.map((s) => (
          <dl key={s.id} className="multi__table">
            {entry.senses.length > 1 && <p className="multi__n">{s.number}.</p>}
            {/* Only the language chosen in the selector above is shown. */}
            {languages.filter((l) => l.code === lang).map((l) => {
              const tr = l.base ? null : s.translations[l.code];
              const text = l.base ? s.definition : tr?.text;
              return (
                <div key={l.code}>
                  <dt lang={l.code}>{l.label}</dt>
                  {text ? (
                    <dd lang={l.code}>{text} {tr && <><OriginTag origin={tr.origin} /> <ReviewTag status={tr.reviewStatus} /></>}</dd>
                  ) : <dd className="placeholder" lang="ta">{l.base ? MISSING_DEFINITION : MISSING_TRANSLATION}</dd>}
                </div>
              );
            })}
          </dl>
        ))}
      </section>

      {entry.collection === 'modern' && <Subforms entry={entry} />}
      <LinkedEntries entry={entry} />

      {others.length > 0 && (
        <section className="occ" aria-labelledby="occ-title">
          <h2 id="occ-title" className="leaf-heading">{t('secOccurrences')} ({others.length})</h2>
          <ul className="occ-list">
            {others.map((c) => {
              const poem = poemById.get(c.poemId)!;
              const text = poem.lines[c.line - 1];
              return (
                <li key={c.id}>
                  <span className="occ-list__line" lang="ta"><Marked text={text} ranges={formRange(text, c.form)} /></span>
                  <Link to={poemPath(poem, { line: c.line, citation: c.id })} className="occ-list__ref">{poemRef(poem)}:{c.line}</Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(entry.spellingVariants.length > 0 || entry.inflectedForms.length > 0 || attested.length > 0) && (
        <section aria-labelledby="forms-title">
          <h2 id="forms-title" className="leaf-heading">{t('secForms')}</h2>
          <dl className="forms">
            {entry.spellingVariants.length > 0 && <><dt>மாற்று எழுத்துக்கூட்டு</dt><dd lang="ta">{entry.spellingVariants.join(', ')}</dd></>}
            {entry.inflectedForms.length > 0 && <><dt>சொல் வடிவங்கள்</dt><dd lang="ta">{entry.inflectedForms.join(', ')}</dd></>}
            {attested.length > 0 && <><dt>பாடல்களில் வரும் வடிவங்கள்</dt><dd lang="ta">{attested.join(', ')}</dd></>}
          </dl>
        </section>
      )}

      <footer className="entry-leaf__foot">
        <p className="entry-leaf__src">{t('secSources')}: <SourceName id={entry.senses[0]?.sourceId ?? entry.sourceId} /> · <code>/entry/{entry.id}</code></p>
        <div className="toolbar">
          <CopyButton text={() => citationText(entry)} label="மேற்கோள் நகலெடு" done="மேற்கோள் நகலெடுக்கப்பட்டது" />
          <CopyButton text={() => entryText(entry)} label="பதிவை நகலெடு" done="பதிவு நகலெடுக்கப்பட்டது" />
          <ReportDialog kind="entry" recordId={entry.id} reference={`${headwordLabel(entry)}${entry.transliteration ? ` (${entry.transliteration})` : ''}`} />
        </div>
        <nav className="prevnext" aria-label={ui === 'ta' ? 'அகர வரிசையில் அடுத்தவை' : 'Neighbouring entries'}>
          {prev ? <Link to={entryPath(prev.id)} rel="prev"><span>← {t('prev')}</span><strong lang="ta">{headwordLabel(prev)}</strong></Link> : <span />}
          {next ? <Link to={entryPath(next.id)} rel="next" className="prevnext__next"><span>{t('next')} →</span><strong lang="ta">{headwordLabel(next)}</strong></Link> : <span />}
        </nav>
      </footer>
    </article>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function entryText(entry: DictionaryEntry) {
  const lines = [
    `${headwordLabel(entry)}${entry.transliteration ? ` (${entry.transliteration})` : ''} — ${entry.partOfSpeech}`,
    ...entry.senses.map((s) => `${s.number}. ${s.definition}${s.translations.en ? ` — ${s.translations.en.text}` : ''}`),
    absoluteUrl(entryPath(entry.id)),
  ];
  return lines.join('\n');
}

function LexRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="lex__row">
      <dt><span className="ribbon-label">{label}</span></dt>
      <dd>{children}</dd>
    </div>
  );
}

function Placeholder() {
  const { t } = useUi();
  return <span className="placeholder">{t('notSourced')}</span>;
}

function NoteText({ text, src, tr, hasTr }: { text: string; src: string; tr?: ReactNode; hasTr?: boolean }) {
  return (
    <>
      <p lang="ta"><span data-has-translation={hasTr ? '' : undefined}>{text}</span> <span className="note-src">(<SourceName id={src} />)</span></p>
      {tr && <p className="note-tr">{tr}</p>}
    </>
  );
}

/**
 * One machine-translated text (Azure), marked as such. While loading it says so; on failure it
 * renders nothing (the original stays visible and a single notice explains the failure).
 */
function MachineText({ state, index, lang }: { state: TranslationState; index: number; lang: string }) {
  const { t } = useUi();
  if (state.status === 'loading') return <span className="mt mt--loading">{t('translating')}</span>;
  if (state.status !== 'done' || !state.texts[index]) return null;
  return <><span lang={lang} dir="auto">{state.texts[index]}</span> <span className="mt-tag">{t('machineAzure')}</span></>;
}

/** The lines shown for a quotation: the cited line and the one before it. */
function quoteLines(c: Citation): string[] {
  const poem = poemById.get(c.poemId)!;
  return poem.lines.slice(Math.max(1, c.line - 1) - 1, c.line);
}

function WordList({ words }: { words: string[] }) {
  return (
    <span lang="ta">
      {words.map((w, i) => {
        const hit = entriesByHeadword.get(w)?.[0];
        return <span key={w}>{i > 0 && ', '}{hit ? <Link to={entryPath(hit.id)}>{w}</Link> : w}</span>;
      })}.
    </span>
  );
}

function Quote({ c, label, translation }: { c: Citation; label: string; translation?: ReactNode }) {
  const { t } = useUi();
  const poem = poemById.get(c.poemId)!;
  const work = workById.get(poem.workId);
  const fromLine = Math.max(1, c.line - 1);
  const lines = poem.lines.slice(fromLine - 1, c.line);
  return (
    <figure className="citation__quote">
      <blockquote lang="ta">
        {lines.map((text, i) => {
          const n = fromLine + i;
          return <span key={n} className={`citation__line${n === c.line ? ' is-cited' : ''}`}>{n === c.line ? <Marked text={text} ranges={formRange(text, c.form)} /> : text}</span>;
        })}
      </blockquote>
      {/* A translation is shown beside the original verse, never instead of it. */}
      {translation && <p className="citation__tr"><span className="citation__tr-label">{t('quoteTranslation')}:</span> {translation}</p>}
      <figcaption>
        <span lang="ta">– {work?.title ?? poem.workId} (எண். {poem.number}, அடி {c.line})</span>
        <ReviewTag status={poem.reviewStatus} what="பாடம்" />
        <Link className="citation__open" to={poemPath(poem, { line: c.line, citation: c.id })}>
          <IconOpenBook className="citation__icon" /> {label} →
        </Link>
      </figcaption>
    </figure>
  );
}

function ShareButton({ entry }: { entry: DictionaryEntry }) {
  const { t } = useUi();
  const [msg, setMsg] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const share = async () => {
    const url = absoluteUrl(entryPath(entry.id));
    const title = headwordLabel(entry);
    let result = '';
    if (navigator.share) {
      try { await navigator.share({ title, text: `${title} — சொல்வளம்`, url }); return; } catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    result = (await copyText(url)) ? 'இணைப்பு நகலெடுக்கப்பட்டது' : 'நகலெடுக்க இயலவில்லை';
    setMsg(result);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(''), 2500);
  };
  return (
    <>
      <button type="button" className="icon-tool" aria-label={t('share')} title={t('share')} onClick={share}><IconShare /></button>
      <span className={`tool-toast${msg ? ' is-on' : ''}`} role="status">{msg}</span>
    </>
  );
}

/**
 * Pronunciation through Azure AI Speech: the original Tamil headword, always with the Tamil voice
 * (ta-IN-PallaviNeural), whatever the display language. Starting it stops "Read this page".
 */
function Pronounce({ entry }: { entry: DictionaryEntry }) {
  const { t } = useUi();
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [msg, setMsg] = useState('');
  useEffect(() => () => stopWord(), []);

  const play = async () => {
    setMsg('');
    setState('loading');
    try {
      await pronounceTamil(entry.headword, () => setState('idle'));
      setState('playing');
    } catch (e) {
      setState('idle');
      setMsg(describeError(e, 'speech'));
    }
  };

  return (
    <span className="pron">
      <button
        type="button"
        className={`pron__btn${state === 'playing' ? ' is-playing' : ''}`}
        onClick={() => void play()}
        aria-busy={state === 'loading'}
        aria-label={`${t('listen')}: ${entry.headword}`}
        title={`${t('listen')} — Azure ta-IN-PallaviNeural`}
      >
        {state === 'loading' ? <span className="pron__spin" aria-hidden="true" /> : <IconSpeaker />}
      </button>
      <span className="pron__msg" role="status">{msg}</span>
    </span>
  );
}
