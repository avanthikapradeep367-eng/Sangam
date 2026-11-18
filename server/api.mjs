/**
 * Server-side Azure endpoints for சொல்வளம். Azure keys live only here (process environment),
 * never in the browser bundle. Used two ways:
 *   - development: mounted inside the Vite dev server (see vite.config.ts), so `npm run dev` is enough;
 *   - production:  served by server/index.mjs together with the built site in dist/.
 *
 * Routes (all JSON unless noted):
 *   GET  /api/status     → { translator: boolean, speech: boolean }   which services are configured
 *   GET  /api/languages  → { languages: [{ code, name, nativeName, dir }] }   Azure Translator's list
 *   GET  /api/voices     → { voices: { [translatorCode]: { voice, locale } } } one neural voice per language
 *   POST /api/translate  { texts: string[], to: string, from?: string } → { to, translations: string[] }
 *   POST /api/speak      { text: string, lang?: string, voice?: string } → audio/mpeg
 *
 * Requests are validated and size-limited; translations and audio are cached in memory; each client
 * IP has a small per-minute budget.
 */
import { createHash, randomUUID } from 'node:crypto';

/** The headword voice. Tamil text is always spoken with it, whatever the display language. */
export const TAMIL_VOICE = 'ta-IN-PallaviNeural';

const LIMITS = {
  bodyBytes: 64 * 1024,
  textsPerRequest: 50,
  charsPerText: 1000,
  charsPerTranslate: 5000,
  charsPerSpeak: 1000,
  translatePerMinute: 60,
  speakPerMinute: 60,
};
const DAY = 24 * 60 * 60 * 1000;
const DEFAULT_TRANSLATOR_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';

/**
 * Azure Translator language codes whose speech locale is not simply "<code>-…".
 * Everything else is matched by its primary subtag (hi → hi-IN, fr → fr-FR, …).
 */
const LOCALE_FOR_CODE = {
  'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW', yue: 'zh-HK', lzh: 'zh-CN',
  pt: 'pt-BR', 'pt-pt': 'pt-PT', 'fr-ca': 'fr-CA', 'sr-Cyrl': 'sr-RS', 'sr-Latn': 'sr-Latn-RS',
  'mn-Cyrl': 'mn-MN', nb: 'nb-NO', fil: 'fil-PH', iu: 'iu-Cans-CA', 'iu-Latn': 'iu-Latn-CA',
};
/** Preferred locale when a language has voices in several countries. */
const PREFERRED_LOCALE = { en: 'en-IN', es: 'es-ES', ar: 'ar-SA', de: 'de-DE', fr: 'fr-FR', it: 'it-IT', ur: 'ur-IN', bn: 'bn-IN', ta: 'ta-IN' };

// ─── Small helpers ──────────────────────────────────────────────────────────
class Lru {
  constructor(maxEntries, maxBytes = Infinity) { this.map = new Map(); this.maxEntries = maxEntries; this.maxBytes = maxBytes; this.bytes = 0; }
  get(key) {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    this.map.delete(key); this.map.set(key, hit);
    return hit.value;
  }
  set(key, value, size = 0) {
    if (this.map.has(key)) { this.bytes -= this.map.get(key).size; this.map.delete(key); }
    this.map.set(key, { value, size }); this.bytes += size;
    while (this.map.size > this.maxEntries || this.bytes > this.maxBytes) {
      const [oldest, entry] = this.map.entries().next().value;
      this.map.delete(oldest); this.bytes -= entry.size;
    }
  }
}

/** A value fetched at most once per `ttl`; concurrent callers share one request. */
function cached(ttl, load) {
  let value, at = 0, pending = null;
  return async () => {
    if (value !== undefined && Date.now() - at < ttl) return value;
    if (!pending) pending = load().then((v) => { value = v; at = Date.now(); return v; }).finally(() => { pending = null; });
    return pending;
  };
}

class HttpError extends Error {
  constructor(status, code, message) { super(message ?? code); this.status = status; this.code = code; }
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (!(req.headers['content-type'] ?? '').includes('application/json')) throw new HttpError(415, 'json-required');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > LIMITS.bodyBytes) throw new HttpError(413, 'body-too-large');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'invalid-json'); }
}

const isLangCode = (s) => typeof s === 'string' && /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4}){0,2}$/.test(s);
const escapeXml = (s) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (typeof fwd === 'string' && fwd.split(',')[0].trim()) || req.socket?.remoteAddress || 'unknown';
}

