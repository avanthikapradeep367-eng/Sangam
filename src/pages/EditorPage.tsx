/**
 * Review editor for the imported vocabulary. Development only: the route and its write API exist only under
 * `npm run dev` (see scripts/vocab/editor-plugin.mjs); production builds contain neither.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Breadcrumb } from '../components/common';
import { BookMarkup } from '../components/BookRecord';
import { usePageTitle } from '../utils/usePageTitle';

type Status = 'pending' | 'approved' | 'flagged';
type Origin = 'editor' | 'machine' | 'book';
type MeaningLang = 'ta' | 'hi' | 'ml' | 'te';
interface Meaning { text: string; origin: Origin; reviewed?: boolean }

interface RawEntry {
  id: string; ref: string; headword: string; mltForms: string[]; hlt: string[]; grammar: string | null;
  colloquial: { tamil: string | null; roman: string | null }; english: string;
  senses: { id: string; number: number; gloss: string; meanings?: Partial<Record<MeaningLang, Meaning>> }[];
  subforms: { id: string; mlt: string | null; colloquial: { tamil: string | null; roman: string | null }; english: string }[];
  note: string | null;
  source: { ref: string; printedPage: number; pdfPage: number; section: string };
  extracted: { rawTamilOcr: string; roman: string[]; english: string[]; y: number } | null;
  transcribed: { mlt: string; hlt?: string[]; grammar?: string; colloquialTamil: string; colloquialRoman: string; english: string; note?: string } | null;
  review: { status: Status; reviewer: string | null; reviewedAt: string | null; note: string | null };
  flags: { kind: string; detail: string }[];
}
interface Data { token: string; entries: RawEntry[]; report: Record<string, number>; review: Record<string, unknown> }

const LANGS: { code: MeaningLang; label: string }[] = [
  { code: 'ta', label: 'தமிழ் விளக்கம்' }, { code: 'hi', label: 'हिन्दी' }, { code: 'ml', label: 'മലയാളം' }, { code: 'te', label: 'తెలుగు' },
];
const STATUS_LABEL: Record<Status, string> = { pending: 'காத்திருக்கிறது', approved: 'ஒப்புதல்', flagged: 'குறியிட்டது' };
/** 130-dpi page images: PDF points → image pixels. */
const SCALE = 130 / 72;

interface Form {
  mlt: string; hlt: string; grammar: string; colloquialTamil: string; colloquialRoman: string; english: string;
  senses: string; note: string; meanings: Record<string, Partial<Record<MeaningLang, Meaning>>>;
}

function formFor(e: RawEntry): Form {
  return {
    mlt: e.mltForms.join(', ') || e.headword,
    hlt: e.hlt.join(', '),
    grammar: e.grammar ?? '',
    colloquialTamil: e.colloquial.tamil ?? '',
    colloquialRoman: e.colloquial.roman ?? '',
    english: e.english,
    senses: e.senses.map((s) => s.gloss).join('\n'),
    note: e.review.note ?? '',
    meanings: Object.fromEntries(e.senses.map((s) => [String(s.number), s.meanings ?? {}])),
  };
}

