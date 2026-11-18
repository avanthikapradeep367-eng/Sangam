/**
 * One audio channel for the whole site: the headword speaker and "Read this page" never play at
 * the same time. Starting either stops the other; navigation stops both (see App). Nothing plays
 * until the reader presses a button.
 */
import { useSyncExternalStore } from 'react';
import { ApiError, describeError, getVoices, speechUrl, voiceFor, type VoiceInfo } from './azure';

const TAMIL = 'ta';

// ─── Headword pronunciation ────────────────────────────────────────────────
let wordAudio: HTMLAudioElement | null = null;

/** Pronounce a Tamil headword with the Tamil voice (ta-IN-PallaviNeural), whatever the display language. */
export async function pronounceTamil(text: string, onEnd: () => void): Promise<void> {
  reader.stop();
  stopWord();
  const url = await speechUrl(text, { lang: TAMIL });
  const audio = new Audio(url);
  wordAudio = audio;
  audio.addEventListener('ended', onEnd);
  audio.addEventListener('pause', onEnd);
  await audio.play();
}

export function stopWord() {
  wordAudio?.pause();
  wordAudio = null;
}

// ─── Read this page ────────────────────────────────────────────────────────
export type ReaderStatus = 'idle' | 'preparing' | 'playing' | 'paused';
export interface ReaderState { status: ReaderStatus; message: string; part: number; parts: number }

interface Segment { text: string; lang: string }

/** Parts of the page that are controls or chrome, not content to read aloud. */
const SKIP = [
  'script', 'style', 'noscript', 'button', 'select', 'option', 'input', 'textarea', 'svg', 'code', 'sup',
  '[aria-hidden="true"]', '.visually-hidden', '[data-noread]', '[data-has-translation]',
  '.leaf-tools', '.pane-tabs', '.crumbs', '.breadcrumb', '.origin-tag', '.review-tag', '.collection-tag', '.ribbon',
  '.mt-tag', '.mt--loading', '.mt-notice', '.note-src', '.citation__tr-label', '.pron', '.prevnext', '.toolbar', '.entry-leaf__src',
].join(',');
const MAX_SEGMENT = 900;

function blockOf(el: Element): Element {
  let cur: Element | null = el;
  while (cur && cur.parentElement && getComputedStyle(cur).display.startsWith('inline')) cur = cur.parentElement;
  return cur ?? el;
}

function isVisible(el: Element) {
  const check = (el as HTMLElement).checkVisibility;
  return typeof check === 'function' ? check.call(el, { checkOpacity: true, checkVisibilityCSS: true }) : true;
}

/** The visible text of `root` in reading order, split where the language or the block changes. */
export function collectSegments(root: Element): Segment[] {
  const out: (Segment & { block: Element })[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let lastEl: Element | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.replace(/[→←↑↓›‹·•|]/g, ' ').replace(/\s+/g, ' ') ?? '';
    if (!text.trim()) continue;
    const el = node.parentElement;
    if (!el || el.closest(SKIP) || !isVisible(el)) continue;
    let lang = el.closest('[lang]')?.getAttribute('lang') || document.documentElement.lang || TAMIL;
    // Untagged text in Tamil script (labels, references) is Tamil, whatever the interface language.
    if (!lang.startsWith(TAMIL) && /[஀-௿]/.test(text) && !/[A-Za-z]/.test(text)) lang = TAMIL;
    if (/-latn$/i.test(lang) && lang.startsWith('ta')) continue; // romanized Tamil (transliteration): not read
    const block = blockOf(el);
    const last = out[out.length - 1];
    // Separate elements (a verse line and its reference link) get a space between them; a
    // highlighted part of a word (<mark>) joins its word directly.
    const joiner = lastEl && lastEl !== el && el.tagName !== 'MARK' && lastEl.tagName !== 'MARK' ? ' ' : '';
    lastEl = el;
    if (last && last.block === block && (last.lang === lang || !/\p{L}/u.test(text))) last.text += joiner + text;
    else out.push({ text, lang, block });
  }
  // Tidy and split long passages at sentence ends.
  const segments: Segment[] = [];
  for (const s of out) {
    let rest = s.text.trim();
    while (rest.length > MAX_SEGMENT) {
      const cut = Math.max(rest.lastIndexOf('. ', MAX_SEGMENT), rest.lastIndexOf('; ', MAX_SEGMENT), rest.lastIndexOf(' ', MAX_SEGMENT));
      const at = cut > 200 ? cut + 1 : MAX_SEGMENT;
      segments.push({ text: rest.slice(0, at).trim(), lang: s.lang });
      rest = rest.slice(at).trim();
    }
    if (/[\p{L}\p{N}]/u.test(rest)) segments.push({ text: rest, lang: s.lang });
  }
  return segments;
}

