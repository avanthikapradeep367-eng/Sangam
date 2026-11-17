import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSuggestions, FORM_LABEL } from '../utils/search';
import type { WordResult } from '../utils/search';
import { entryPath, headwordLabel } from '../data';
import { useMeaningLanguage } from '../context/LanguageContext';
import { previewMeaning, truncate } from '../utils/languages';

interface Props {
  compact?: boolean;
  autoFocus?: boolean;
  /** Visible label above the field (the compact header field keeps its label for screen readers only). */
  label?: string;
}

/**
 * Search field with an ARIA 1.2 combobox: arrow keys move through suggestions, Enter opens
 * the highlighted entry or runs a full search, Escape closes. Keys pressed while an input
 * method is composing Tamil text are ignored, so a half-typed syllable is never submitted.
 */
export default function SearchBar({ compact = false, autoFocus = false, label }: Props) {
  const [params] = useSearchParams();
  const urlQuery = params.get('q') ?? '';
  const [query, setQuery] = useState(urlQuery);
  const [composing, setComposing] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const [lang] = useMeaningLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => { setQuery(urlQuery); }, [urlQuery]);

  const suggestions: WordResult[] = query.trim() && !composing ? getSuggestions(query) : [];
  const showList = open && suggestions.length > 0;

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function submit() {
    const q = query.trim();
    setOpen(false);
    if (!q) { inputRef.current?.focus(); return; }
    // Keep the current scope and filters when searching again from the results page.
    const next = new URLSearchParams(window.location.pathname === '/search' ? params : undefined);
    next.set('q', q);
    navigate(`/search?${next.toString()}`);
  }

  function choose(r: WordResult) {
    setOpen(false);
    setQuery('');
    navigate(entryPath(r.entry.id));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing || composing || e.keyCode === 229) return;
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showList && active >= 0) choose(suggestions[active]);
      else submit();
    } else if (e.key === 'Escape') {
      if (showList) { e.preventDefault(); setOpen(false); setActive(-1); }
      else if (query) { e.preventDefault(); setQuery(''); }
    }
  }

  return (
    <div className={`search${compact ? ' search--compact' : ''}`} ref={wrapRef}>
      <form role="search" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label htmlFor={`${listId}-input`} className={label ? 'search__label' : 'visually-hidden'}>
          {label ?? 'சொல், பொருள் அல்லது பாடல் வரியைத் தேடுக'}
        </label>
        <div className="search__row">
        <input
          id={`${listId}-input`}
          ref={inputRef}
          type="search"
          className="search__field"
          placeholder={compact ? 'தேடுக' : 'சொல் அல்லது பொருள் — எ.கா. நெஞ்சம், heart'}
          value={query}
          lang="ta"
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(e) => { setComposing(false); setQuery(e.currentTarget.value); setOpen(true); }}
        />
        {query && (
          <button
            type="button"
            className="search__clear"
            aria-label="தேடலை அழி"
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
        <button type="submit" className="search__submit" aria-label={compact ? 'தேடு' : undefined}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><line x1="20" y1="20" x2="16" y2="16" />
          </svg>
          {!compact && <span>தேடு</span>}
        </button>
        </div>
      </form>

      <ul id={listId} role="listbox" aria-label="பரிந்துரைகள்" className="search__list" hidden={!showList}>
        {suggestions.map((r, i) => {
          const p = previewMeaning(r.entry, lang);
          return (
            <li
              key={r.entry.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : undefined}
              onMouseDown={(e) => { e.preventDefault(); choose(r); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="search__word" lang="ta">{headwordLabel(r.entry)}</span>
              {r.via && (
                <span className="search__via">
                  ← <span lang={r.via.kind === 'roman' ? 'en' : 'ta'}>{r.via.form}</span>
                  {r.via.kind !== 'roman' && <> ({FORM_LABEL[r.via.kind]})</>}
                </span>
              )}
              <span className="search__gloss" lang={p.lang}>{truncate(p.text, 48)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
