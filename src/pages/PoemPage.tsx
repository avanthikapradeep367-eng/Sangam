import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { Citation, Poem } from '../types';
import {
  citationsByPoem, entryById, entryPath, headwordLabel, poemById, poemPath, poemsByWork, senseById, sourceById, workById,
} from '../data';
import { useMeaningLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import SenseMeaning from '../components/SenseMeaning';
import ReportDialog from '../components/ReportDialog';
import EntryRow from '../components/EntryRow';
import { Breadcrumb, CopyButton, ReviewTag, SourceName } from '../components/common';
import { absoluteUrl } from '../utils/citation';
import { usePageTitle } from '../utils/usePageTitle';
import NotFound from './NotFound';

type Segment = { text: string; citation?: Citation };

/** Split a line into plain text and linked word segments (first non-overlapping match of each form). */
function segmentLine(text: string, cites: Citation[]): Segment[] {
  const line = text.normalize('NFC');
  const spans: { s: number; e: number; c: Citation }[] = [];
  for (const c of cites) {
    let from = 0;
    while (from <= line.length) {
      const at = line.indexOf(c.form, from);
      if (at < 0) break;
      const end = at + c.form.length;
      if (!spans.some((x) => at < x.e && end > x.s)) { spans.push({ s: at, e: end, c }); break; }
      from = at + 1;
    }
  }
  spans.sort((a, b) => a.s - b.s);
  const out: Segment[] = [];
  let pos = 0;
  for (const sp of spans) {
    if (sp.s > pos) out.push({ text: line.slice(pos, sp.s) });
    out.push({ text: line.slice(sp.s, sp.e), citation: sp.c });
    pos = sp.e;
  }
  if (pos < line.length) out.push({ text: line.slice(pos) });
  return out;
}

interface PanelState { citation: Citation; anchor: HTMLButtonElement }

function WordPanel({ state, onClose }: { state: PanelState; onClose: (returnFocus: boolean) => void }) {
  const [lang] = useMeaningLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const { citation } = state;
  const entry = entryById.get(citation.entryId)!;
  const recorded = citation.senseId ? senseById.get(citation.senseId)?.sense : undefined;
  const sense = recorded ?? entry.senses[0];

  // Place the panel just below the word, kept inside the reading column.
  useLayoutEffect(() => {
    if (!ref.current) return;
    const container = ref.current.offsetParent as HTMLElement | null;
    // On phones the panel is a fixed bottom sheet (no offsetParent); CSS does the placement.
    if (!container || getComputedStyle(ref.current).position === 'fixed') { setPos({ top: 0, left: 0 }); return; }
    const a = state.anchor.getBoundingClientRect();
    const c = container.getBoundingClientRect();
    const w = ref.current.offsetWidth;
    const left = Math.min(Math.max(0, a.left - c.left), Math.max(0, c.width - w));
    setPos({ top: a.bottom - c.top + 6, left });
  }, [state.anchor]);

  // Move focus into the panel once it is positioned (a hidden element cannot take focus).
  const placed = pos !== null;
  useEffect(() => { if (placed) headingRef.current?.focus(); }, [citation.id, placed]);

  return (
    <div
      ref={ref}
      className="word-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="word-panel-title"
      style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }}
    >
      <div className="word-panel__head">
        <h2 id="word-panel-title" ref={headingRef} tabIndex={-1} lang="ta">
          {headwordLabel(entry)}
          <span className="word-panel__pos">{entry.partOfSpeech}</span>
        </h2>
        <button type="button" className="icon-btn" aria-label="மூடு" onClick={() => onClose(true)}>×</button>
      </div>
      <p className="word-panel__form">
        பாடலில்: <span lang="ta">{citation.form}</span>
        {citation.line ? <> · அடி {citation.line}</> : null}
      </p>
      <p className="word-panel__sense-label">
        {recorded
          ? `இவ்வடியில் பொருள் ${recorded.number}${entry.senses.length > 1 ? ` (${entry.senses.length} பொருள்களில்)` : ''}`
          : 'இவ்வடிக்கான பொருள் பதிவு செய்யப்படவில்லை; முதல் பொருள்:'}
      </p>
      {sense && <SenseMeaning sense={sense} lang={lang} compact />}
      <Link className="word-panel__more" to={entryPath(entry.id, sense?.id)}>முழுப் பதிவைக் காண்க →</Link>
    </div>
  );
}

/** Verse sizes the reader can choose; 'm' leaves the size to the stylesheet (it differs by screen). */
const TEXT_SIZES = [
  { id: 's', label: 'சிறிய எழுத்து', glyph: 'அ', size: '1.08rem' },
  { id: 'm', label: 'இயல்பான எழுத்து', glyph: 'அ', size: null },
  { id: 'l', label: 'பெரிய எழுத்து', glyph: 'அ', size: '1.5rem' },
  { id: 'xl', label: 'மிகப் பெரிய எழுத்து', glyph: 'அ', size: '1.78rem' },
] as const;
type TextSize = (typeof TEXT_SIZES)[number]['id'];

