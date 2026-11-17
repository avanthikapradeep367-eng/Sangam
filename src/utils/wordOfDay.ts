/**
 * Word of the day: one Sangam word per calendar day, the same for every visitor on that date.
 *
 * Only words with a featured quotation are used, so each day's word comes with a real line
 * from an indexed poem. The pool is shuffled once with a fixed seed and walked one step per
 * day, so no word repeats until the whole pool has been shown.
 */
import type { Citation, DictionaryEntry } from '../types';
import { citationsByEntry, entries } from '../data';

export interface DailyWord {
  date: Date;
  entry: DictionaryEntry;
  quote: Citation;
}

const featured = (e: DictionaryEntry) => (citationsByEntry.get(e.id) ?? []).find((c) => c.featured);

/** Deterministic PRNG (mulberry32) so the order is the same for everyone. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POOL: DictionaryEntry[] = (() => {
  const pool = entries
    .filter((e) => e.collection === 'sangam' && !e.supersededBy && featured(e))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const rand = rng(20261118);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
})();

/** Days since 1 Jan 2026 in the visitor's own calendar (so the word changes at local midnight). */
function dayNumber(d: Date) {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 86_400_000);
}

export function wordForDate(date: Date): DailyWord | null {
  if (!POOL.length) return null;
  const n = dayNumber(date);
  const entry = POOL[((n % POOL.length) + POOL.length) % POOL.length];
  return { date, entry, quote: featured(entry)! };
}

/** Today's word and the `count - 1` days before it, newest first. */
export function recentWords(count: number, today = new Date()): DailyWord[] {
  const out: DailyWord[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const w = wordForDate(d);
    if (w) out.push(w);
  }
  return out;
}

export const DAILY_POOL_SIZE = POOL.length;

/** YYYY-MM-DD in local time, for URLs. */
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Parse a YYYY-MM-DD URL value as a local date; null if malformed. */
export function parseIsoDate(s: string | null): Date | null {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) || isoDate(d) !== s ? null : d;
}

const TA_MONTHS = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
const TA_DAYS = ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];

export function tamilDate(d: Date, withDay = true) {
  return `${withDay ? `${TA_DAYS[d.getDay()]}, ` : ''}${d.getDate()} ${TA_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
