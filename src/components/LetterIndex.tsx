import { useState } from 'react';
import { getAllInitialLetters } from '../utils/search';

interface LetterIndexProps {
  activeLetter?: string;
  onSelect: (letter: string) => void;
}

export default function LetterIndex({ activeLetter, onSelect }: LetterIndexProps) {
  const [expanded, setExpanded] = useState(false);
  const letters = getAllInitialLetters();

  return (
    <div className="letter-index">
      {/* Mobile toggle */}
      <button
        className="letter-index__toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="letter-index-letters"
      >
        <span>எழுத்து வரிசை</span>
        <svg
          width="16" height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '150ms' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Desktop label */}
      <div className="letter-index__label-row" aria-hidden="true">
        எழுத்து வரிசை
      </div>

      <ul
        id="letter-index-letters"
        className={`letter-index__letters${expanded ? ' letter-index__letters--open' : ''}`}
        role="list"
        aria-label="தமிழ் எழுத்துக்கள் வழி தேடு"
      >
        {letters.map((letter) => (
          <li key={letter} role="listitem">
            <button
              className={`letter-btn${activeLetter === letter ? ' letter-btn--active' : ''}`}
              onClick={() => onSelect(activeLetter === letter ? '' : letter)}
              aria-pressed={activeLetter === letter}
              aria-label={`${letter} எழுத்தில் தொடங்கும் சொற்கள்`}
            >
              {letter}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
