import { Link, useSearchParams } from 'react-router-dom';
import type { Collection, DictionaryEntry } from '../types';
import { entries } from '../data';
import EntryRow from '../components/EntryRow';
import LanguageSelector from '../components/LanguageSelector';
import { Breadcrumb, EmptyState } from '../components/common';
import {
  AYTHAM, GRANTHA_CONSONANTS, TAMIL_CONSONANTS, TAMIL_VOWELS, combine, indexLetter, initialSyllable,
} from '../utils/tamil';
import { usePageTitle } from '../utils/usePageTitle';

const PAGE_SIZE = 50;
const SOURCES: { id: Collection | ''; label: string }[] = [
  { id: '', label: 'எல்லா அகராதிகளும்' },
  { id: 'sangam', label: 'சங்கச் சொல்லகராதி' },
  { id: 'modern', label: 'நவீனத் தமிழ்' },
];

/** Counts per base letter and per first syllable, for one source filter. */
function countsFor(list: DictionaryEntry[]) {
  const byLetter = new Map<string, number>();
  const bySyllable = new Map<string, number>();
  for (const e of list) {
    const l = indexLetter(e.headword), s = initialSyllable(e.headword);
    byLetter.set(l, (byLetter.get(l) ?? 0) + 1);
    bySyllable.set(s, (bySyllable.get(s) ?? 0) + 1);
  }
  return { byLetter, bySyllable };
}

/** Vowel series of a consonant (க கா … கௌ) followed by the bare consonant (க்). */
const series = (c: string) => [...TAMIL_VOWELS.map((v) => combine(c, v)), combine(c, null)];

