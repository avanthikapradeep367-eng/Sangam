import { useState } from 'react';
import { useAdmin } from './context';
import { Section } from './ui';
import { AdminError, post, TABLES, type Table } from './api';

interface ImportReport {
  table: string; rows: number; missingColumns: string[]; extraColumns: string[];
  added: { key: string; line: number }[];
  updated: { key: string; line: number; changes: { field: string; from: string; to: string }[] }[];
  unchanged: number;
  duplicates: { key: string; lines: number[] }[];
  missingFields: { line: number; key: string; fields: string[] }[];
  brokenRefs: { line: number; key: string; field: string; target: string }[];
  validation: string[]; warnings: string[]; blocking: number;
}

/** CSV import with a preview, validation (build:data), export, and the explicit publish step. */
export default function DataTools() {
  const { data, run, busy, L } = useAdmin();
  const [table, setTable] = useState<Table>('entries');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [allowUpdates, setAllowUpdates] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [previewErr, setPreviewErr] = useState('');
  const [log, setLog] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState(false);

  async function preview() {
    setPreviewErr(''); setReport(null);
    try { setReport((await post<{ report: ImportReport }>(data.token, 'import/preview', { table, text, allowUpdates })).report); }
    catch (e) { setPreviewErr((e as AdminError).message); }
  }
  async function apply() {
    if (!report || !confirm(L(`${report.added.length} புதியவை, ${report.updated.length} மாற்றங்கள் content/${table}.csv இல் எழுதப்படும். தொடரவா?`, `Write ${report.added.length} new and ${report.updated.length} updated rows to content/${table}.csv?`))) return;
    const r = await run('import/apply', { table, text, allowUpdates }, L('இறக்குமதி செய்யப்பட்டது.', 'Import applied.'));
    if (r) cancel();
  }
  function cancel() { setText(''); setFileName(''); setReport(null); setPreviewErr(''); }
  async function check() {
    setChecking(true);
    try { const r = await post<{ ok: boolean; log: string }>(data.token, 'check', {}); setLog({ ok: r.ok, text: r.log }); }
    catch (e) { setLog({ ok: false, text: (e as Error).message }); }
    finally { setChecking(false); }
  }
  async function publish() {
    const r = await run('publish', {}, L('build:data வெற்றி: தளத் தரவு மீண்டும் உருவாக்கப்பட்டது. உள்ளூர்த் தளத்தில் இப்போது தெரியும்.', 'build:data passed: site data regenerated. The local site shows it now.'));
    if (r?.log) setLog({ ok: true, text: r.log });
  }

  return (
    <>
      <header className="a-head"><h1>{L('இறக்குமதி · சரிபார்ப்பு · ஏற்றுமதி · வெளியீடு', 'Import · validate · export · publish')}</h1></header>

      <Section title={L('நிலை', 'Status')} id="status">
        <ul className="a-stats a-stats--small">
          <li><span className="a-stat"><span className="a-stat__n">{data.validation.errors.length}</span><span className="a-stat__label">{L('சரிபார்ப்புப் பிழைகள்', 'Validation errors')}</span></span></li>
          <li><span className="a-stat"><span className="a-stat__n">{data.validation.warnings.length}</span><span className="a-stat__label">{L('எச்சரிக்கைகள்', 'Warnings')}</span></span></li>
          <li><span className="a-stat"><span className="a-stat__n">{data.site.needsRebuild ? L('ஆம்', 'Yes') : L('இல்லை', 'No')}</span><span className="a-stat__label">{L('தளத் தரவு புதுப்பிக்க வேண்டுமா', 'Site data needs rebuild')}</span></span></li>
        </ul>
        {data.validation.errors.length > 0 && <ul className="admin-errors">{data.validation.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        {data.validation.warnings.length > 0 && <details><summary>{L('எச்சரிக்கைகள்', 'Warnings')}</summary><ul className="a-list">{data.validation.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>}
      </Section>

      <Section title={L('CSV இறக்குமதி', 'Import CSV')} id="import">
        <p className="a-note">{L('முதலில் முன்னோட்டம்; பிழை இல்லாவிட்டால் மட்டுமே பயன்படுத்த முடியும். ரத்து செய்தாலோ பிழை இருந்தாலோ கோப்புகள் மாறாது.',
          'Preview first; Apply is possible only when nothing blocks it. Cancelling, or any error, leaves the files untouched.')}</p>
        <div className="a-grid">
          <label className="a-field"><span>{L('அட்டவணை', 'Table')}</span>
            <select value={table} onChange={(e) => { setTable(e.target.value as Table); setReport(null); }}>
              {TABLES.map((t) => <option key={t} value={t}>{t}.csv</option>)}
            </select></label>
          <label className="a-field a-field--grow"><span>{L('CSV கோப்பு', 'CSV file')}</span>
            <input type="file" accept=".csv,text/csv" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setFileName(f.name); setText(await f.text()); setReport(null);
              const guess = TABLES.find((t) => f.name.toLowerCase().startsWith(t));
              if (guess) setTable(guess);
            }} /></label>
        </div>
        <p className="a-muted">{L('நெடுவரிசைகள்', 'Columns')}: <code>{data.columns[table].join(',')}</code></p>
        <label className="a-field"><span>{L('அல்லது CSV ஐ ஒட்டவும்', 'Or paste CSV')}{fileName && ` · ${fileName}`}</span>
          <textarea rows={5} className="a-mono" value={text} onChange={(e) => { setText(e.target.value); setReport(null); }} spellCheck={false} /></label>
        <label className="a-check"><input type="checkbox" checked={allowUpdates} onChange={(e) => { setAllowUpdates(e.target.checked); setReport(null); }} /> {L('இருக்கும் பதிவுகளை மாற்ற அனுமதி (அதே id)', 'Allow updates to existing rows (same id)')}</label>
        <div className="a-actions">
          <button type="button" className="a-btn" disabled={!text.trim()} onClick={() => void preview()}>{L('முன்னோட்டம்', 'Preview import')}</button>
          <button type="button" className="a-btn a-btn--primary" disabled={busy || !report || report.blocking > 0} onClick={() => void apply()}>{L('பயன்படுத்து', 'Apply import')}</button>
          <button type="button" className="a-btn a-btn--ghost" disabled={!text && !report} onClick={cancel}>{L('ரத்து', 'Cancel')}</button>
        </div>
        {previewErr && <p className="admin-alert admin-alert--error">{previewErr}</p>}
        {report && <ImportPreview r={report} />}
      </Section>

      <Section title={L('சரிபார்த்து வெளியிடு', 'Validate and publish')} id="publish">
        <ol className="a-explain">
          <li><strong>{L('சரிபார்', 'Validate')}</strong> — <code>npm run data:check</code>: {L('content/ ஐச் சரிபார்க்கும்; எதையும் எழுதாது.', 'checks content/ and writes nothing.')}</li>
          <li><strong>{L('தளத் தரவைப் புதுப்பி', 'Rebuild site data')}</strong> — <code>npm run data</code> (build:data): {L('மீண்டும் சரிபார்த்து src/data/generated ஐ உருவாக்கும்; உள்ளூர்த் தளம் உடனே மாறும். பிழை இருந்தால் எதுவும் மாறாது.', 'validates again and regenerates src/data/generated; the local site updates at once. On any error nothing changes.')}</li>
          <li><strong>{L('நேரலை', 'Live site')}</strong> — {L('content/ மாற்றங்களை commit செய்து, npm run build (இது build:data ஐயும் இயக்கும்), பிறகு dist/ ஐ deploy செய்யவும்.', 'commit the content/ changes, run npm run build (which runs build:data too), then deploy dist/.')}</li>
        </ol>
        <div className="a-actions">
          <button type="button" className="a-btn" disabled={checking} onClick={() => void check()}>{checking ? '…' : L('சரிபார் (data:check)', 'Validate (data:check)')}</button>
          <button type="button" className="a-btn a-btn--primary" disabled={busy || data.validation.errors.length > 0} onClick={() => void publish()}>{L('தளத் தரவைப் புதுப்பி (build:data)', 'Rebuild site data (build:data)')}</button>
        </div>
        {log && <pre className={`a-log ${log.ok ? 'is-ok' : 'is-bad'}`} role="status">{log.text}</pre>}
      </Section>

      <Section title={L('CSV ஏற்றுமதி', 'Export CSV')} id="export">
        <p className="a-note">{L('சேமித்துள்ளபடியே கோப்பு: id கள், வரிசை, மேற்கோள் குறிகள், தமிழ் உரை அப்படியே. இறக்குமதிக்கு மீண்டும் பயன்படுத்தலாம்.',
          'Each file exactly as stored: IDs, row order, quoting and Tamil text unchanged, ready to re-import.')}
          {data.validation.errors.length > 0 && <strong> {L('கவனம்: இப்போது சரிபார்ப்புப் பிழைகள் உள்ளன.', 'Note: validation currently reports errors.')}</strong>}</p>
        <ul className="a-exports">
          {TABLES.map((t) => <li key={t}><a className="a-btn a-btn--ghost" href={`/__admin/api/export?table=${t}`} download={`${t}.csv`}>{t}.csv <small>({data.tables[t].length} {L('வரிசைகள்', 'rows')})</small></a></li>)}
        </ul>
      </Section>
    </>
  );
}

function ImportPreview({ r }: { r: ImportReport }) {
  const { L } = useAdmin();
  return (
    <div className="a-report" role="region" aria-label={L('இறக்குமதி முன்னோட்டம்', 'Import preview')}>
      <ul className="a-chips">
        <li className="a-flag a-flag--ok">{L('புதியவை', 'New')}: {r.added.length}</li>
        <li className="a-flag a-flag--warn">{L('மாற்றங்கள்', 'Updates')}: {r.updated.length}</li>
        <li className="a-flag">{L('மாற்றம் இல்லை', 'Unchanged')}: {r.unchanged}</li>
        <li className={r.duplicates.length ? 'a-flag a-flag--bad' : 'a-flag'}>{L('இரட்டை id', 'Duplicate IDs')}: {r.duplicates.length}</li>
        <li className={r.missingFields.length ? 'a-flag a-flag--bad' : 'a-flag'}>{L('விடுபட்ட புலங்கள்', 'Missing fields')}: {r.missingFields.length}</li>
        <li className={r.brokenRefs.length ? 'a-flag a-flag--bad' : 'a-flag'}>{L('உடைந்த இணைப்புகள்', 'Broken references')}: {r.brokenRefs.length}</li>
      </ul>
      <p className={r.blocking ? 'admin-alert admin-alert--error' : 'admin-alert admin-alert--ok'}>
        {r.blocking ? L(`${r.blocking} சிக்கல்கள் — பயன்படுத்த இயலாது.`, `${r.blocking} problem(s) — cannot apply.`) : L('சிக்கல் இல்லை — பயன்படுத்தலாம்.', 'No problems — ready to apply.')}
      </p>
      {r.missingColumns.length > 0 && <p className="admin-alert admin-alert--error">{L('இல்லாத நெடுவரிசைகள்', 'Missing columns')}: {r.missingColumns.join(', ')}</p>}
      {r.extraColumns.length > 0 && <p className="a-note">{L('தெரியாத நெடுவரிசைகள் (புறக்கணிக்கப்படும்)', 'Unknown columns (ignored)')}: {r.extraColumns.join(', ')}</p>}
      {r.duplicates.length > 0 && <Problem title={L('இரட்டை id', 'Duplicate IDs')} items={r.duplicates.map((d) => `${d.key} — ${L('வரிகள்', 'lines')} ${d.lines.join(', ')}`)} />}
      {r.missingFields.length > 0 && <Problem title={L('விடுபட்ட புலங்கள்', 'Missing required fields')} items={r.missingFields.map((m) => `${L('வரி', 'line')} ${m.line} (${m.key || '—'}): ${m.fields.join(', ')}`)} />}
      {r.brokenRefs.length > 0 && <Problem title={L('உடைந்த இணைப்புகள்', 'Broken references')} items={r.brokenRefs.map((b) => `${L('வரி', 'line')} ${b.line} (${b.key}): ${b.field} → "${b.target}"`)} />}
      {r.validation.length > 0 && <Problem title={L('சரிபார்ப்பு (இணைத்த தரவு)', 'Validation of the merged data')} items={r.validation} />}
      {r.added.length > 0 && <details><summary>{L('புதிய வரிசைகள்', 'New rows')} ({r.added.length})</summary><p className="a-chips">{r.added.map((a) => <code key={a.key}>{a.key}</code>)}</p></details>}
      {r.updated.length > 0 && (
        <details open={r.updated.length <= 10}><summary>{L('மாறும் வரிசைகள்', 'Rows that change')} ({r.updated.length})</summary>
          <table className="a-table a-table--dense">
            <thead><tr><th scope="col">id</th><th scope="col">{L('புலம்', 'Field')}</th><th scope="col">{L('இப்போது', 'Current')}</th><th scope="col">{L('புதியது', 'Incoming')}</th></tr></thead>
            <tbody>{r.updated.flatMap((u) => u.changes.map((c, i) => (
              <tr key={`${u.key}-${c.field}`}>{i === 0 && <th scope="row" rowSpan={u.changes.length}>{u.key}</th>}<td>{c.field}</td><td className="a-del">{c.from || '—'}</td><td className="a-ins">{c.to || '—'}</td></tr>
            )))}</tbody>
          </table>
        </details>
      )}
    </div>
  );
}

function Problem({ title, items }: { title: string; items: string[] }) {
  return <div className="a-problem"><h3>{title}</h3><ul className="admin-errors">{items.slice(0, 50).map((x, i) => <li key={i}>{x}</li>)}</ul>{items.length > 50 && <p>… +{items.length - 50}</p>}</div>;
}