const languageName = (code: string) => {
  try { return new Intl.DisplayNames(['ta'], { type: 'language' }).of(code) ?? code; } catch { return code; }
};

function createReader() {
  let state: ReaderState = { status: 'idle', message: '', part: 0, parts: 0 };
  const listeners = new Set<() => void>();
  let run = 0;
  let audio: HTMLAudioElement | null = null;
  const set = (patch: Partial<ReaderState>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

  async function play() {
    const id = ++run;
    stopWord();
    const root = document.getElementById('main-content');
    if (!root) { set({ status: 'idle', message: 'படிக்க உள்ளடக்கம் இல்லை' }); return; }
    set({ status: 'preparing', message: 'தயாராகிறது…', part: 0, parts: 0 });

    let voices: Record<string, VoiceInfo>;
    try { voices = await getVoices(); } catch (e) {
      if (id === run) set({ status: 'idle', message: `ஒலி கிடைக்கவில்லை: ${describeError(e, 'speech')}` });
      return;
    }
    if (id !== run) return;

    const all = collectSegments(root);
    const unvoiced = new Set<string>();
    const playable = all.filter((s) => {
      const ok = s.lang.startsWith(TAMIL) ? Boolean(voices.ta) : Boolean(voiceFor(voices, s.lang));
      if (!ok) unvoiced.add(s.lang);
      return ok;
    });
    const note = unvoiced.size ? `ஒலி இல்லாத மொழி: ${[...unvoiced].map(languageName).join(', ')} — அப்பகுதி படிக்கப்படாது` : '';
    if (!playable.length) { set({ status: 'idle', message: note || 'படிக்க உள்ளடக்கம் இல்லை' }); return; }

    const urlFor = (s: Segment) => (s.lang.startsWith(TAMIL)
      ? speechUrl(s.text, { lang: TAMIL })
      : speechUrl(s.text, { voice: voiceFor(voices, s.lang)!.voice }));

    set({ parts: playable.length });
    let next = urlFor(playable[0]);
    for (let i = 0; i < playable.length; i++) {
      let url: string;
      try { url = await next; } catch (e) {
        if (id === run) set({ status: 'idle', message: describeError(e, 'speech') });
        return;
      }
      if (id !== run) return;
      if (i + 1 < playable.length) { next = urlFor(playable[i + 1]); next.catch(() => {}); }
      audio = new Audio(url);
      set({ status: 'playing', part: i + 1, message: note });
      const finished = await new Promise<boolean>((resolve) => {
        const a = audio!;
        a.addEventListener('ended', () => resolve(true), { once: true });
        a.addEventListener('error', () => resolve(false), { once: true });
        a.addEventListener('abort', () => resolve(false), { once: true });
        a.dataset.run = String(id);
        void a.play().catch(() => resolve(false));
      });
      if (id !== run) return;
      if (!finished) { set({ status: 'idle', message: 'ஒலியை இயக்க இயலவில்லை' }); return; }
    }
    if (id === run) { audio = null; set({ status: 'idle', message: note, part: 0 }); }
  }

  return {
    get: () => state,
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
    play() { void play().catch((e) => set({ status: 'idle', message: describeError(e instanceof ApiError ? e : null, 'speech') })); },
    pause() { if (state.status === 'playing' && audio) { audio.pause(); set({ status: 'paused' }); } },
    resume() { if (state.status === 'paused' && audio) { void audio.play(); set({ status: 'playing' }); } },
    stop() {
      run++;
      if (audio) { audio.pause(); audio.src = ''; audio = null; }
      if (state.status !== 'idle' || state.message) set({ status: 'idle', message: '', part: 0, parts: 0 });
    },
  };
}

export const reader = createReader();

export function useReader(): ReaderState {
  return useSyncExternalStore(reader.subscribe, reader.get, reader.get);
}

// Development aid: inspect what "Read this page" would read (window.__readerSegments()).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __readerSegments: () => Segment[] }).__readerSegments = () => {
    const root = document.getElementById('main-content');
    return root ? collectSegments(root) : [];
  };
}
