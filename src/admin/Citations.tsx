import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdmin, highlight } from './context';
import { Section, SourceSelect } from './ui';
import type { Row } from './api';

const ABBR: Record<string, string> = { kuruntokai: 'kt', purananuru: 'pn' };
type Flag = 'broken-poem' | 'broken-line' | 'form-missing' | 'unverified';

/**
 * Find a poem by work and number, link a dictionary sense to one of its lines, and review every
 * citation. The schema stores poem + line + the attested form, so the quotation shown on the
 * site is always the poem's own line (it cannot drift from the text).
 */
export default function Citations() {
  const { data, L, run, busy } = useAdmin();
  const [params, setParams] = useSearchParams();
  const editing = data.tables.citations.find((c) => c.id === params.get('c'));
  const poemsByWork = useMemo(() => {
    const m = new Map<string, typeof data.poems>();
    for (const p of data.poems) m.set(p.workId, [...(m.get(p.workId) ?? []), p]);
    for (const ps of m.values()) ps.sort((a, b) => Number(a.number) - Number(b.number));
    return m;
  }, [data]);
  const poemOf = (id: string) => data.poems.find((p) => p.id === id);

  const startPoem = editing ? poemOf(editing.poem_id) : undefined;
  const [workId, setWorkId] = useState(startPoem?.workId ?? data.works.find((w) => poemsByWork.has(w.id))?.id ?? '');
  const [number, setNumber] = useState(startPoem?.number ?? poemsByWork.get(workId)?.[0]?.number ?? '');
  const poem = poemsByWork.get(workId)?.find((p) => p.number === number.trim());

  const blank = (): Row => ({
    id: '', entry_id: params.get('entry') ?? '', sense_id: params.get('sense') ?? '', poem_id: '', line: '', form: '',
    featured: '', review_status: 'unreviewed', source_id: 'editorial-draft',
  });
  const [form, setForm] = useState<Row>(() => editing ? { ...editing } : blank());
  const [mode, setMode] = useState<'create' | 'update'>(editing ? 'update' : 'create');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const formPoem = poemOf(form.poem_id);
  const lineText = formPoem?.lines[Number(form.line) - 1];
  const formOk = Boolean(lineText && form.form && lineText.normalize('NFC').includes(form.form.normalize('NFC')));
  const entry = data.tables.entries.find((e) => e.id === form.entry_id);
  const senses = data.tables.senses.filter((s) => s.entry_id === form.entry_id).sort((a, b) => Number(a.number) - Number(b.number));

  const pickLine = (n: number) => {
    if (!poem) return;
    setForm((f) => {
      const next: Row = { ...f, poem_id: poem.id, line: String(n) };
      if (mode === 'create' && f.entry_id) next.id = suggestId(f.entry_id, poem.workId, poem.number, data.tables.citations);
      return next;
    });
  };
  const load = (c: Row) => {
    const p = poemOf(c.poem_id);
    if (p) { setWorkId(p.workId); setNumber(p.number); }
    setForm({ ...c }); setMode('update');
    setParams({ c: c.id }, { replace: true });
  };
  const reset = () => { setForm(blank()); setMode('create'); setParams({}, { replace: true }); };

  async function save() {
    const r = await run('citation', { mode, citation: { ...form, featured: form.featured === 'y' } },
      mode === 'create' ? L('மேற்கோள் சேர்க்கப்பட்டது — content/citations.csv', 'Citation added to content/citations.csv') : L('மேற்கோள் புதுப்பிக்கப்பட்டது — content/citations.csv', 'Citation updated in content/citations.csv'));
    if (r) { setMode('update'); setParams({ c: form.id }, { replace: true }); }
  }
  async function remove() {
    if (!confirm(L(`"${form.id}" மேற்கோளை நீக்கவா?`, `Delete citation "${form.id}"?`))) return;
    const r = await run('citation', { mode: 'update', delete: true, citation: form }, L('மேற்கோள் நீக்கப்பட்டது', 'Citation deleted'));
    if (r) reset();
  }

  // ── Review list with flags ──
  const [show, setShow] = useState<'' | Flag>('');
  const flagged = useMemo(() => data.tables.citations.map((c) => {
    const p = poemOf(c.poem_id);
    const flags: Flag[] = [];
    if (!p) flags.push('broken-poem');
    else {
      const l = p.lines[Number(c.line) - 1];
      if (!l) flags.push('broken-line');
      else if (!l.normalize('NFC').includes(c.form)) flags.push('form-missing');
    }
    if (c.review_status !== 'reviewed') flags.push('unverified');
    return { c, flags };
  }), [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const flagLabel: Record<Flag, string> = {
    'broken-poem': L('பாடல் இல்லை', 'Poem missing'), 'broken-line': L('அடி இல்லை', 'Line out of range'),
    'form-missing': L('வடிவம் அடியில் இல்லை', 'Form not in line'), unverified: L('சரிபார்க்க வேண்டும்', 'Needs review'),
  };
  const shown = flagged.filter((x) => !show || x.flags.includes(show));
  const noSource = data.tables.entries.filter((e) => !data.tables.citations.some((c) => c.entry_id === e.id));
  const poemCites = poem ? data.tables.citations.filter((c) => c.poem_id === poem.id) : [];

  return (
    <>
      <header className="a-head">
        <h1>{L('பாடல்கள் · மேற்கோள்கள்', 'Poems and citations')}</h1>
        <p className="a-sub">{L(`${data.poems.length} பாடல்கள் · ${data.tables.citations.length} மேற்கோள்கள் · ${noSource.length} சொற்களுக்கு ஆதாரம் இல்லை`,
          `${data.poems.length} poems · ${data.tables.citations.length} citations · ${noSource.length} entries with no source`)}</p>
      </header>

      <div className="a-split a-split--even">
        <Section title={L('பாடலைக் கண்டுபிடி', 'Find a poem')} id="find-poem">
          <div className="a-grid">
            <label className="a-field"><span>{L('நூல்', 'Work')}</span>
              <select value={workId} onChange={(e) => { setWorkId(e.target.value); setNumber(poemsByWork.get(e.target.value)?.[0]?.number ?? ''); }}>
                {data.works.map((w) => <option key={w.id} value={w.id} disabled={!poemsByWork.has(w.id)}>{w.title} ({poemsByWork.get(w.id)?.length ?? 0})</option>)}
              </select>
            </label>
            <label className="a-field a-field--narrow"><span>{L('பாடல் எண்', 'Poem no.')}</span>
              <input inputMode="numeric" list="poem-numbers" value={number} onChange={(e) => setNumber(e.target.value)} />
              <datalist id="poem-numbers">{poemsByWork.get(workId)?.map((p) => <option key={p.id} value={p.number} />)}</datalist>
            </label>
          </div>
          <p className="a-muted">{L('இருப்பவை', 'Available')}: {poemsByWork.get(workId)?.map((p) => p.number).join(', ')}</p>
          {poem ? (
            <article className="a-poem">
              <h3 lang="ta">{data.works.find((w) => w.id === poem.workId)?.title} {poem.number}</h3>
              <p className="a-muted" lang="ta">{[poem.tinai && `திணை: ${poem.tinai}`, poem.speaker, poem.poet].filter(Boolean).join(' · ')}
                {' · '}<span className={poem.reviewStatus === 'reviewed' ? 'a-flag a-flag--ok' : 'a-flag a-flag--warn'}>{poem.reviewStatus === 'reviewed' ? L('பாடம் சரிபார்த்தது', 'Text verified') : L('பாடம் சரிபார்க்கப்படவில்லை', 'Text unverified')}</span></p>
              <ol className="a-lines">
                {poem.lines.map((l, i) => {
                  const here = form.poem_id === poem.id && form.line === String(i + 1);
                  const cited = poemCites.filter((c) => c.line === String(i + 1));
                  return (
                    <li key={i} className={here ? 'is-picked' : undefined}>
                      <button type="button" onClick={() => pickLine(i + 1)} aria-pressed={here} aria-label={L(`அடி ${i + 1} ஐத் தேர்ந்தெடு`, `Choose line ${i + 1}`)}>{i + 1}</button>
                      <span lang="ta">{here && form.form ? highlight(l, form.form) : l}</span>
                      {cited.map((c) => <button key={c.id} type="button" className="a-tag a-tag--btn" onClick={() => load(c)} title={c.id}>{data.tables.entries.find((e) => e.id === c.entry_id)?.headword ?? c.entry_id}</button>)}
                    </li>
                  );
                })}
              </ol>
              {poem.readings.length > 0 && <p className="a-muted">{L('பாட வேறுபாடுகள்', 'Reading notes')}: {poem.readings.map((r) => `${r.line}: ${r.note}`).join(' · ')}</p>}
              <p className="a-muted">{poem.provenance} <Link to={`/works/${poem.workId}/${poem.number}`} target="_blank" rel="noreferrer">{L('தளத்தில் ↗', 'On site ↗')}</Link></p>
            </article>
          ) : <p className="a-empty">{L('இந்த எண்ணில் பாடல் content/poems இல் இல்லை.', 'No poem with this number in content/poems.')}</p>}
        </Section>

        <Section title={mode === 'create' ? L('புதிய மேற்கோள்', 'New citation') : L('மேற்கோளைத் திருத்து', 'Edit citation')} id="cite-form"
          actions={mode === 'update' ? <button type="button" className="a-btn a-btn--small a-btn--ghost" onClick={reset}>+ {L('புதியது', 'New')}</button> : undefined}>
          <form className="a-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="a-grid a-grid--2">
              <label className="a-field"><span>{L('சொல்', 'Entry')}</span>
                <select value={form.entry_id} required onChange={(e) => {
                  const entryId = e.target.value;
                  const p = poemOf(form.poem_id);
                  setForm((f) => ({ ...f, entry_id: entryId, sense_id: '', ...(mode === 'create' && p && entryId ? { id: suggestId(entryId, p.workId, p.number, data.tables.citations) } : {}) }));
                }}>
                  <option value="">—</option>
                  {data.tables.entries.map((e) => <option key={e.id} value={e.id}>{e.headword} · {e.id}</option>)}
                </select>
              </label>
              <label className="a-field"><span>{L('பொருள்', 'Sense')}</span>
                <select value={form.sense_id} onChange={(e) => set('sense_id', e.target.value)}>
                  <option value="">{L('(எப்பொருளும் குறிப்பிடவில்லை)', '(no particular sense)')}</option>
                  {senses.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.definition_ta.slice(0, 60)}</option>)}
                </select>
              </label>
              <label className="a-field"><span>{L('பாடல் · அடி', 'Poem · line')}</span>
                <input value={form.poem_id ? `${form.poem_id} : ${form.line}` : ''} readOnly placeholder={L('இடப்புறம் ஒரு அடியைத் தேர்ந்தெடுக்கவும்', 'Choose a line in the poem')} aria-describedby="line-help" />
                <small id="line-help">{L('பாடலில் அடி எண்ணை அழுத்தவும்.', 'Press a line number in the poem.')}</small>
              </label>
              <label className="a-field"><span>{L('அடியில் உள்ள வடிவம் (சரியாக)', 'Form exactly as in the line')}</span>
                <input lang="ta" className="a-ta" value={form.form} onChange={(e) => set('form', e.target.value)} required aria-invalid={Boolean(form.form && lineText && !formOk)} />
              </label>
            </div>
            {lineText && (
              <blockquote className={`a-quote ${formOk ? 'is-ok' : 'is-bad'}`}>
                <p lang="ta">{highlight(lineText, form.form)}</p>
                <footer>{formOk ? L('வடிவம் அடியில் உள்ளது ✓', 'Form found in the line ✓') : L('இவ்வடிவம் அடியில் இல்லை — அடியிலுள்ளபடியே எழுதவும் (புணர்ச்சி உட்பட).', 'This form is not in the line — type it exactly as printed, sandhi included.')}</footer>
              </blockquote>
            )}
            {lineText && <p className="a-words">{L('சொல்லை அழுத்தி நிரப்பலாம்:', 'Or press a word:')} {lineText.split(/\s+/).filter(Boolean).map((w, i) => <button key={i} type="button" className="a-tag a-tag--btn" lang="ta" onClick={() => set('form', w.replace(/[.,;!?]+$/, ''))}>{w}</button>)}</p>}
            <div className="a-grid a-grid--2">
              <label className="a-field"><span>{L('ஆதாரம்', 'Source')}</span><SourceSelect value={form.source_id} onChange={(v) => set('source_id', v)} /></label>
              <label className="a-field"><span>{L('அடையாளம் (id)', 'Citation ID')}</span>
                <input value={form.id} readOnly={mode === 'update'} onChange={(e) => set('id', e.target.value.toLowerCase())} required pattern="[a-z0-9][a-z0-9\-]*" /></label>
            </div>
            <label className="a-check"><input type="checkbox" checked={form.review_status === 'reviewed'} onChange={(e) => set('review_status', e.target.checked ? 'reviewed' : 'unreviewed')} /> {L('அச்சுப் பதிப்புடன் ஒப்பிட்டுச் சரிபார்த்தேன்', 'I verified this citation against a print edition')}</label>
            <label className="a-check"><input type="checkbox" checked={form.featured === 'y'} onChange={(e) => set('featured', e.target.checked ? 'y' : '')} /> {L('முதன்மை மேற்கோள் (சொல் பக்கத்திலும் இன்றைய சொல்லிலும் காட்டப்படும்)', 'Featured quotation (shown on the entry and used by the word of the day)')}</label>
            {entry && <p className="a-muted">{L('சொல்', 'Entry')}: <Link to={`/admin/entry/${entry.id}`} lang="ta">{entry.headword}</Link></p>}
            <div className="a-actions">
              <button type="submit" className="a-btn a-btn--primary" disabled={busy || !formOk || !form.entry_id || !form.id}>{mode === 'create' ? L('மேற்கோளைச் சேர்', 'Add citation') : L('சேமி', 'Save citation')}</button>
              {mode === 'update' && <button type="button" className="a-btn a-btn--danger" disabled={busy} onClick={() => void remove()}>{L('நீக்கு', 'Delete')}</button>}
            </div>
          </form>
        </Section>
      </div>

      <Section title={L('எல்லா மேற்கோள்களும்', 'All citations')} id="all-cites"
        actions={<label className="a-field a-field--inline"><span>{L('காட்டு', 'Show')}</span>
          <select value={show} onChange={(e) => setShow(e.target.value as Flag | '')}>
            <option value="">{L('எல்லாம்', 'All')} ({flagged.length})</option>
            {(Object.keys(flagLabel) as Flag[]).map((f) => <option key={f} value={f}>{flagLabel[f]} ({flagged.filter((x) => x.flags.includes(f)).length})</option>)}
          </select></label>}>
        <div className="a-table-wrap">
          <table className="a-table a-table--dense">
            <thead><tr><th scope="col">{L('சொல்', 'Entry')}</th><th scope="col">{L('மேற்கோள்', 'Quotation')}</th><th scope="col">{L('இடம்', 'Where')}</th><th scope="col">{L('நிலை', 'Flags')}</th><th scope="col"><span className="visually-hidden">{L('செயல்', 'Action')}</span></th></tr></thead>
            <tbody>
              {shown.map(({ c, flags }) => {
                const p = poemOf(c.poem_id);
                const l = p?.lines[Number(c.line) - 1];
                return (
                  <tr key={c.id}>
                    <th scope="row"><Link to={`/admin/entry/${c.entry_id}`} lang="ta">{data.tables.entries.find((e) => e.id === c.entry_id)?.headword ?? c.entry_id}</Link></th>
                    <td lang="ta">{l ? highlight(l, c.form) : '—'}</td>
                    <td className="a-nowrap">{c.poem_id}:{c.line}{c.featured === 'y' && <> <span className="a-tag">{L('முதன்மை', 'Featured')}</span></>}</td>
                    <td>{flags.length ? flags.map((f) => <span key={f} className={`a-flag ${f === 'unverified' ? 'a-flag--warn' : 'a-flag--bad'}`}>{flagLabel[f]}</span>) : <span className="a-flag a-flag--ok">{L('சரிபார்த்தது', 'Verified')}</span>}</td>
                    <td><button type="button" className="a-btn a-btn--tiny a-btn--ghost" onClick={() => { load(c); window.scrollTo({ top: 0 }); }}>{L('திருத்து', 'Edit')}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={L('ஆதாரம் இல்லாத சொற்கள்', 'Entries with no source')} id="no-source">
        <p className="a-note">{L('இவற்றுக்கு எந்தப் பாடல் மேற்கோளும் இல்லை; தளத்தில் "ஆதாரம் இன்னும் சேர்க்கப்படவில்லை" எனக் காட்டப்படும்.', 'These have no poem citation; the site shows them as "No cited source added yet".')}</p>
        <p className="a-chips">{noSource.length ? noSource.map((e) => <Link key={e.id} className="a-flag a-flag--bad" to={`/admin/entry/${e.id}`} lang="ta">{e.headword}</Link>) : '—'}</p>
      </Section>
    </>
  );
}

function suggestId(entryId: string, workId: string, number: string, all: Row[]) {
  const base = `c-${entryId}-${ABBR[workId] ?? workId}${number}`;
  let id = base, n = 2;
  while (all.some((c) => c.id === id)) id = `${base}-${n++}`;
  return id;
}
