import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAdmin, highlight } from './context';
import { OriginBadge, Section, SourceSelect, StatusBadge } from './ui';
import { AdminError, list, post, type Row } from './api';
import { EntryLeaf } from '../pages/EntryPage';
import type { Citation, DictionaryEntry } from '../types';
import { translateTexts, describeError } from '../utils/azure';
import { poemById } from '../data';

interface TrForm { text: string; explanatory: boolean; review_status: 'reviewed' | 'unreviewed'; source_id: string }
interface SenseForm { key: string; id: string | null; definition_ta: string; source_id: string; tr: Record<string, TrForm> }
interface NoteForm { key: string; id: string | null; kind: 'etymology' | 'grammar' | 'usage'; text: string; source_id: string }
interface EntryForm { entry: Row; senses: SenseForm[]; notes: NoteForm[] }

/** Entry columns edited as comma-separated lists (stored with | in the CSV). */
const LIST_FIELDS = ['roman_aliases', 'spelling_variants', 'inflected_forms', 'related', 'synonyms', 'antonyms'] as const;
const TINAI = ['குறிஞ்சி', 'முல்லை', 'மருதம்', 'நெய்தல்', 'பாலை'];
const NOTE_KINDS = ['etymology', 'grammar', 'usage'] as const;
const DEFAULT_SOURCE = 'editorial-draft';
let keySeq = 0;
const newKey = () => `k${++keySeq}`;

const toDisplay = (pipe: string) => list(pipe).join(', ');
const toPipe = (display: string) => display.split(/[,|]/).map((s) => s.trim()).filter(Boolean).join('|');
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function EntryEditor() {
  const { id } = useParams();
  const { data, L } = useAdmin();
  const isNew = !id;
  const exists = id ? data.tables.entries.some((e) => e.id === id) : false;
  if (!isNew && !exists) return <p className="admin-alert admin-alert--error">{L(`"${id}" என்ற சொல் content/entries.csv இல் இல்லை.`, `No entry "${id}" in content/entries.csv.`)} <Link to="/admin">{L('மேலோட்டம்', 'Overview')}</Link></p>;
  const fp = id ? data.fingerprints[id] : 'new';
  // Remount with a fresh form whenever the saved rows change (after a save, or an outside edit + reload).
  return <EditorForm key={`${id ?? 'new'}:${fp}`} id={id ?? null} fingerprint={fp ?? null} />;
}