// ─── API factory ────────────────────────────────────────────────────────────
/**
 * @param {Record<string, string | undefined>} env  usually process.env (or Vite's loadEnv result in dev)
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next?: () => void) => Promise<void>}
 */
export function createApi(env) {
  const cfg = {
    translatorKey: env.AZURE_TRANSLATOR_KEY?.trim(),
    translatorRegion: env.AZURE_TRANSLATOR_REGION?.trim(),
    translatorEndpoint: (env.AZURE_TRANSLATOR_ENDPOINT?.trim() || DEFAULT_TRANSLATOR_ENDPOINT).replace(/\/+$/, ''),
    speechKey: env.AZURE_SPEECH_KEY?.trim(),
    speechRegion: env.AZURE_SPEECH_REGION?.trim(),
  };
  const hasTranslator = Boolean(cfg.translatorKey);
  const hasSpeech = Boolean(cfg.speechKey && cfg.speechRegion);

  const translationCache = new Lru(5000);
  const audioCache = new Lru(500, 40 * 1024 * 1024);
  const budgets = new Map(); // ip|kind → { count, windowStart }

  function spend(req, kind, perMinute) {
    const key = `${clientIp(req)}|${kind}`;
    const now = Date.now();
    const b = budgets.get(key);
    if (!b || now - b.windowStart > 60_000) { budgets.set(key, { count: 1, windowStart: now }); return; }
    if (++b.count > perMinute) throw new HttpError(429, 'rate-limited', 'Too many requests; try again in a minute.');
    if (budgets.size > 10_000) for (const [k, v] of budgets) if (now - v.windowStart > 60_000) budgets.delete(k);
  }

  // Azure Translator's language list is public (no key needed).
  const getLanguages = cached(DAY, async () => {
    const r = await fetch(`${cfg.translatorEndpoint}/languages?api-version=3.0&scope=translation`, { headers: { 'Accept-Language': 'en' } });
    if (!r.ok) throw new HttpError(502, 'languages-unavailable', `Translator languages: HTTP ${r.status}`);
    const data = await r.json();
    return Object.entries(data.translation ?? {}).map(([code, l]) => ({ code, name: l.name, nativeName: l.nativeName, dir: l.dir }));
  });

  const getVoiceList = cached(DAY, async () => {
    const r = await fetch(`https://${cfg.speechRegion}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
      headers: { 'Ocp-Apim-Subscription-Key': cfg.speechKey },
    });
    if (!r.ok) throw new HttpError(502, 'voices-unavailable', `Speech voices: HTTP ${r.status}`);
    const list = await r.json();
    // Single-language neural voices only, so each language is read with its own accent.
    return list.filter((v) => v.VoiceType === 'Neural' && !/Multilingual/i.test(v.ShortName));
  });

  /** translator code → { voice, locale } for every Translator language that has a neural voice. */
  const getVoiceMap = cached(DAY, async () => {
    const [voices, languages] = await Promise.all([getVoiceList(), getLanguages().catch(() => [])]);
    const byLocale = new Map();
    for (const v of voices) if (!byLocale.has(v.Locale)) byLocale.set(v.Locale, v.ShortName);
    const pick = (code) => {
      const exact = LOCALE_FOR_CODE[code];
      if (exact && byLocale.has(exact)) return exact;
      const primary = code.split('-')[0].toLowerCase();
      const preferred = PREFERRED_LOCALE[primary];
      if (preferred && byLocale.has(preferred)) return preferred;
      if (byLocale.has(`${primary}-IN`)) return `${primary}-IN`;
      return [...byLocale.keys()].find((l) => l.split('-')[0].toLowerCase() === primary);
    };
    const out = {};
    const codes = new Set([...languages.map((l) => l.code), 'ta', 'en']);
    for (const code of codes) {
      const locale = pick(code);
      if (locale) out[code] = { voice: byLocale.get(locale), locale };
    }
    if (voices.some((v) => v.ShortName === TAMIL_VOICE)) out.ta = { voice: TAMIL_VOICE, locale: 'ta-IN' };
    return { map: out, names: new Map(voices.map((v) => [v.ShortName, v.Locale])) };
  });

  async function translate(req) {
    if (!hasTranslator) throw new HttpError(503, 'translator-not-configured', 'Azure Translator is not configured on the server.');
    spend(req, 'translate', LIMITS.translatePerMinute);
    const body = await readJson(req);
    const { texts, to } = body ?? {};
    const from = body?.from ?? 'ta';
    if (!Array.isArray(texts) || texts.length === 0 || texts.length > LIMITS.textsPerRequest) throw new HttpError(400, 'invalid-texts');
    if (texts.some((t) => typeof t !== 'string' || t.length > LIMITS.charsPerText)) throw new HttpError(400, 'text-too-long');
    if (texts.reduce((n, t) => n + t.length, 0) > LIMITS.charsPerTranslate) throw new HttpError(413, 'request-too-long');
    if (!isLangCode(to) || !isLangCode(from)) throw new HttpError(400, 'invalid-language');
    const known = await getLanguages().catch(() => null);
    if (known && !known.some((l) => l.code === to)) throw new HttpError(400, 'unsupported-language');

    const key = (t) => `${from}|${to}|${t}`;
    const missing = [...new Set(texts.filter((t) => t.trim() && translationCache.get(key(t)) === undefined))];
    if (missing.length) {
      const url = `${cfg.translatorEndpoint}/translate?api-version=3.0&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&textType=plain`;
      const headers = { 'Ocp-Apim-Subscription-Key': cfg.translatorKey, 'Content-Type': 'application/json', 'X-ClientTraceId': randomUUID() };
      if (cfg.translatorRegion) headers['Ocp-Apim-Subscription-Region'] = cfg.translatorRegion;
      const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(missing.map((Text) => ({ Text }))) });
      if (!r.ok) throw new HttpError(502, 'translator-failed', `Azure Translator: HTTP ${r.status}`);
      const data = await r.json();
      missing.forEach((t, i) => translationCache.set(key(t), data[i]?.translations?.[0]?.text ?? ''));
    }
    return { to, from, provider: 'azure-translator', translations: texts.map((t) => (t.trim() ? translationCache.get(key(t)) ?? '' : '')) };
  }

  async function speak(req, res) {
    if (!hasSpeech) throw new HttpError(503, 'speech-not-configured', 'Azure Speech is not configured on the server.');
    spend(req, 'speak', LIMITS.speakPerMinute);
    const body = await readJson(req);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > LIMITS.charsPerSpeak) throw new HttpError(400, 'invalid-text');
    const { map, names } = await getVoiceMap();
    let voice;
    if (body.lang === 'ta' || body.voice === TAMIL_VOICE) voice = TAMIL_VOICE; // headwords: always Tamil
    else if (typeof body.voice === 'string') voice = body.voice;
    else if (isLangCode(body.lang)) voice = map[body.lang]?.voice;
    if (!voice || !names.has(voice)) throw new HttpError(400, 'no-voice', 'No Azure voice for this language.');
    const locale = names.get(voice);

    const cacheKey = createHash('sha256').update(`${voice}\n${text}`).digest('hex');
    let audio = audioCache.get(cacheKey);
    if (!audio) {
      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}"><voice name="${voice}">${escapeXml(text)}</voice></speak>`;
      const r = await fetch(`https://${cfg.speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': cfg.speechKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'solvalam-dictionary',
        },
        body: ssml,
      });
      if (!r.ok) throw new HttpError(502, 'speech-failed', `Azure Speech: HTTP ${r.status}`);
      audio = Buffer.from(await r.arrayBuffer());
      audioCache.set(cacheKey, audio, audio.length);
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(audio.length));
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.end(audio);
  }

  return async function api(req, res, next) {
    const url = new URL(req.url ?? '/', 'http://local');
    if (!url.pathname.startsWith('/api/')) return next ? next() : sendJson(res, 404, { error: 'not-found' });
    const route = `${req.method} ${url.pathname}`;
    try {
      switch (route) {
        case 'GET /api/status': return sendJson(res, 200, { translator: hasTranslator, speech: hasSpeech });
        case 'GET /api/languages': return sendJson(res, 200, { languages: await getLanguages() });
        case 'GET /api/voices':
          if (!hasSpeech) throw new HttpError(503, 'speech-not-configured', 'Azure Speech is not configured on the server.');
          return sendJson(res, 200, { voices: (await getVoiceMap()).map });
        case 'POST /api/translate': return sendJson(res, 200, await translate(req));
        case 'POST /api/speak': return await speak(req, res);
        default: return sendJson(res, 404, { error: 'not-found' });
      }
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status >= 500) console.error(`[api] ${route}:`, e.message);
      if (!res.headersSent) sendJson(res, status, { error: e.code ?? 'server-error', message: e instanceof HttpError ? e.message : 'Server error' });
    }
  };
}
