import { Link, useSearchParams } from 'react-router-dom';
import type { BrowseFilters, SearchScope } from '../types';
import { AKAM_TINAI, COLLECTION_LABEL, COLLECTION_SHORT, PARTS_OF_SPEECH, coverage, entryPath, headwordLabel, poemPath, poemRef, topicById, topics, works, poemsByWork } from '../data';
import {
  browse, defaultScopeFor, FORM_LABEL, hasFilters, searchMeanings, searchPoems, searchWords, spellingSuggestions,
} from '../utils/search';
import type { MeaningResult } from '../utils/search';
import { useState } from 'react';
import { useMeaningLanguage } from '../context/LanguageContext';
import EntryRow from '../components/EntryRow';
import LetterIndex, { LetterRail } from '../components/LetterIndex';
import LanguageSelector from '../components/LanguageSelector';
import { Breadcrumb, EmptyState, Marked } from '../components/common';
import { LANGUAGE_LABEL, truncate } from '../utils/languages';
import { normalize } from '../utils/tamil';
import { usePageTitle } from '../utils/usePageTitle';

const SCOPES: { id: SearchScope; label: string; hint: string }[] = [
  { id: 'word', label: 'சொல்', hint: 'தலைச்சொல், மாற்று எழுத்துக்கூட்டு, சொல் வடிவம், பேச்சு வழக்கு வடிவம், ஆங்கில எழுத்தில்' },
  { id: 'meaning', label: 'பொருள்', hint: 'தமிழ், English, हिन्दी, മലയാളം, తెలుగు பொருள்களில்' },
  { id: 'poem', label: 'பாடல்', hint: 'பாடல் வரிகளில்' },
];

const FILTER_KEYS = ['letter', 'work', 'pos', 'tinai', 'topic', 'src'] as const;

function MeaningHit({ r, lang }: { r: MeaningResult; lang: string }) {
  const q = normalize(useSearchParams()[0].get('q') ?? '');
  const t = r.text;
  const at = normalize(t).indexOf(q);
  return (
    <EntryRow
      entry={r.entry}
      sense={r.sense}
      note={r.lang === lang ? <>பொருந்தியது: {LANGUAGE_LABEL[r.lang]} பொருள்</> : <>பொருந்தியது ({LANGUAGE_LABEL[r.lang]}): <span lang={r.lang}><Marked text={truncate(t, 120)} ranges={at >= 0 && at + q.length <= 120 ? [[at, at + q.length]] : []} /></span></>}
    />
  );
}