export default function EditorPage() {
  usePageTitle('திருத்தி');
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [reviewer, setReviewer] = useState(() => { try { return localStorage.getItem('editor-name') ?? ''; } catch { return ''; } });
  const status = params.get('status') ?? 'all';
  const pageFilter = params.get('page') ?? '';
  const q = params.get('q') ?? '';
  const ref = params.get('ref');

  const load = useCallback(() => {
    fetch('/__editor/api/data').then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(new Error(j.error)))))
      .then(setData).catch((e) => setError(String(e.message ?? e)));
  }, []);
  useEffect(load, [load]);

  const list = useMemo(() => (data?.entries ?? []).filter((e) => {
    if (status === 'flags' ? !e.flags.some((f) => f.kind !== 'no-mlt-in-book') : status !== 'all' && e.review.status !== status) return false;
    if (pageFilter && String(e.source.pdfPage) !== pageFilter) return false;
    if (q && !(e.ref === q || e.headword.includes(q) || e.english.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [data, status, pageFilter, q]);
  const entry = data?.entries.find((e) => e.ref === ref) ?? list[0];
  const pagesInBook = useMemo(() => Array.from(new Set((data?.entries ?? []).map((e) => e.source.pdfPage))).sort((a, b) => a - b), [data]);

  const set = (k: string, v: string | null) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    if (k !== 'ref') p.delete('ref');
    setParams(p, { replace: true });
  };

  if (error) return <main className="page"><div className="container"><h1 className="page-title">திருத்தி</h1><p className="draft-note">{error}</p><p>திருத்தி <code>npm run dev</code> மூலம் இக்கணினியில் மட்டுமே இயங்கும்.</p></div></main>;
  if (!data) return <main className="page"><div className="container"><p>ஏற்றுகிறது…</p></div></main>;

  async function post(path: string, body: unknown) {
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`/__editor/api/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Editor-Token': data!.token }, body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    } catch (e) {
      setMsg(`பிழை: ${(e as Error).message}`);
      return null;
    } finally { setBusy(false); }
  }

  async function save(form: Form, next: Status | 'revert') {
    if (!entry) return;
    try { localStorage.setItem('editor-name', reviewer); } catch { /* private mode */ }
    const split = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
    const t = entry.transcribed;
    const corrected: Record<string, unknown> = {};
    // Store only what differs from the transcription, so the TSV stays the single source for the rest.
    if (form.mlt !== (t?.mlt ?? '')) corrected.mlt = form.mlt;
    if (form.hlt !== (t?.hlt ?? []).join(', ')) corrected.hlt = split(form.hlt);
    if (form.grammar !== (t?.grammar ?? '')) corrected.grammar = form.grammar;
    if (form.colloquialTamil !== (t?.colloquialTamil ?? '')) corrected.colloquialTamil = form.colloquialTamil;
    if (form.colloquialRoman !== (t?.colloquialRoman ?? '')) corrected.colloquialRoman = form.colloquialRoman;
    if (form.english !== (t?.english ?? '')) corrected.english = form.english;
    const senses = form.senses.split('\n').map((s) => s.trim()).filter(Boolean);
    if (senses.join('\n') !== entry.senses.map((s) => s.gloss).join('\n') || (data!.review[entry.ref] as { corrected?: { senses?: string[] } })?.corrected?.senses) corrected.senses = senses;
    const body = next === 'revert'
      ? { ref: entry.ref, revert: true }
      : { ref: entry.ref, reviewer, review: { status: next, corrected, meanings: form.meanings, note: form.note } };
    const j = await post('review', body);
    if (j) {
      setData((d) => d && {
        ...d, report: j.report,
        review: { ...d.review, [entry.ref]: j.review },
        entries: d.entries.map((e) => (e.ref === entry.ref ? j.entry : e)),
      });
      setMsg(next === 'revert' ? `${entry.ref}: படியெடுப்புக்குத் திருப்பப்பட்டது` : `${entry.ref}: சேமிக்கப்பட்டது (${STATUS_LABEL[next]})`);
    }
  }

  const idx = entry ? list.findIndex((e) => e.ref === entry.ref) : -1;
  const go = (d: number) => { const n = list[idx + d]; if (n) set('ref', n.ref); };

  return (
    <main id="main-content" className="page editor">
      <div className="container container--wide">
        <Breadcrumb items={[{ to: '/', label: 'அகராதி' }, { label: 'திருத்தி' }]} />
        <h1 className="page-title">படியெடுப்புத் திருத்தி</h1>
        <p className="draft-note">
          இப்பக்கமும் இதன் சேமிப்பு வசதியும் <code>npm run dev</code> இல் இக்கணினியிலிருந்து மட்டுமே இயங்கும்; வெளியிடப்படும் தளத்தில் இவை இல்லை.
          சேமிப்பு <code>content/sources/vocab/review.json</code> இல் எழுதி இறக்குமதியை மீண்டும் இயக்கும்.
        </p>
        <p className="results-count">
          மொத்தம் {data.report.transcribed} · ஒப்புதல் {data.report.approved} · காத்திருப்பவை {data.report.pending} · குறியிட்டவை {data.report.flaggedByEditor} · தானியங்கிச் சரிபார்ப்புக் குறிகள் {data.report.withValidationFlags}
          {' '}<button type="button" className="link-btn" disabled={busy} onClick={async () => { const j = await post('rebuild', {}); if (j) setMsg('தளத் தரவு மீண்டும் உருவாக்கப்பட்டது; பக்கங்கள் புதுப்பிக்கப்படும்.'); }}>தளத் தரவைப் புதுப்பி</button>
        </p>
        <p role="status" className="editor__msg">{msg}</p>

        <div className="editor__layout">
          <aside className="editor__list" aria-label="பதிவுகள்">
            <label className="field"><span>நிலை</span>
              <select value={status} onChange={(e) => set('status', e.target.value === 'all' ? null : e.target.value)}>
                <option value="all">எல்லாம்</option><option value="pending">காத்திருப்பவை</option><option value="approved">ஒப்புதல்</option>
                <option value="flagged">குறியிட்டவை</option><option value="flags">தானியங்கிக் குறிகள் உள்ளவை</option>
              </select>
            </label>
            <label className="field"><span>PDF பக்கம்</span>
              <select value={pageFilter} onChange={(e) => set('page', e.target.value || null)}>
                <option value="">எல்லாம்</option>{pagesInBook.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="field"><span>தேடு (எண் / சொல் / English)</span>
              <input value={q} onChange={(e) => set('q', e.target.value || null)} />
            </label>
            <p className="muted">{list.length} பதிவுகள்</p>
            <ol className="editor__items">
              {list.slice(0, 400).map((e) => (
                <li key={e.ref}>
                  <button type="button" className={`editor__item${entry?.ref === e.ref ? ' is-active' : ''}`} onClick={() => set('ref', e.ref)}>
                    <span className={`dot dot--${e.review.status}`} aria-label={STATUS_LABEL[e.review.status]} />
                    <span className="editor__ref">{e.ref}</span> <span lang="ta">{e.headword}</span>
                    {e.flags.some((f) => f.kind !== 'no-mlt-in-book') && <span aria-label="குறிகள் உள்ளன"> ⚑</span>}
                  </button>
                </li>
              ))}
            </ol>
            {list.length > 400 && <p className="muted">முதல் 400 மட்டும்; வடிகட்டிகளைப் பயன்படுத்தவும்.</p>}
          </aside>

          {entry ? <RecordEditor key={entry.ref + entry.review.reviewedAt} entry={entry} busy={busy} reviewer={reviewer} setReviewer={setReviewer}
            onSave={save} onPrev={idx > 0 ? () => go(-1) : undefined} onNext={idx >= 0 && idx < list.length - 1 ? () => go(1) : undefined} />
            : <p>பதிவு எதுவும் இல்லை.</p>}
        </div>
      </div>
    </main>
  );
}

function PageCrop({ entry }: { entry: RawEntry }) {
  const box = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const src = `/source-pages/vocab/p${String(entry.source.pdfPage).padStart(3, '0')}.jpg`;
  const y = entry.extracted?.y;
  useEffect(() => {
    if (box.current && y !== undefined && !full) box.current.scrollTop = Math.max(0, y * SCALE - 70);
  }, [y, full, entry.ref]);
  return (
    <figure className="editor__page">
      <div ref={box} className={`editor__crop${full ? ' is-full' : ''}`}>
        <img src={src} alt={`PDF பக்கம் ${entry.source.pdfPage}`} onLoad={() => { if (box.current && y !== undefined && !full) box.current.scrollTop = Math.max(0, y * SCALE - 70); }} />
      </div>
      <figcaption>
        PDF ப. {entry.source.pdfPage} · அச்சுப் ப. {entry.source.printedPage}{y === undefined && ' · OCR இடம் தெரியவில்லை: பக்கத்தில் தேடவும்'}{' '}
        <button type="button" className="link-btn" onClick={() => setFull((f) => !f)}>{full ? 'பகுதி மட்டும்' : 'முழுப் பக்கம்'}</button>{' '}
        <a href={src} target="_blank" rel="noreferrer">புதிய தாவலில் ↗</a>
      </figcaption>
    </figure>
  );
}

function RecordEditor({ entry, busy, reviewer, setReviewer, onSave, onPrev, onNext }: {
  entry: RawEntry; busy: boolean; reviewer: string; setReviewer: (s: string) => void;
  onSave: (f: Form, s: Status | 'revert') => void; onPrev?: () => void; onNext?: () => void;
}) {
  const [form, setForm] = useState(() => formFor(entry));
  const upd = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const senseLines = form.senses.split('\n').map((s) => s.trim()).filter(Boolean);
  const setMeaning = (n: number, lang: MeaningLang, patch: Partial<Meaning>) => setForm((f) => {
    const cur = f.meanings[n]?.[lang] ?? { text: '', origin: 'editor' as Origin };
    return { ...f, meanings: { ...f.meanings, [n]: { ...f.meanings[n], [lang]: { ...cur, ...patch } } } };
  });
  const t = entry.transcribed;
  const rows: { k: keyof Form; label: string; ocr: string; tr: string; lang: string }[] = [
    { k: 'mlt', label: 'MLT தலைச்சொல்', ocr: entry.extracted?.rawTamilOcr ?? '—', tr: t?.mlt ?? '', lang: 'ta' },
    { k: 'hlt', label: 'HLT வடிவம்', ocr: '', tr: (t?.hlt ?? []).join(', '), lang: 'ta' },
    { k: 'grammar', label: 'இலக்கணம் / வினை வகுப்பு', ocr: '', tr: t?.grammar ?? '', lang: 'en' },
    { k: 'colloquialTamil', label: 'CT தமிழ்', ocr: '', tr: t?.colloquialTamil ?? '', lang: 'ta' },
    { k: 'colloquialRoman', label: 'CT Roman', ocr: entry.extracted?.roman.join(' | ') ?? '—', tr: t?.colloquialRoman ?? '', lang: 'en' },
    { k: 'english', label: 'English', ocr: entry.extracted?.english.join(' | ') ?? '—', tr: t?.english ?? '', lang: 'en' },
  ];

  return (
    <section className="editor__record" aria-labelledby="rec-title">
      <div className="results-bar">
        <h2 id="rec-title" className="section-title">{entry.ref}. <span lang="ta">{entry.headword}</span> <span className={`dot dot--${entry.review.status}`} /> {STATUS_LABEL[entry.review.status]}</h2>
        <span>
          <button type="button" className="tool-btn" disabled={!onPrev} onClick={onPrev}>← முந்தைய</button>{' '}
          <button type="button" className="tool-btn" disabled={!onNext} onClick={onNext}>அடுத்த →</button>{' '}
          <Link to={`/entry/${entry.id}`} target="_blank">தளத்தில் ↗</Link>
        </span>
      </div>
      <PageCrop entry={entry} />
      {entry.flags.length > 0 && (
        <ul className="flag-list">{entry.flags.map((f, i) => <li key={i}><strong>{f.kind}</strong>: {f.detail}</li>)}</ul>
      )}

      <div className="table-wrap">
        <table className="data-table editor__table">
          <thead><tr><th scope="col">புலம்</th><th scope="col">PDF உரை அடுக்கு (OCR)</th><th scope="col">AI படியெடுப்பு</th><th scope="col">திருத்தம்</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} className={form[r.k] !== r.tr ? 'is-changed' : undefined}>
                <th scope="row">{r.label}</th>
                <td className="ocr">{r.ocr}</td>
                <td lang={r.lang}>{r.k === 'english' ? <BookMarkup text={r.tr} /> : r.tr}</td>
                <td><input aria-label={r.label} lang={r.lang} value={form[r.k] as string} onChange={(e) => upd(r.k, e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="field-note">English இல் <code>_சொல்_</code> = அடிக்கோடு (பேச்சுத் தமிழில் மட்டும்), <code>__சொல்__</code> = இரட்டை அடிக்கோடு (விளக்கம்), [ ] = இலக்கிய வழக்கு. HLT பல வடிவங்களைக் காற்புள்ளியால் பிரிக்கவும்.</p>
      {entry.subforms.length > 0 && <p className="muted">துணை வடிவங்கள் (TSV இல் திருத்தவும்): {entry.subforms.map((s) => `${s.mlt ?? s.colloquial.tamil} — ${s.english}`).join(' · ')}</p>}

      <label className="field">
        <span>பொருள்கள் — ஒரு வரிக்கு ஒரு பொருள் (பிரிக்க / இணைக்க)</span>
        <textarea rows={Math.max(2, senseLines.length + 1)} lang="en" value={form.senses} onChange={(e) => upd('senses', e.target.value)} />
      </label>

      {senseLines.map((gloss, i) => (
        <fieldset key={i} className="editor__sense">
          <legend>பொருள் {i + 1}: <span lang="en">{gloss}</span></legend>
          {LANGS.map((l) => {
            const m = form.meanings[i + 1]?.[l.code];
            return (
              <div key={l.code} className="editor__meaning">
                <label><span>{l.label}</span><input lang={l.code} value={m?.text ?? ''} onChange={(e) => setMeaning(i + 1, l.code, { text: e.target.value })} /></label>
                <select aria-label={`${l.label} மூலம்`} value={m?.origin ?? 'editor'} onChange={(e) => setMeaning(i + 1, l.code, { origin: e.target.value as Origin })}>
                  <option value="editor">ஆசிரியர்</option><option value="machine">இயந்திர மொழிபெயர்ப்பு</option>
                </select>
                <label className="check"><input type="checkbox" checked={Boolean(m?.reviewed)} onChange={(e) => setMeaning(i + 1, l.code, { reviewed: e.target.checked })} /> சரிபார்த்தது</label>
              </div>
            );
          })}
        </fieldset>
      ))}

      <label className="field"><span>ஆசிரியர் குறிப்பு</span><textarea rows={2} value={form.note} onChange={(e) => upd('note', e.target.value)} /></label>
      <label className="field"><span>உங்கள் பெயர் (ஒப்புதலுடன் பதிவாகும்)</span><input value={reviewer} onChange={(e) => setReviewer(e.target.value)} /></label>

      <div className="toolbar">
        <button type="button" className="tool-btn is-on" disabled={busy || !reviewer.trim()} onClick={() => onSave(form, 'approved')} title={reviewer.trim() ? '' : 'பெயரை உள்ளிடவும்'}>✓ ஒப்புதல்</button>
        <button type="button" className="tool-btn" disabled={busy} onClick={() => onSave(form, 'flagged')}>⚑ குறியிடு</button>
        <button type="button" className="tool-btn" disabled={busy} onClick={() => onSave(form, entry.review.status)}>சேமி (நிலை மாறாது)</button>
        <button type="button" className="tool-btn" disabled={busy} onClick={() => setForm(formFor(entry))}>மாற்றங்களை நீக்கு</button>
        <button type="button" className="tool-btn" disabled={busy} onClick={() => { if (confirm('இப்பதிவின் எல்லாத் திருத்தங்களையும் நீக்கிப் படியெடுப்புக்குத் திரும்பவா?')) onSave(form, 'revert'); }}>படியெடுப்புக்குத் திரும்பு</button>
      </div>
    </section>
  );
}
