import type { DictionaryEntry, LangCode, Sense } from '../types';
import { entryPath, headwordLabel } from '../data';
import { getSenseMeaning, LANGUAGE_LABEL } from './languages';

export const SITE_NAME = 'சொல்வளம் — தமிழ்ச் சொல்லகராதி';

export function absoluteUrl(path: string) {
  return new URL(path, window.location.origin).toString();
}

function today() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

/** Plain-text citation for an entry or one of its senses. */
export function citationText(entry: DictionaryEntry, sense?: Sense) {
  const parts = [
    `“${headwordLabel(entry)}”${entry.transliteration ? ` (${entry.transliteration})` : ''}`,
    sense ? `பொருள் ${sense.number}` : null,
    SITE_NAME,
    entry.status === 'reviewed' ? null : 'வரைவுப் பதிவு',
    absoluteUrl(entryPath(entry.id, sense?.id)),
    `அணுகிய நாள்: ${today()}`,
  ];
  return parts.filter(Boolean).join('. ') + '.';
}

/** Copy text, falling back to a hidden textarea where the async clipboard is unavailable. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

// ─── CSV export of saved words ───────────────────────────────────────────
const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function savedWordsCSV(rows: { entry: DictionaryEntry; sense: Sense; savedAt: string }[], lang: LangCode) {
  const header = ['headword', 'transliteration', 'part_of_speech', 'sense', 'meaning_language', 'meaning', 'tamil_definition', 'entry_link', 'saved_at'];
  const lines = rows.map(({ entry, sense, savedAt }) => {
    const m = getSenseMeaning(sense, lang);
    return [
      headwordLabel(entry), entry.transliteration ?? '', entry.partOfSpeech, sense.number,
      m.text ? LANGUAGE_LABEL[lang] : `${LANGUAGE_LABEL[lang]} (not yet added)`,
      m.text ?? '', sense.definition, absoluteUrl(entryPath(entry.id, sense.id)), savedAt.slice(0, 10),
    ].map(csvCell).join(',');
  });
  // BOM so spreadsheet programs read the Tamil text as UTF-8.
  return '﻿' + [header.join(','), ...lines].join('\r\n') + '\r\n';
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
