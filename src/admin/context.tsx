/** Shared admin state and helpers (kept apart from components for React fast refresh). */
import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { useUi } from '../context/UiLanguage';
import type { AdminData, Row, SaveResult } from './api';

// ─── Shared state ─────────────────────────────────────────────────────────
export type Issue = 'translit' | 'english' | 'languages';
export interface EntryInfo {
  row: Row;
  id: string;
  senses: Row[];
  /** English line of each sense, in sense order ('' when missing). */
  english: string[];
  citations: Row[];
  verified: number;
  issues: Issue[];
  topics: string[];
}
export interface Flash { kind: 'ok' | 'error' | 'info'; text: string; written?: string[]; errors?: string[]; stage?: 'saved' | 'built' }

export interface Ctx {
  data: AdminData;
  index: Map<string, EntryInfo>;
  infos: EntryInfo[];
  /** Run a write; on success replace the data and show where the change went. */
  run: (path: string, body: unknown, okText: string) => Promise<SaveResult | null>;
  reload: () => Promise<void>;
  flash: Flash | null;
  setFlash: (f: Flash | null) => void;
  busy: boolean;
  L: (ta: string, en: string) => string;
  sourceOrigin: (id: string) => string;
}
export const AdminContext = createContext<Ctx | null>(null);
export function useAdmin() {
  const c = useContext(AdminContext);
  if (!c) throw new Error('useAdmin outside AdminApp');
  return c;
}
export function useL() {
  const { ui } = useUi();
  return useCallback((ta: string, en: string) => (ui === 'ta' ? ta : en), [ui]);
}


/** The line with the attested form highlighted (first occurrence). */
export function highlight(line: string, form: string): ReactNode {
  const at = form ? line.normalize('NFC').indexOf(form) : -1;
  if (at < 0) return line;
  return <>{line.slice(0, at)}<mark>{line.slice(at, at + form.length)}</mark>{line.slice(at + form.length)}</>;
}
