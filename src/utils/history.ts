import { useSyncExternalStore } from 'react';
import { storage } from './storage';

/** Recent searches, newest first, kept in this browser only. */
export interface HistoryItem { q: string; scope?: string; at: string }

const KEY = 'sangam:history';
const MAX = 50;
const listeners = new Set<() => void>();
let cache: HistoryItem[] | null = null;

function read(): HistoryItem[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(storage.get(KEY) ?? '[]');
    cache = Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.q === 'string') : [];
  } catch { cache = []; }
  return cache!;
}

function write(list: HistoryItem[]) {
  cache = list;
  storage.set(KEY, JSON.stringify(list));
  listeners.forEach((l) => l());
}

export const searchHistory = {
  list: read,
  add(q: string, scope?: string) {
    const query = q.trim();
    if (!query) return;
    write([{ q: query, scope, at: new Date().toISOString() }, ...read().filter((h) => h.q !== query)].slice(0, MAX));
  },
  remove(q: string) { write(read().filter((h) => h.q !== q)); },
  clear() { write([]); },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === KEY) { cache = null; listeners.forEach((l) => l()); } });
}

export function useSearchHistory(): HistoryItem[] {
  return useSyncExternalStore(searchHistory.subscribe, read, () => []);
}
