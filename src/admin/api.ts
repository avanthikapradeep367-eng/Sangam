/**
 * Client for the local admin API (scripts/admin/admin-plugin.mjs). It exists only under
 * `npm run dev`; production builds contain neither this code nor the endpoints.
 */
import type { Poem } from '../types';

export type Row = Record<string, string>;
export type Table = 'entries' | 'senses' | 'translations' | 'citations' | 'notes';
export const TABLES: Table[] = ['entries', 'senses', 'translations', 'citations', 'notes'];

export interface AdminSource { id: string; title: string; origin: 'book' | 'editor' | 'machine' | 'unknown'; kind: string }
export interface AdminData {
  token: string;
  tables: Record<Table, Row[]>;
  columns: Record<Table, string[]>;
  poems: (Poem & { file: string })[];
  works: { id: string; title: string; transliteration: string; poemCount: number | null }[];
  sources: AdminSource[];
  languages: { code: string; label: string; englishName: string; base?: boolean }[];
  topics: { id: string; label: string }[];
  wordOfDay: Record<string, string>;
  fingerprints: Record<string, string>;
  validation: { errors: string[]; warnings: string[] };
  site: { builtAt: number; needsRebuild: boolean; stale: string[] };
  vocabImported: number;
}

export interface SaveResult {
  ok: boolean;
  written?: string[];
  warnings?: string[];
  data?: AdminData;
  id?: string;
  log?: string;
}

export class AdminError extends Error {
  errors: string[];
  body: Record<string, unknown>;
  constructor(message: string, errors: string[] = [], body: Record<string, unknown> = {}) {
    super(message);
    this.errors = errors;
    this.body = body;
  }
}

export async function loadData(): Promise<AdminData> {
  const r = await fetch('/__admin/api/data', { cache: 'no-store' });
  const ct = r.headers.get('content-type') ?? '';
  if (!ct.includes('json')) throw new AdminError('The admin API is not running. Start the site with "npm run dev" on this computer.');
  const j = await r.json();
  if (!r.ok) throw new AdminError(j.error ?? `HTTP ${r.status}`);
  return j;
}

export async function post<T = SaveResult>(token: string, path: string, body: unknown): Promise<T> {
  const r = await fetch(`/__admin/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify(body),
  });
  const ct = r.headers.get('content-type') ?? '';
  const j = ct.includes('json') ? await r.json() : { error: `HTTP ${r.status}` };
  if (!r.ok) throw new AdminError(j.error ?? `HTTP ${r.status}`, j.errors ?? [], j);
  return j as T;
}

export const list = (s: string | undefined) => (s ? s.split('|').map((x) => x.trim()).filter(Boolean) : []);
export const isTamil = (s: string) => /[஀-௿]/.test(s);