function EditorForm({ id, fingerprint }: { id: string | null; fingerprint: string | null }) {
  const { data, index, run, busy, L, sourceOrigin } = useAdmin();
  const navigate = useNavigate();
  const langs = data.languages.filter((l) => !l.base);
  const initial = useMemo(() => formFrom(data, id, langs.map((l) => l.code)), [data, id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState<EntryForm>(initial);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const info = id ? index.get(id) : undefined;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const setEntry = (k: string, v: string) => setForm((f) => ({ ...f, entry: { ...f.entry, [k]: v } }));
  const setSense = (key: string, patch: Partial<SenseForm>) => setForm((f) => ({ ...f, senses: f.senses.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));
  const setTr = (key: string, lang: string, patch: Partial<TrForm>) => setForm((f) => ({
    ...f, senses: f.senses.map((s) => (s.key === key ? { ...s, tr: { ...s.tr, [lang]: { ...s.tr[lang], ...patch } } } : s)),
  }));
  const moveSense = (i: number, d: number) => setForm((f) => {
    const s = f.senses.slice(); const j = i + d;
    if (j < 0 || j >= s.length) return f;
    [s[i], s[j]] = [s[j], s[i]];
    return { ...f, senses: s };
  });
  const setNote = (key: string, patch: Partial<NoteForm>) => setForm((f) => ({ ...f, notes: f.notes.map((n) => (n.key === key ? { ...n, ...patch } : n)) }));

  const payload = (action: 'draft' | 'approve' | null) => ({
    action, originalId: id, fingerprint,
    entry: {
      ...form.entry,
      ...Object.fromEntries(LIST_FIELDS.map((k) => [k, toPipe(form.entry[k] ?? '')])),
    },
    senses: form.senses.map((s) => ({
      id: s.id, definition_ta: s.definition_ta, source_id: s.source_id,
      translations: Object.entries(s.tr).map(([lang, t]) => ({ lang, ...t })),
    })),
    notes: form.notes.map((n) => ({ id: n.id, kind: n.kind, text: n.text, source_id: n.source_id })),
  });

  // ── Live preview (compiled by the server from the unsaved form; nothing is written) ──
  const [preview, setPreview] = useState<{ entry: DictionaryEntry | null; citations: Citation[]; errors: string[] } | null>(null);
  const [previewError, setPreviewError] = useState('');
  const body = JSON.stringify(payload(null));
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await post<{ entry: DictionaryEntry | null; citations: Citation[]; errors: string[] }>(data.token, 'preview', JSON.parse(body));
        setPreview(r); setPreviewError('');
      } catch (e) { setPreviewError((e as AdminError).message); }
    }, 350);
    return () => clearTimeout(t);
  }, [body, data.token]);

  async function save(action: 'draft' | 'approve') {
    const msg = action === 'approve'
      ? L('ஒப்புதல் அளிக்கப்பட்டது (status: reviewed) — content/ இல் சேமிக்கப்பட்டது.', 'Approved (status: reviewed) and saved in content/.')
      : L('வரைவாகச் சேமிக்கப்பட்டது — content/ இல்.', 'Saved as a draft in content/.');
    const r = await run('entry', payload(action), msg);
    if (r?.id && !id) navigate(`/admin/entry/${r.id}`, { replace: true });
  }

  const posOptions = useMemo(() => Array.from(new Set(data.tables.entries.map((e) => e.pos).filter(Boolean))), [data]);
  const entryIds = data.tables.entries.map((e) => e.id);
  const hasEditorSource = data.sources.some((s) => s.origin === 'editor');
  const status = form.entry.status || 'draft';

  return (
    <>
      <header className="a-head a-head--row">
        <div>
          <p className="a-crumbs"><Link to="/admin">{L('மேலோட்டம்', 'Overview')}</Link> / {id ? <code>{id}</code> : L('புதிய சொல்', 'New entry')}</p>
          <h1><span lang="ta">{form.entry.headword || L('புதிய சொல்', 'New entry')}</span> {id && <StatusBadge status={status} />}</h1>
        </div>
        {id && <Link to={`/entry/${id}`} target="_blank" rel="noreferrer" className="a-btn a-btn--ghost">{L('தளத்தில் பார் ↗', 'Open on site ↗')}</Link>}
      </header>

      <div className="a-split">
        <form className="a-form a-form--entry" onSubmit={(e) => { e.preventDefault(); void save('draft'); }} aria-label={L('சொல் திருத்தி', 'Entry editor')}>
          <Section title={L('தலைச்சொல்', 'Headword')} id="sec-hw">
            <div className="a-grid">
              <label className="a-field"><span>{L('அடையாளம் (id)', 'ID')}</span>
                <input value={form.entry.id} readOnly={Boolean(id)} aria-describedby="id-note" pattern="[a-z0-9][a-z0-9\-]*"
                  onChange={(e) => setEntry('id', slug(e.target.value))} required />
                <small id="id-note">{id ? L('மாற்ற இயலாது: பொருள்கள், மேற்கோள்கள், இணைப்புகள் இதைச் சார்ந்துள்ளன.', 'Fixed: senses, citations and URLs depend on it.') : L('சிறிய ஆங்கில எழுத்துகள், எண்கள், -', 'Lowercase letters, digits and hyphens')}</small>
              </label>
              <label className="a-field"><span>{L('தலைச்சொல் (தமிழ்)', 'Headword (Tamil)')}</span>
                <input lang="ta" className="a-ta" value={form.entry.headword} required onChange={(e) => setEntry('headword', e.target.value)} />
              </label>
              <label className="a-field a-field--narrow"><span>{L('ஒத்த சொல் எண்', 'Homograph no.')}</span>
                <input inputMode="numeric" value={form.entry.homograph} onChange={(e) => setEntry('homograph', e.target.value.replace(/\D/g, ''))} />
              </label>
              <label className="a-field"><span>{L('ஒலிபெயர்ப்பு', 'Transliteration')}</span>
                <input lang="ta-Latn" value={form.entry.transliteration}
                  onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, entry: { ...f.entry, transliteration: v, ...(!id ? { id: slug(v) } : {}) } })); }} />
              </label>
              <label className="a-field"><span>{L('சொல் வகை', 'Part of speech')}</span>
                <input lang="ta" list="pos-list" value={form.entry.pos} required onChange={(e) => setEntry('pos', e.target.value)} />
                <datalist id="pos-list">{posOptions.map((p) => <option key={p} value={p} />)}</datalist>
              </label>
              <label className="a-field"><span>திணை</span>
                <select value={form.entry.tinai} onChange={(e) => setEntry('tinai', e.target.value)}>
                  <option value="">—</option>{TINAI.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="a-field"><span>{L('பதிவின் ஆதாரம்', 'Entry source')}</span>
                <SourceSelect value={form.entry.source_id} onChange={(v) => setEntry('source_id', v)} />
              </label>
            </div>
            <fieldset className="a-topics">
              <legend>{L('தலைப்புகள்', 'Topics')}</legend>
              {data.topics.map((t) => {
                const on = list(form.entry.topics).includes(t.id);
                return (
                  <label key={t.id} className="a-check">
                    <input type="checkbox" checked={on} onChange={() => setEntry('topics', (on ? list(form.entry.topics).filter((x) => x !== t.id) : [...list(form.entry.topics), t.id]).join('|'))} />
                    <span lang="ta">{t.label}</span>
                  </label>
                );
              })}
            </fieldset>
          </Section>

          <Section title={L('பொருள்கள்', 'Meanings')} id="sec-senses"
            actions={<button type="button" className="a-btn a-btn--small" onClick={() => setForm((f) => ({ ...f, senses: [...f.senses, emptySense(langs.map((l) => l.code))] }))}>+ {L('பொருள்', 'Meaning')}</button>}>
            {!hasEditorSource && <p className="a-note">{L(
              'sources.json இல் "editor" மூலம் கொண்ட ஆதாரம் இல்லை. கையால் எழுதிய மொழிபெயர்ப்புகளைத் தனியாகக் காட்ட அப்படி ஒன்றைச் சேர்க்கவும்; இப்போது "சரிபார்த்தது" குறி மட்டுமே மனிதர் பார்த்ததைக் காட்டும்.',
              'sources.json has no source with origin "editor". Add one to label hand-written translations; until then the "Checked by a person" box is what marks human review.')}</p>}
            {form.senses.map((s, i) => {
              const cites = s.id ? (info?.citations ?? []).filter((c) => c.sense_id === s.id) : [];
              return (
                <fieldset key={s.key} className="a-sense">
                  <legend><span className="a-sense__n">{i + 1}</span> {s.id ? <code>{s.id}</code> : <em>{L('புதியது', 'new')}</em>}</legend>
                  <div className="a-sense__tools">
                    <button type="button" className="a-btn a-btn--tiny" disabled={i === 0} onClick={() => moveSense(i, -1)} aria-label={L(`பொருள் ${i + 1} மேலே`, `Move meaning ${i + 1} up`)}>↑</button>
                    <button type="button" className="a-btn a-btn--tiny" disabled={i === form.senses.length - 1} onClick={() => moveSense(i, 1)} aria-label={L(`பொருள் ${i + 1} கீழே`, `Move meaning ${i + 1} down`)}>↓</button>
                    <button type="button" className="a-btn a-btn--tiny a-btn--danger" disabled={cites.length > 0}
                      title={cites.length ? L('இப்பொருளுக்கு மேற்கோள்கள் உள்ளன; முதலில் அவற்றை நீக்கவும்/மாற்றவும்.', 'This meaning has citations; move or delete them first.') : ''}
                      onClick={() => setForm((f) => ({ ...f, senses: f.senses.filter((x) => x.key !== s.key) }))}>{L('நீக்கு', 'Remove')}</button>
                  </div>
                  <label className="a-field"><span>{L('தமிழ் விளக்கம்', 'Tamil definition')}</span>
                    <textarea lang="ta" className="a-ta" rows={2} value={s.definition_ta} required onChange={(e) => setSense(s.key, { definition_ta: e.target.value })} />
                  </label>
                  <label className="a-field a-field--inline"><span>{L('விளக்கத்தின் ஆதாரம்', 'Definition source')}</span>
                    <SourceSelect value={s.source_id} onChange={(v) => setSense(s.key, { source_id: v })} />
                  </label>
                  <table className="a-tr">
                    <caption className="visually-hidden">{L(`பொருள் ${i + 1} மொழிபெயர்ப்புகள்`, `Translations of meaning ${i + 1}`)}</caption>
                    <thead><tr><th scope="col">{L('மொழி', 'Language')}</th><th scope="col">{L('உரை', 'Text')}</th><th scope="col">{L('ஆதாரம்', 'Source')}</th><th scope="col">{L('நிலை', 'Review')}</th></tr></thead>
                    <tbody>
                      {langs.map((l) => {
                        const t = s.tr[l.code];
                        return (
                          <tr key={l.code}>
                            <th scope="row" lang={l.code}>{l.label}{l.code === 'en' && <small> {L('(ஆங்கில வரி)', '(English line)')}</small>}</th>
                            <td>
                              <input lang={l.code} aria-label={`${l.englishName} — ${L('பொருள்', 'meaning')} ${i + 1}`} value={t.text} onChange={(e) => setTr(s.key, l.code, { text: e.target.value })} />
                              <label className="a-check a-check--small"><input type="checkbox" checked={t.explanatory} onChange={(e) => setTr(s.key, l.code, { explanatory: e.target.checked })} /> {L('விளக்கக் குறிப்பு', 'Explanatory gloss')}</label>
                              {!t.text && s.definition_ta && <AzureDraft text={s.definition_ta} lang={l.code} onDone={(text) => setTr(s.key, l.code, { text, source_id: data.sources.find((x) => x.origin === 'machine')?.id ?? DEFAULT_SOURCE, review_status: 'unreviewed' })} />}
                            </td>
                            <td>
                              <SourceSelect value={t.source_id} onChange={(v) => setTr(s.key, l.code, { source_id: v })} label={`${l.englishName} source`} />
                              {t.text && <OriginBadge origin={sourceOrigin(t.source_id)} />}
                            </td>
                            <td>
                              <label className="a-check"><input type="checkbox" checked={t.review_status === 'reviewed'} onChange={(e) => setTr(s.key, l.code, { review_status: e.target.checked ? 'reviewed' : 'unreviewed' })} /> {L('மனிதர் சரிபார்த்தது', 'Checked by a person')}</label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="a-sense__cites">
                    {cites.map((c) => <CitationLine key={c.id} c={c} />)}
                    {s.id
                      ? <Link className="a-btn a-btn--small a-btn--ghost" to={`/admin/citations?entry=${encodeURIComponent(form.entry.id)}&sense=${encodeURIComponent(s.id)}`}>+ {L('பாடலுடன் இணை', 'Link a poem')}</Link>
                      : <small className="a-muted">{L('சேமித்த பிறகு பாடலுடன் இணைக்கலாம்.', 'Save first to link a poem to this meaning.')}</small>}
                  </div>
                </fieldset>
              );
            })}
          </Section>

          <Section title={L('சொற்பிறப்பு · இலக்கணம் · பயன்பாடு', 'Etymology · grammar · usage notes')} id="sec-notes">
            {NOTE_KINDS.map((kind) => (
              <div key={kind} className="a-notes">
                <h3>{kind === 'etymology' ? L('சொற்பிறப்பியல்', 'Etymology') : kind === 'grammar' ? L('இலக்கணக் குறிப்பு', 'Grammar note') : L('இலக்கியப் பயன்பாடு', 'Usage note')}</h3>
                {form.notes.filter((n) => n.kind === kind).map((n) => (
                  <div key={n.key} className="a-note-row">
                    <textarea lang="ta" className="a-ta" rows={2} aria-label={kind} value={n.text} onChange={(e) => setNote(n.key, { text: e.target.value })} />
                    <SourceSelect value={n.source_id} onChange={(v) => setNote(n.key, { source_id: v })} label={`${kind} source`} />
                    <button type="button" className="a-btn a-btn--tiny a-btn--danger" onClick={() => setForm((f) => ({ ...f, notes: f.notes.filter((x) => x.key !== n.key) }))}>{L('நீக்கு', 'Remove')}</button>
                  </div>
                ))}
                <button type="button" className="a-btn a-btn--small a-btn--ghost" onClick={() => setForm((f) => ({ ...f, notes: [...f.notes, { key: newKey(), id: null, kind, text: '', source_id: DEFAULT_SOURCE }] }))}>+ {L('குறிப்பு', 'Note')}</button>
              </div>
            ))}
            {kindHint(L)}
          </Section>

          <Section title={L('வடிவங்கள் · தொடர்புகள்', 'Forms and relations')} id="sec-forms">
            <p className="a-note">{L('பல மதிப்புகளைக் காற்புள்ளியால் பிரிக்கவும்.', 'Separate several values with commas.')}</p>
            <div className="a-grid a-grid--2">
              <ListField k="synonyms" label={L('இணைச்சொற்கள் (தமிழ்)', 'Synonyms (Tamil)')} form={form} setEntry={setEntry} lang="ta" />
              <ListField k="antonyms" label={L('எதிர்ச்சொற்கள் (தமிழ்)', 'Antonyms (Tamil)')} form={form} setEntry={setEntry} lang="ta" />
              <ListField k="inflected_forms" label={L('சொல் வடிவங்கள்', 'Word forms (inflected)')} form={form} setEntry={setEntry} lang="ta" />
              <ListField k="spelling_variants" label={L('மாற்று எழுத்துக்கூட்டு', 'Spelling variants')} form={form} setEntry={setEntry} lang="ta" />
              <ListField k="roman_aliases" label={L('ரோமன் தேடல் வடிவங்கள்', 'Roman search aliases')} form={form} setEntry={setEntry} lang="ta-Latn" />
              <label className="a-field"><span>{L('தொடர்புடைய சொற்கள் (id)', 'Related entries (ids)')}</span>
                <input list="entry-ids" value={form.entry.related} onChange={(e) => setEntry('related', e.target.value)} />
                <datalist id="entry-ids">{entryIds.map((x) => <option key={x} value={x}>{data.tables.entries.find((e) => e.id === x)?.headword}</option>)}</datalist>
                <small>{toDisplay(toPipe(form.entry.related)).split(', ').filter(Boolean).map((r) => {
                  const e = data.tables.entries.find((x) => x.id === r);
                  return <span key={r} className={e ? 'a-tag' : 'a-flag a-flag--bad'} lang="ta">{e ? e.headword : `${r}?`}</span>;
                })}</small>
              </label>
            </div>
          </Section>

          <div className="a-actions" role="group" aria-label={L('சேமிப்பு', 'Save')}>
            <button type="submit" className="a-btn" disabled={busy}>{L('வரைவாகச் சேமி', 'Save draft')}</button>
            <button type="button" className="a-btn a-btn--primary" disabled={busy} onClick={() => void save('approve')}>✓ {L('ஒப்புதல் அளி', 'Approve')}</button>
            <button type="button" className="a-btn a-btn--ghost" disabled={busy || !dirty} onClick={() => setForm(initial)}>{L('மாற்றங்களை நீக்கு', 'Discard changes')}</button>
            <span className="a-muted">{dirty ? L('சேமிக்காத மாற்றங்கள் உள்ளன', 'Unsaved changes') : L('மாற்றம் இல்லை', 'No changes')}</span>

          </div>
          <p className="a-note">{L(
              'இரண்டும் content/*.csv கோப்புகளில் மட்டுமே எழுதும் (சரிபார்த்த பின்). வெளியீடு தனிச் செயல்: "தளத் தரவைப் புதுப்பி", பிறகு build + deploy. வரைவுகள் இப்போதுள்ளபடி தளத்தில் "வரைவு" குறியுடன் காட்டப்படும்.',
              'Both write only to content/*.csv, after validation. Publishing is separate: "Rebuild site data", then build and deploy. Drafts stay visible on the site with their draft notice, as they are today.')}
              {status === 'demo' && ' ' + L('இது மாதிரிப் பதிவு: "வரைவாகச் சேமி" அதை மாதிரியாகவே வைக்கும்.', 'This is a demo entry: Save draft keeps it as demo.')}</p>
        </form>

        <aside className="a-preview" aria-label={L('முன்னோட்டம்', 'Preview')}>
          <div className="a-preview__bar">
            <h2>{L('முன்னோட்டம் · பொதுப் பக்கம்', 'Preview · public page')}</h2>
            <span className="a-muted">{L('சேமிக்காத படிவத்திலிருந்து', 'From the unsaved form')}</span>
          </div>
          {previewError && <p className="admin-alert admin-alert--error">{previewError}</p>}
          {preview?.errors.length ? (
            <div className="admin-alert admin-alert--warn" role="status">
              <p><strong>{L('இப்போது சேமித்தால் சரிபார்ப்பு தோல்வியடையும்:', 'Saving now would fail validation:')}</strong></p>
              <ul className="admin-errors">{preview.errors.slice(0, 12).map((e, k) => <li key={k}>{e}</li>)}</ul>
            </div>
          ) : preview && <p className="a-flag a-flag--ok">{L('சரிபார்ப்பு: சரி', 'Validation: OK')}</p>}
          <div className="a-preview__page leaf leaf--single" data-noread>
            {preview?.entry
              ? <EntryLeaf entry={preview.entry} target="" citations={preview.citations} />
              : <p className="a-muted">{preview === null ? L('முன்னோட்டம் தயாராகிறது…', 'Loading preview…') : L('தலைச்சொல், சொல் வகை, ஒரு பொருள் சேர்த்தால் முன்னோட்டம் தெரியும்.', 'Add a headword, part of speech and one meaning to see the preview.')}</p>}
          </div>
        </aside>
      </div>
    </>
  );
}

function kindHint(L: (a: string, b: string) => string) {
  return <p className="a-note">{L('சரிபார்க்கப்படாத சொற்பிறப்பையோ மேற்கோளையோ எழுத வேண்டாம்; ஆதாரம் இல்லையெனில் காலியாக விடவும் — தளம் "ஆதாரம் இன்னும் சேர்க்கப்படவில்லை" எனக் காட்டும்.', 'Do not enter unverified etymologies or quotations; leave a section empty and the site shows "No cited source added yet".')}</p>;
}

function ListField({ k, label, form, setEntry, lang }: { k: string; label: string; form: EntryForm; setEntry: (k: string, v: string) => void; lang: string }) {
  return (
    <label className="a-field"><span>{label}</span>
      <input lang={lang} className={lang === 'ta' ? 'a-ta' : undefined} value={form.entry[k] ?? ''} onChange={(e) => setEntry(k, e.target.value)} />
    </label>
  );
}

function CitationLine({ c }: { c: Row }) {
  const { L } = useAdmin();
  const poem = poemById.get(c.poem_id);
  const line = poem?.lines[Number(c.line) - 1];
  return (
    <p className="a-cite">
      <span lang="ta">{line ? highlight(line, c.form) : <span className="a-flag a-flag--bad">{L('உடைந்த இணைப்பு', 'Broken link')}</span>}</span>{' '}
      <span className="a-muted">{c.poem_id}:{c.line}</span>{' '}
      <span className={c.review_status === 'reviewed' ? 'a-flag a-flag--ok' : 'a-flag a-flag--warn'}>{c.review_status === 'reviewed' ? L('சரிபார்த்தது', 'Verified') : L('சரிபார்க்க வேண்டும்', 'Needs review')}</span>
      {c.featured === 'y' && <span className="a-tag">{L('முதன்மை', 'Featured')}</span>}{' '}
      <Link to={`/admin/citations?c=${encodeURIComponent(c.id)}`}>{L('திருத்து', 'Edit')}</Link>
    </p>
  );
}

function AzureDraft({ text, lang, onDone }: { text: string; lang: string; onDone: (t: string) => void }) {
  const { L } = useAdmin();
  const [state, setState] = useState<'' | 'busy' | string>('');
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  return (
    <span className="a-azure">
      <button type="button" className="a-btn a-btn--tiny a-btn--ghost" disabled={state === 'busy'} onClick={async () => {
        setState('busy');
        try { const [t] = await translateTexts([text], lang); if (alive.current) { setState(''); if (t) onDone(t); } }
        catch (e) { if (alive.current) setState(describeError(e, 'translate')); }
      }}>{state === 'busy' ? '…' : L('Azure வரைவு', 'Draft with Azure')}</button>
      {state && state !== 'busy' && <small className="a-muted"> {state}</small>}
    </span>
  );
}

// ─── Form <-> rows ─────────────────────────────────────────────────────────
function emptyTr(): TrForm { return { text: '', explanatory: false, review_status: 'unreviewed', source_id: DEFAULT_SOURCE }; }
function emptySense(langs: string[]): SenseForm {
  return { key: newKey(), id: null, definition_ta: '', source_id: DEFAULT_SOURCE, tr: Object.fromEntries(langs.map((l) => [l, emptyTr()])) };
}

function formFrom(data: ReturnType<typeof useAdmin>['data'], id: string | null, langs: string[]): EntryForm {
  const cols = data.columns.entries;
  if (!id) {
    const entry = Object.fromEntries(cols.map((c) => [c, ''])) as Row;
    entry.status = 'draft';
    entry.source_id = DEFAULT_SOURCE;
    return { entry, senses: [emptySense(langs)], notes: [] };
  }
  const row = data.tables.entries.find((e) => e.id === id)!;
  const entry = Object.fromEntries(cols.map((c) => [c, row[c] ?? ''])) as Row;
  for (const k of LIST_FIELDS) entry[k] = toDisplay(entry[k]);
  const senses = data.tables.senses.filter((s) => s.entry_id === id).sort((a, b) => Number(a.number) - Number(b.number)).map((s) => {
    const tr: Record<string, TrForm> = {};
    for (const l of langs) {
      const t = data.tables.translations.find((x) => x.sense_id === s.id && x.lang === l);
      tr[l] = t ? { text: t.text, explanatory: t.explanatory === 'y', review_status: t.review_status === 'reviewed' ? 'reviewed' : 'unreviewed', source_id: t.source_id } : emptyTr();
    }
    return { key: s.id, id: s.id, definition_ta: s.definition_ta, source_id: s.source_id, tr };
  });
  const notes = data.tables.notes.filter((n) => n.entry_id === id).map((n) => ({ key: n.id, id: n.id, kind: n.kind as NoteForm['kind'], text: n.text, source_id: n.source_id }));
  return { entry, senses, notes };
}
