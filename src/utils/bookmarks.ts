const STORAGE_KEY = 'sangam:bookmarks';

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore persistence failures (private browsing, storage full, etc.)
  }
}

export function getBookmarkedIds(): string[] {
  return readIds();
}

export function isBookmarked(id: string): boolean {
  return readIds().includes(id);
}

export function toggleBookmark(id: string): boolean {
  const ids = readIds();
  const idx = ids.indexOf(id);
  if (idx >= 0) {
    ids.splice(idx, 1);
    writeIds(ids);
    return false;
  }
  ids.push(id);
  writeIds(ids);
  return true;
}
