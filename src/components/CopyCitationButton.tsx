import { useState } from 'react';
import type { DictionaryEntry } from '../types';

function buildCitation(entry: DictionaryEntry): string {
  const url = `${window.location.origin}/entry/${entry.id}`;
  return `"${entry.headword}" (${entry.partOfSpeech}). சங்கச் சொல் — சங்க இலக்கியச் சொற்களஞ்சியம். ${url}`;
}

export default function CopyCitationButton({ entry }: { entry: DictionaryEntry }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(buildCitation(entry));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently no-op rather than throwing in the UI
    }
  }

  return (
    <button type="button" className="tool-btn" onClick={handleClick}>
      <span aria-hidden="true">⧉</span>
      {copied ? 'நகலெடுக்கப்பட்டது' : 'மேற்கோள் நகலெடு'}
    </button>
  );
}
