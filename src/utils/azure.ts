/**
 * Browser side of the Azure features. Everything goes through this site's own /api routes
 * (server/api.mjs); no Azure key or Azure URL is ever used in the browser.
 */
import { useEffect, useState } from 'react';
import { languages as datasetLanguages } from '../data';

export interface ContentLanguage { code: string; name: string; nativeName: string; dir: 'ltr' | 'rtl' }
export interface VoiceInfo { voice: string; locale: string }

/** Why an Azure call failed, so the UI can say something useful. */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message?: string) { super(message ?? code); this.status = status; this.code = code; }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try { r = await fetch(path, init); } catch { throw new ApiError(0, 'network', 'Network error'); }
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new ApiError(r.status, body.error ?? 'http-error', body.message);
  }
  return r.json() as Promise<T>;
}

// ─── Languages ──────────────────────────────────────────────────────────────
/** Used when the server cannot reach Azure: the languages the dictionary itself has meanings in. */
const FALLBACK_LANGUAGES: ContentLanguage[] = datasetLanguages.map((l) => ({ code: l.code, name: l.englishName, nativeName: l.label, dir: 'ltr' }));

let languagesPromise: Promise<{ list: ContentLanguage[]; fromAzure: boolean }> | null = null;
export function getContentLanguages() {
  languagesPromise ??= api<{ languages: ContentLanguage[] }>('/api/languages')
    .then((d) => ({ list: d.languages, fromAzure: true }))
    .catch(() => ({ list: FALLBACK_LANGUAGES, fromAzure: false }));
  return languagesPromise;
}

export function useContentLanguages() {
  const [state, setState] = useState<{ list: ContentLanguage[]; fromAzure: boolean; loading: boolean }>(
    { list: FALLBACK_LANGUAGES, fromAzure: false, loading: true });
  useEffect(() => {
    let live = true;
    void getContentLanguages().then((r) => { if (live) setState({ ...r, loading: false }); });
    return () => { live = false; };
  }, []);
  return state;
}

// ─── Voices ─────────────────────────────────────────────────────────────────
let voicesPromise: Promise<Record<string, VoiceInfo>> | null = null;
/** translator code → neural voice. Rejects (ApiError) when Azure Speech is not available. */
export function getVoices() {
  voicesPromise ??= api<{ voices: Record<string, VoiceInfo> }>('/api/voices').then((d) => d.voices);
  voicesPromise.catch(() => { voicesPromise = null; }); // allow a retry later
  return voicesPromise;
}
export function voiceFor(voices: Record<string, VoiceInfo>, lang: string): VoiceInfo | undefined {
  return voices[lang] ?? voices[lang.split('-')[0]];
}

// ─── Translation ────────────────────────────────────────────────────────────
const translated = new Map<string, string>();
const MAX_TEXTS = 50;
const MAX_CHARS = 4500;

/** Translate Tamil texts into `to`; batched to the server's limits, cached for the session. */
export async function translateTexts(texts: string[], to: string, from = 'ta'): Promise<string[]> {
  const key = (t: string) => `${from}|${to}|${t}`;
  const missing = [...new Set(texts.filter((t) => t.trim() && !translated.has(key(t))))];
  const batches: string[][] = [];
  let batch: string[] = [], chars = 0;
  for (const t of missing) {
    const text = t.slice(0, 1000);
    if (batch.length && (batch.length >= MAX_TEXTS || chars + text.length > MAX_CHARS)) { batches.push(batch); batch = []; chars = 0; }
    batch.push(text); chars += text.length;
  }
  if (batch.length) batches.push(batch);
  for (const b of batches) {
    const r = await api<{ translations: string[] }>('/api/translate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts: b, to, from }),
    });
    b.forEach((t, i) => translated.set(key(t), r.translations[i] ?? ''));
  }
  return texts.map((t) => (t.trim() ? translated.get(key(t.slice(0, 1000))) ?? '' : ''));
}

export type TranslationState =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'done'; texts: string[] }
  | { status: 'error'; error: ApiError };

/** Machine translations for `texts` into `to` (null = no translation wanted). */
export function useTranslations(texts: string[], to: string | null): TranslationState {
  const sig = to && texts.some((t) => t.trim()) ? `${to}\u0000${texts.join('\u0001')}` : '';
  const [state, setState] = useState<{ sig: string; value: TranslationState }>({ sig: '', value: { status: 'off' } });
  useEffect(() => {
    if (!sig || !to) return;
    let live = true;
    translateTexts(texts, to)
      .then((out) => { if (live) setState({ sig, value: { status: 'done', texts: out } }); })
      .catch((e) => { if (live) setState({ sig, value: { status: 'error', error: e instanceof ApiError ? e : new ApiError(0, 'unknown') } }); });
    return () => { live = false; };
    // `sig` captures texts and to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  if (!sig) return { status: 'off' };
  return state.sig === sig ? state.value : { status: 'loading' };
}

// ─── Speech ─────────────────────────────────────────────────────────────────
const audioUrls = new Map<string, Promise<string>>();
/** Object URL of Azure speech for `text`; lang 'ta' always uses the Tamil headword voice. */
export function speechUrl(text: string, opts: { lang?: string; voice?: string }): Promise<string> {
  const key = `${opts.voice ?? opts.lang}|${text}`;
  let p = audioUrls.get(key);
  if (!p) {
    p = (async () => {
      let r: Response;
      try {
        r = await fetch('/api/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, ...opts }) });
      } catch { throw new ApiError(0, 'network'); }
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new ApiError(r.status, body.error ?? 'http-error', body.message);
      }
      return URL.createObjectURL(await r.blob());
    })();
    p.catch(() => audioUrls.delete(key));
    audioUrls.set(key, p);
  }
  return p;
}

/** Short, readable reason for an Azure failure (Tamil, with the English in brackets for unclear cases). */
export function describeError(e: unknown, kind: 'translate' | 'speech'): string {
  const code = e instanceof ApiError ? e.code : 'unknown';
  if (code === 'translator-not-configured') return 'மொழிபெயர்ப்புச் சேவை அமைக்கப்படவில்லை (Azure Translator not configured)';
  if (code === 'speech-not-configured') return 'ஒலிச் சேவை அமைக்கப்படவில்லை (Azure Speech not configured)';
  if (code === 'rate-limited') return 'அதிக கோரிக்கைகள்; ஒரு நிமிடம் கழித்து முயலுங்கள்';
  if (code === 'no-voice') return 'இம்மொழிக்குக் குரல் இல்லை';
  if (code === 'network') return 'இணைய இணைப்புப் பிழை';
  return kind === 'translate' ? 'மொழிபெயர்ப்பு கிடைக்கவில்லை' : 'ஒலியை இயக்க இயலவில்லை';
}