export default function LettersPage() {
  const [params] = useSearchParams();
  const active = params.get('l') ?? '';
  const src = (params.get('src') ?? '') as Collection | '';
  const pool = src ? entries.filter((e) => e.collection === src) : entries;
  const { byLetter, bySyllable } = countsFor(pool);

  const isBase = [...TAMIL_VOWELS, AYTHAM, ...TAMIL_CONSONANTS, ...GRANTHA_CONSONANTS].includes(active);
  const matches = active
    ? pool.filter((e) => (isBase ? indexLetter(e.headword) === active : initialSyllable(e.headword) === active))
    : [];
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(params.get('page')) || 1));
  const shown = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeBase = active ? indexLetter(active) : '';
  const granthaUsed = GRANTHA_CONSONANTS.filter((g) => (byLetter.get(g) ?? 0) > 0 || g === activeBase);
  usePageTitle(active ? `“${active}” — எழுத்து வரிசை` : 'எழுத்து வரிசை');

  const href = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v); else p.delete(k);
    if (!('page' in next)) p.delete('page');
    return `/letters?${p.toString()}`;
  };

  const letterLink = (l: string, n: number, big = false) => (
    n > 0 || l === active ? (
      <Link
        to={href({ l })}
        className={`letter${big ? '' : ' letter--small'}${l === active ? ' is-active' : ''}`}
        aria-current={l === active ? 'true' : undefined}
        aria-label={`${l} — ${n} சொற்கள்`}
        lang="ta"
      >
        <span>{l}</span><span className="letter__count">{n}</span>
      </Link>
    ) : (
      <span className={`letter${big ? '' : ' letter--small'} is-empty`} aria-label={`${l} — சொற்கள் இல்லை`} lang="ta">
        <span>{l}</span><span className="letter__count">0</span>
      </span>
    )
  );

  const consonantGroup = (c: string) => {
    const n = byLetter.get(c) ?? 0;
    return (
      <details className="consonant" key={c + (activeBase === c ? '-open' : '')} open={activeBase === c}>
        <summary>
          <span className="consonant__letter" lang="ta">{c}</span>
          <span className="letter__count">{n}</span>
          {n > 0 && <Link to={href({ l: c })} className="consonant__all" onClick={(e) => e.stopPropagation()}>எல்லாம்</Link>}
        </summary>
        <ul className="syllables" aria-label={`${c} உயிர்மெய் எழுத்துகள்`}>
          {series(c).map((s) => <li key={s}>{letterLink(s, bySyllable.get(s) ?? 0)}</li>)}
        </ul>
      </details>
    );
  };

  return (
    <main id="main-content" className="page letters-page">
      <div className="container container--wide">
        <Breadcrumb items={[{ to: '/', label: 'அகராதி' }, { label: 'எழுத்து வரிசை' }]} running={active ? `எழுத்து: ${active}` : undefined} />
        <h1 className="page-title">எழுத்து வரிசையில் உலாவுக</h1>
        <p className="page-lede">
          உயிர், ஆய்தம், மெய் எழுத்துகள். ஒரு மெய்யெழுத்தைத் திறந்தால் அதன் உயிர்மெய் எழுத்துகள் (க, கா, கி … க்) தெரியும்.
          எண்கள் ஒவ்வோர் எழுத்திலும் தொடங்கும் சொற்களின் எண்ணிக்கை. வரிசை: உயிர், ஆய்தம், மெய்; கிரந்த எழுத்துகள் ஜ ஶ ஷ ஸ “ச”வுக்குப் பின்னும், ஹ க்ஷ இறுதியிலும்.
        </p>

        <div className="chips" role="group" aria-label="அகராதி">
          {SOURCES.map((s) => (
            <Link key={s.id} to={href({ src: s.id || null })} className="chip" aria-current={src === s.id ? 'true' : undefined}>
              {s.label} ({s.id ? entries.filter((e) => e.collection === s.id).length : entries.length})
            </Link>
          ))}
        </div>

        <div className="letters-layout">
          <nav className="letter-groups" aria-label="எழுத்துகள்">
            <section aria-labelledby="g-uyir">
              <h2 id="g-uyir" className="section-label">உயிர் எழுத்துகள்</h2>
              <ul className="letter-grid">{TAMIL_VOWELS.map((v) => <li key={v}>{letterLink(v, byLetter.get(v) ?? 0, true)}</li>)}</ul>
            </section>
            <section aria-labelledby="g-aytham">
              <h2 id="g-aytham" className="section-label">ஆய்த எழுத்து</h2>
              <ul className="letter-grid"><li>{letterLink(AYTHAM, byLetter.get(AYTHAM) ?? 0, true)}</li></ul>
            </section>
            <section aria-labelledby="g-mey">
              <h2 id="g-mey" className="section-label">மெய் / உயிர்மெய் எழுத்துகள்</h2>
              <div className="consonants">{TAMIL_CONSONANTS.map((c) => <div key={c}>{consonantGroup(c)}</div>)}</div>
            </section>
            {granthaUsed.length > 0 && (
              <section aria-labelledby="g-grantha">
                <h2 id="g-grantha" className="section-label">கிரந்த எழுத்துகள் (இச்சொல்லகராதியில் வருபவை)</h2>
                <div className="consonants">{granthaUsed.map((c) => <div key={c}>{consonantGroup(c)}</div>)}</div>
              </section>
            )}
          </nav>

          <section className="letters-results" aria-labelledby="letters-results-title">
            {!active ? (
              <EmptyState title="ஓர் எழுத்தைத் தேர்ந்தெடுக்கவும்">
                <p>மொத்தம் {pool.length} சொற்கள். ஓர் எழுத்தைத் தேர்ந்தெடுத்தால் அதில் தொடங்கும் சொற்கள் இங்கே பட்டியலிடப்படும்.</p>
              </EmptyState>
            ) : (
              <>
                <div className="results-bar">
                  <h2 id="letters-results-title" className="section-title">
                    <span lang="ta">“{active}”</span> {isBase && TAMIL_CONSONANTS.concat(GRANTHA_CONSONANTS).includes(active) ? 'மெய்யில்' : ''} தொடங்கும் சொற்கள்
                  </h2>
                  <LanguageSelector />
                </div>
                <p className="results-count" role="status">
                  {matches.length === 0 ? '0 சொற்கள்' : `${matches.length} சொற்களில் ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, matches.length)}`}
                </p>
                {matches.length === 0 ? (
                  <EmptyState title={`“${active}” எழுத்தில் தொடங்கும் சொல் ${src ? 'இந்த அகராதியில்' : 'இன்னும்'} இல்லை`}>
                    {src && <p><Link to={href({ src: null })}>எல்லா அகராதிகளிலும் பார்க்க</Link></p>}
                  </EmptyState>
                ) : (
                  <ul className="entry-list">{shown.map((e) => <EntryRow key={e.id} entry={e} />)}</ul>
                )}
                {pages > 1 && (
                  <nav className="pager" aria-label="பக்கங்கள்">
                    {page > 1 ? <Link to={href({ page: String(page - 1) })} rel="prev">← முந்தைய</Link> : <span aria-hidden="true" />}
                    <ol>
                      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                        <li key={p}>
                          {p === page ? <span aria-current="page">{p}</span> : <Link to={href({ page: String(p) })} aria-label={`பக்கம் ${p}`}>{p}</Link>}
                        </li>
                      ))}
                    </ol>
                    {page < pages ? <Link to={href({ page: String(page + 1) })} rel="next">அடுத்த →</Link> : <span aria-hidden="true" />}
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