export default function SearchResultsPage() {
  const [params, setParams] = useSearchParams();
  const [lang] = useMeaningLanguage();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const q = (params.get('q') ?? '').trim();
  const scopeParam = params.get('scope') as SearchScope | null;
  const scope: SearchScope = scopeParam && SCOPES.some((s) => s.id === scopeParam) ? scopeParam : (q ? defaultScopeFor(q) : 'word');
  const filters: BrowseFilters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined]).filter(([, v]) => v));
  usePageTitle(q ? `“${q}” — தேடல்` : 'உலாவுக');

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };
  // Letter links filter the current results (and clear the letter when it is already chosen).
  const letterHref = (l: string) => {
    const next = new URLSearchParams(params);
    if (filters.letter === l) next.delete('letter'); else next.set('letter', l);
    return `/search?${next.toString()}`;
  };
  const scopeHref = (s: SearchScope) => {
    const next = new URLSearchParams(params);
    next.set('scope', s);
    return `/search?${next.toString()}`;
  };
  const clearFilters = () => {
    const next = new URLSearchParams(params);
    FILTER_KEYS.forEach((k) => next.delete(k));
    setParams(next);
  };

  const words = q && scope === 'word' ? searchWords(q, filters) : [];
  const meanings = q && (scope === 'meaning' || (scope === 'word' && words.length === 0)) ? searchMeanings(q, lang, filters) : [];
  const poemHits = q && scope === 'poem' ? searchPoems(q, filters) : [];
  const browsed = !q ? browse(filters) : [];
  const suggestions = q && scope !== 'poem' ? spellingSuggestions(q).filter((e) => !words.some((w) => w.entry.id === e.id)) : [];

  const count = scope === 'word' ? (words.length || meanings.length) : scope === 'meaning' ? meanings.length : poemHits.length;
  const filterLabel = [
    filters.letter && `எழுத்து: ${filters.letter}`,
    filters.work && `நூல்: ${works.find((w) => w.id === filters.work)?.title}`,
    filters.pos && `சொல் வகை: ${filters.pos}`,
    filters.tinai && `திணை: ${filters.tinai}`,
    filters.topic && `தலைப்பு: ${topicById.get(filters.topic)?.label}`,
    filters.src && `அகராதி: ${COLLECTION_SHORT[filters.src]}`,
  ].filter(Boolean).join(' · ');

  const title = q ? <>“<span lang="ta">{q}</span>” — தேடல் முடிவுகள்</> : filters.letter ? `“${filters.letter}” எழுத்தில் தொடங்கும் சொற்கள்` : 'சொற்களை உலாவுக';

  return (
    <main id="main-content" className="page search-page">
      <div className="container container--wide">
        <Breadcrumb items={[{ to: '/', label: 'அகராதி' }, { label: q ? 'தேடல்' : 'உலாவுக' }]} running={filters.letter ? `எழுத்து: ${filters.letter}` : undefined} />
        <h1 className="page-title">{title}</h1>

        {q && (
          <nav className="scope-tabs" aria-label="தேடல் வகை">
            {SCOPES.map((s) => (
              <Link key={s.id} to={scopeHref(s.id)} aria-current={scope === s.id ? 'page' : undefined} title={s.hint}>
                {s.label}
              </Link>
            ))}
          </nav>
        )}

        <div className={`search-layout${scope === 'poem' ? ' search-layout--no-rail' : ''}`}>
          {scope !== 'poem' && <LetterRail active={filters.letter} hrefFor={letterHref} />}
          {scope !== 'poem' && (
            <div className="search-layout__index-mobile">
              <LetterIndex active={filters.letter} hrefFor={letterHref} title="எழுத்து வாரியாக வடிகட்டு" />
            </div>
          )}
          <div className="search-layout__main">
            <div className="results-bar">
              <p className="results-count" role="status">
                {q ? `${count} முடிவுகள்` : `${browsed.length} சொற்கள்`}
                {filterLabel && <> · {filterLabel}</>}
              </p>
              <LanguageSelector />
            </div>

            {/* Word scope */}
            {scope === 'word' && words.length > 0 && (
              <ul className="entry-list">
                {words.map((r) => (
                  <EntryRow
                    key={r.entry.id}
                    entry={r.entry}
                    note={r.via && (r.via.kind === 'roman'
                      ? <>ஒலிபெயர்ப்பு: <span lang="en">{r.via.form}</span></>
                      : <><span lang="ta">{r.via.form}</span> → {FORM_LABEL[r.via.kind]}</>)}
                  />
                ))}
              </ul>
            )}
            {scope === 'word' && q && words.length === 0 && meanings.length > 0 && (
              <>
                <p className="section-note">இது தலைச்சொல்லாகக் கிடைக்கவில்லை. பொருள்களில் பொருந்தியவை:</p>
                <ul className="entry-list">{meanings.map((r) => <MeaningHit key={r.sense.id} r={r} lang={lang} />)}</ul>
              </>
            )}

            {/* Meaning scope */}
            {scope === 'meaning' && meanings.length > 0 && (
              <ul className="entry-list">{meanings.map((r) => <MeaningHit key={r.sense.id} r={r} lang={lang} />)}</ul>
            )}

            {/* Poem scope */}
            {scope === 'poem' && poemHits.length > 0 && (
              <ul className="poem-hits">
                {poemHits.map((h) => (
                  <li key={`${h.poem.id}-${h.line}`}>
                    <span className="poem-hits__line" lang="ta"><Marked text={h.text} ranges={h.range ? [h.range] : []} /></span>
                    <Link to={poemPath(h.poem, { line: h.line })} className="poem-hits__ref">{poemRef(h.poem, h.line)}</Link>
                  </li>
                ))}
              </ul>
            )}

            {/* Browse */}
            {!q && browsed.length > 0 && (
              <ul className="entry-list">{browsed.map((e) => <EntryRow key={e.id} entry={e} />)}</ul>
            )}

            {/* Empty states with a way forward */}
            {((q && count === 0) || (!q && browsed.length === 0)) && (
              <EmptyState title={q ? `“${q}” — பொருத்தம் எதுவும் இல்லை` : 'இந்த வடிகட்டிகளுக்குச் சொற்கள் இல்லை'}>
                {suggestions.length > 0 && (
                  <p>
                    இவற்றில் ஒன்றா?{' '}
                    {suggestions.map((e, i) => (
                      <span key={e.id}>{i > 0 && ' · '}<Link to={entryPath(e.id)} lang="ta">{headwordLabel(e)}</Link></span>
                    ))}
                  </p>
                )}
                <ul className="recovery">
                  {q && scope !== 'meaning' && <li><Link to={scopeHref('meaning')}>பொருள்களில் தேடுக</Link></li>}
                  {q && scope !== 'poem' && <li><Link to={scopeHref('poem')}>பாடல் வரிகளில் தேடுக</Link></li>}
                  {hasFilters(filters) && <li><button type="button" className="link-btn" onClick={clearFilters}>வடிகட்டிகளை நீக்குக</button></li>}
                  <li><Link to="/letters">எழுத்து வரிசையில் உலாவுக</Link></li>
                </ul>
                <p className="muted">
                  இக்களஞ்சியம்: சங்கச் சொற்கள் {coverage.collections.sangam}, நவீனத் தமிழ்ச் சொற்கள் {coverage.collections.modern.total}, {Object.values(coverage.works).reduce((n, w) => n + w.poems, 0)} பாடல்கள்.{' '}
                  <Link to="/sources">முழு விவரம்</Link>
                </p>
              </EmptyState>
            )}

            {q && suggestions.length > 0 && count > 0 && scope !== 'poem' && (
              <p className="section-note">
                ஒத்த எழுத்துக்கூட்டுள்ள பிற சொற்கள்:{' '}
                {suggestions.map((e, i) => <span key={e.id}>{i > 0 && ' · '}<Link to={entryPath(e.id)} lang="ta">{headwordLabel(e)}</Link></span>)}
              </p>
            )}
          </div>

          <aside className={`search-layout__filters${filtersOpen || hasFilters(filters) ? ' is-open' : ''}`} aria-labelledby="filters-title">
            <h2 id="filters-title" className="aside-title">வடிகட்டு</h2>
            <button type="button" className="filters-toggle link-btn" aria-expanded={filtersOpen || hasFilters(filters)} aria-controls="filter-fields" onClick={() => setFiltersOpen((o) => !o)}>
              {filtersOpen || hasFilters(filters) ? 'மறை' : 'அகராதி, நூல், திணை, சொல் வகை, தலைப்பு'}
            </button>
            <div id="filter-fields" className="filter-fields">
            <label className="field">
              <span>அகராதி</span>
              <select value={filters.src ?? ''} onChange={(e) => setParam('src', e.target.value || null)}>
                <option value="">எல்லாம்</option>
                <option value="sangam">{COLLECTION_LABEL.sangam}</option>
                <option value="modern">{COLLECTION_LABEL.modern}</option>
              </select>
            </label>
            <label className="field">
              <span>நூல்</span>
              <select value={filters.work ?? ''} onChange={(e) => setParam('work', e.target.value || null)}>
                <option value="">எல்லா நூல்களும்</option>
                {works.filter((w) => poemsByWork.has(w.id)).map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
              </select>
            </label>
            <label className="field">
              <span>திணை</span>
              <select value={filters.tinai ?? ''} onChange={(e) => setParam('tinai', e.target.value || null)}>
                <option value="">எல்லாத் திணைகளும்</option>
                {AKAM_TINAI.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            {scope !== 'poem' && (
              <>
                <label className="field">
                  <span>சொல் வகை</span>
                  <select value={filters.pos ?? ''} onChange={(e) => setParam('pos', e.target.value || null)}>
                    <option value="">எல்லாம்</option>
                    {PARTS_OF_SPEECH.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>தலைப்பு</span>
                  <select value={filters.topic ?? ''} onChange={(e) => setParam('topic', e.target.value || null)}>
                    <option value="">எல்லாம்</option>
                    <optgroup label="சங்கச் சொல்லகராதி">
                      {topics.filter((t) => t.scheme === 'sangam').map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </optgroup>
                    <optgroup label="நவீனத் தமிழ்ச் சொற்கள்">
                      {topics.filter((t) => t.scheme === 'modern').map((t) => <option key={t.id} value={t.id}>{t.code} {t.label}</option>)}
                    </optgroup>
                  </select>
                </label>
              </>
            )}
            {filters.letter && (
              <p className="field-note">எழுத்து: <strong lang="ta">{filters.letter}</strong> <button type="button" className="link-btn" onClick={() => setParam('letter', null)}>நீக்கு</button></p>
            )}
            {hasFilters(filters) && <button type="button" className="link-btn" onClick={clearFilters}>எல்லா வடிகட்டிகளையும் நீக்கு</button>}
            <p className="field-note">திணை வடிகட்டி: சொற்களுக்கு, திணையோடு குறிக்கப்பட்ட சொற்கள் மட்டும்; பாடல்களுக்கு, மூலப் பக்கத்தில் திணை தரப்பட்டவை மட்டும்.</p>
            </div>
          </aside>
        </div>

      </div>
    </main>
  );
}
