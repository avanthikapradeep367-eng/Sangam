import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSuggestions } from '../utils/search';
import type { DictionaryEntry } from '../types';

interface SearchBarProps {
  initialValue?: string;
  autoFocus?: boolean;
  onSearch?: (query: string) => void;
}

export default function SearchBar({ initialValue = '', autoFocus = false, onSearch }: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<DictionaryEntry[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  const updateSuggestions = useCallback((val: string) => {
    const s = getSuggestions(val);
    setSuggestions(s);
    setOpen(s.length > 0 && val.trim().length > 0);
    setActiveIdx(-1);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    updateSuggestions(val);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter') doSearch(query);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        navigateToEntry(suggestions[activeIdx]);
      } else {
        doSearch(query);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  function navigateToEntry(entry: DictionaryEntry) {
    setOpen(false);
    setQuery(entry.headword);
    navigate(`/entry/${entry.id}`);
  }

  function doSearch(q: string) {
    setOpen(false);
    if (!q.trim()) return;
    if (onSearch) {
      onSearch(q.trim());
    } else {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="search-wrap" ref={wrapRef}>
      <input
        ref={inputRef}
        type="search"
        className="search-field"
        placeholder="ஒரு சொல்லைத் தேடுங்கள்"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0 && query.trim()) setOpen(true); }}
        aria-label="சொல் தேடு"
        aria-autocomplete="list"
        aria-controls={open ? 'search-suggestions' : undefined}
        aria-activedescendant={activeIdx >= 0 ? `suggestion-${activeIdx}` : undefined}
        autoComplete="off"
      />
      {query && (
        <button
          className="clear-btn"
          onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); inputRef.current?.focus(); }}
          aria-label="தேடலை அழி"
          tabIndex={-1}
        >
          ×
        </button>
      )}
      <button
        className="search-btn"
        onClick={() => doSearch(query)}
        aria-label="தேடு"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {open && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          className="suggestions"
          role="listbox"
          ref={listRef}
          aria-label="தேடல் பரிந்துரைகள்"
        >
          {suggestions.map((entry, idx) => (
            <li
              key={entry.id}
              id={`suggestion-${idx}`}
              className={`suggestions__item${activeIdx === idx ? ' suggestions__item--active' : ''}`}
              role="option"
              aria-selected={activeIdx === idx}
              onMouseDown={(e) => { e.preventDefault(); navigateToEntry(entry); }}
            >
              <span className="suggestions__word">{entry.headword}</span>
              <span className="suggestions__pos">{entry.partOfSpeech}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