function useTextSize(): [TextSize, (s: TextSize) => void] {
  const [size, setSize] = useState<TextSize>(() => {
    try { return (localStorage.getItem('poem-text-size') as TextSize) || 'm'; } catch { return 'm'; }
  });
  return [size, (s) => { setSize(s); try { localStorage.setItem('poem-text-size', s); } catch { /* private mode */ } }];
}

function TextSizeControl({ size, onChange }: { size: TextSize; onChange: (s: TextSize) => void }) {
  return (
    <div className="text-size" role="group" aria-label="பாடல் எழுத்தளவு">
      <span aria-hidden="true">எழுத்தளவு</span>
      {TEXT_SIZES.map((t, i) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={size === t.id}
          aria-label={t.label}
          title={t.label}
          style={{ fontSize: `${0.78 + i * 0.14}rem` }}
          onClick={() => onChange(t.id)}
        >
          {t.glyph}
        </button>
      ))}
    </div>
  );
}

export default function PoemPage() {
  const { workId = '', number = '' } = useParams();
  const [params] = useSearchParams();
  const poem = poemById.get(`${workId}-${number}`);
  const work = workById.get(workId);
  usePageTitle(poem && work ? `${work.title} ${poem.number}` : 'பாடல் கிடைக்கவில்லை');

  const targetLine = Number(params.get('line')) || 0;
  const targetCitation = params.get('c') ?? '';
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [textSize, setTextSize] = useTextSize();
  const verseSize = TEXT_SIZES.find((t) => t.id === textSize)?.size;
  const textRef = useRef<HTMLDivElement>(null);

  const cites = useMemo(() => (poem ? citationsByPoem.get(poem.id) ?? [] : []), [poem]);
  const lines = useMemo(
    () => (poem ? poem.lines.map((l, i) => segmentLine(l, cites.filter((c) => c.line === i + 1))) : []),
    [poem, cites],
  );

  const close = useCallback((returnFocus: boolean) => {
    setPanel((p) => {
      if (p && returnFocus) p.anchor.focus();
      return null;
    });
  }, []);

  // Close on outside click/tap, without stealing focus from what was tapped.
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.word-panel') && !t.closest('.word')) close(false);
    };
    // Escape closes the panel from anywhere on the page, returning focus to the word.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(true); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [panel, close]);

  // Arriving from an entry: scroll to the cited line and focus the linked word (or the line).
  useEffect(() => {
    setPanel(null);
    if (!targetLine) { window.scrollTo(0, 0); return; }
    const root = textRef.current;
    const el = (targetCitation && root?.querySelector<HTMLElement>(`[data-cid="${CSS.escape(targetCitation)}"]`))
      || root?.querySelector<HTMLElement>(`#line-${targetLine}`);
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'instant' }); el.focus({ preventScroll: true }); }
  }, [poem?.id, targetLine, targetCitation]);

  if (!poem || !work) {
    return (
      <NotFound title="இந்தப் பாடல் இக்களஞ்சியத்தில் இல்லை">
        <p>{work ? <Link to={`/works/${work.id}`}>{work.title} — கிடைக்கும் பாடல்கள்</Link> : <Link to="/works">நூல்கள்</Link>}</p>
      </NotFound>
    );
  }

  const siblings = poemsByWork.get(work.id) ?? [];
  const idx = siblings.findIndex((p) => p.id === poem.id);
  const prev: Poem | undefined = siblings[idx - 1];
  const next: Poem | undefined = siblings[idx + 1];
  const wordEntries = Array.from(new Map(cites.slice().sort((a, b) => a.line - b.line).map((c) => [c.entryId, c])).values());
  const source = sourceById.get(poem.sourceId);

  return (
    <main id="main-content" className="page poem">
      <div className="container">
        <Breadcrumb
          items={[{ to: '/works', label: 'நூல்கள்' }, { to: `/works/${work.id}`, label: work.title }, { label: `பாடல் ${poem.number}` }]}
          running={<>{work.title}{poem.tinai ? ` · ${poem.tinai}` : ''}</>}
        />

        <header className="poem__head">
          <h1 className="page-title" lang="ta">{work.title} {poem.number}</h1>
          <dl className="poem__meta">
            {poem.tinai && <div><dt>திணை</dt><dd><Link to={`/tinai?t=${encodeURIComponent(poem.tinai)}`}>{poem.tinai}</Link></dd></div>}
            {poem.turai && <div><dt>துறை</dt><dd>{poem.turai}</dd></div>}
            {poem.speaker && <div><dt>கூற்று</dt><dd>{poem.speaker}</dd></div>}
            <div><dt>பாடியவர்</dt><dd>{poem.poet ?? <span className="muted">மூலப் பக்கத்தில் குறிப்பிடப்படவில்லை</span>}</dd></div>
          </dl>
        </header>

        <nav className="poem__nav" aria-label="பாடல்கள் (மேல்)">
          {prev ? <Link to={poemPath(prev)} rel="prev">← {prev.number}</Link> : <span />}
          <Link to={`/works/${work.id}`}>{work.title} — பாடல் பட்டியல்</Link>
          {next ? <Link to={poemPath(next)} rel="next">{next.number} →</Link> : <span />}
        </nav>

        <div className="poem__bar">
          <LanguageSelector />
          <TextSizeControl size={textSize} onChange={setTextSize} />
          <p className="poem__hint">புள்ளிக்கோடிட்ட சொற்கள் அகராதியோடு இணைந்தவை; ஒன்றைத் தேர்ந்தெடுத்தால் அதன் பொருள் தோன்றும்.</p>
        </div>

        <div className="poem__text" ref={textRef}>
          <ol className="verse" lang="ta" style={verseSize ? ({ '--verse-size': verseSize } as React.CSSProperties) : undefined}>
            {lines.map((segs, i) => {
              const n = i + 1;
              return (
                <li key={n} id={`line-${n}`} tabIndex={-1} className={n === targetLine ? 'is-target' : undefined}>
                  <span className="verse__n" aria-hidden="true">{n % 5 === 0 || n === targetLine ? n : ''}</span>
                  <span className="verse__text">
                    {segs.map((sg, k) => (sg.citation ? (
                      <button
                        key={k}
                        type="button"
                        className={`word${sg.citation.id === targetCitation ? ' is-cited' : ''}${panel?.citation.id === sg.citation.id ? ' is-open' : ''}`}
                        data-cid={sg.citation.id}
                        aria-haspopup="dialog"
                        aria-expanded={panel?.citation.id === sg.citation.id}
                        aria-label={`${sg.text} — ${headwordLabel(entryById.get(sg.citation.entryId)!)}: பொருள் காண்க`}
                        onClick={(e) => {
                          const anchor = e.currentTarget;
                          setPanel((p) => (p?.citation.id === sg.citation!.id ? null : { citation: sg.citation!, anchor }));
                        }}
                      >
                        {sg.text}
                      </button>
                    ) : <span key={k}>{sg.text}</span>))}
                  </span>
                </li>
              );
            })}
          </ol>
          {panel && <WordPanel state={panel} onClose={close} />}
        </div>
        <hr className="ornament" />

        {poem.readings.length > 0 && (
          <section className="poem__readings" aria-labelledby="readings-title">
            <h2 id="readings-title" className="section-title">பாட வேறுபாடுகள் (மூலப் பக்கக் குறிப்பு)</h2>
            <ul>{poem.readings.map((r) => <li key={r.line} lang="ta">அடி {r.line}: {r.note}</li>)}</ul>
          </section>
        )}

        <section className="poem__source" aria-label="பதிப்பு">
          <p>பதிப்பு: {source ? <SourceName id={source.id} /> : poem.sourceId} · <ReviewTag status={poem.reviewStatus} what="பாடம்" /></p>
          <p className="muted">அச்சுப் பதிப்புடன் இன்னும் ஒப்பிடப்படவில்லை. அடி எண்கள் இந்த மூலப் பக்கத்தின் வரிப் பிரிப்பைப் பின்பற்றுகின்றன.</p>
          <div className="toolbar">
            <CopyButton
              text={() => `${work.title} ${poem.number}${targetLine ? `, அடி ${targetLine}` : ''}. ${source?.title ?? ''}. ${absoluteUrl(poemPath(poem, { line: targetLine || undefined }))}`}
              label="மேற்கோள் நகலெடு"
              done="மேற்கோள் நகலெடுக்கப்பட்டது"
            />
            <ReportDialog kind="poem" recordId={poem.id} reference={`${work.title} ${poem.number}`} />
          </div>
        </section>

        {wordEntries.length > 0 && (
          <section aria-labelledby="poem-words" className="poem__words">
            <h2 id="poem-words" className="section-title">இப்பாடலில் இணைக்கப்பட்ட சொற்கள்</h2>
            <ul className="entry-list">
              {wordEntries.map((c) => {
                const e = entryById.get(c.entryId)!;
                const s = c.senseId ? senseById.get(c.senseId)?.sense : undefined;
                return <EntryRow key={c.entryId} entry={e} sense={s} note={<>அடி {c.line}</>} />;
              })}
            </ul>
          </section>
        )}

        <nav className="pager" aria-label="பாடல்கள்">
          {prev ? <Link to={poemPath(prev)} rel="prev">← {work.title} {prev.number}</Link> : <span />}
          {next ? <Link to={poemPath(next)} rel="next">{work.title} {next.number} →</Link> : <span />}
        </nav>
      </div>
    </main>
  );
}
