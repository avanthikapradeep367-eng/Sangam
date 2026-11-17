import { useSyncExternalStore } from 'react';

/** localStorage that never throws (private mode, blocked storage, quota). */
export const storage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* not persisted */ }
  },
  remove(key: string) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

// ─── Saved words ─────────────────────────────────────────────────────────
export interface SavedWord {
  entryId: string;
  /** The sense the reader saved from, if they saved a specific sense. */
  senseId?: string;
  savedAt: string;
}

const SAVED_KEY = 'sangam:saved';
const LEGACY_KEY = 'sangam:bookmarks';
const listeners = new Set<() => void>();
let cache: SavedWord[] | null = null;

function read(): SavedWord[] {
  if (cache) return cache;
  let list: SavedWord[] = [];
  try {
    const raw = storage.get(SAVED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed.filter((x) => x && typeof x.entryId === 'string');
    } else {
      // Migrate bookmarks saved by the previous version of the site.
      const legacy = JSON.parse(storage.get(LEGACY_KEY) ?? '[]');
      if (Array.isArray(legacy)) list = legacy.filter((x) => typeof x === 'string').map((entryId) => ({ entryId, savedAt: new Date().toISOString() }));
    }
  } catch { list = []; }
  cache = list;
  return list;
}

function write(list: SavedWord[]) {
  cache = list;
  storage.set(SAVED_KEY, JSON.stringify(list));
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === SAVED_KEY) { cache = null; listeners.forEach((l) => l()); }
  });
}

export const savedWords = {
  list: read,
  isSaved: (entryId: string) => read().some((s) => s.entryId === entryId),
  add(entryId: string, senseId?: string) {
    if (read().some((s) => s.entryId === entryId)) return;
    write([...read(), { entryId, senseId, savedAt: new Date().toISOString() }]);
  },
  remove(entryId: string) { write(read().filter((s) => s.entryId !== entryId)); },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

export function useSavedWords(): SavedWord[] {
  return useSyncExternalStore(savedWords.subscribe, read, () => []);
}
