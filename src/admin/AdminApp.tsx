/**
 * /admin: local review and correction of the dictionary content. Development only — the route,
 * this code and its API (scripts/admin/admin-plugin.mjs) are not part of production builds.
 *
 * Edits are written to the CSV files in /content. The public pages read the compiled data in
 * src/data/generated, so a saved edit appears on the local site after "Rebuild site data", and
 * on the live site after the next build and deployment.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { LanguageSelect } from '../components/SiteControls';
import { AdminError, list, loadData, post, type AdminData, type Row } from './api';
import { AdminContext, useAdmin, useL, type Ctx, type EntryInfo, type Flash, type Issue } from './context';
import Overview from './Overview';
import EntryEditor from './EntryEditor';
import Citations from './Citations';
import WordOfDayAdmin from './WordOfDayAdmin';
import DataTools from './DataTools';
import './admin.css';

function buildIndex(d: AdminData) {
  const others = d.languages.filter((l) => !l.base).map((l) => l.code);
  const sensesBy = new Map<string, Row[]>();
  for (const s of d.tables.senses) sensesBy.set(s.entry_id, [...(sensesBy.get(s.entry_id) ?? []), s]);
  const trBy = new Map<string, Map<string, Row>>();
  for (const t of d.tables.translations) {
    const m = trBy.get(t.sense_id) ?? new Map();
    m.set(t.lang, t);
    trBy.set(t.sense_id, m);
  }
  const citBy = new Map<string, Row[]>();
  for (const c of d.tables.citations) citBy.set(c.entry_id, [...(citBy.get(c.entry_id) ?? []), c]);
  const infos: EntryInfo[] = d.tables.entries.map((row) => {
    const senses = (sensesBy.get(row.id) ?? []).slice().sort((a, b) => Number(a.number) - Number(b.number));
    const english = senses.map((s) => trBy.get(s.id)?.get('en')?.text ?? '');
    const citations = citBy.get(row.id) ?? [];
    const issues: Issue[] = [];
    if (!row.transliteration) issues.push('translit');
    if (!senses.length || english.some((e) => !e)) issues.push('english');
    if (senses.some((s) => others.some((l) => !trBy.get(s.id)?.get(l)))) issues.push('languages');
    return {
      row, id: row.id, senses, english, citations,
      verified: citations.filter((c) => c.review_status === 'reviewed').length,
      issues, topics: list(row.topics),
    };
  });
  return { infos, index: new Map(infos.map((i) => [i.id, i])) };
}

export default function AdminApp() {
  const L = useL();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState<Flash | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try { setData(await loadData()); setError(''); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => {
    let live = true;
    loadData().then((d) => { if (live) setData(d); }).catch((e) => { if (live) setError((e as Error).message); });
    return () => { live = false; };
  }, []);
  useEffect(() => { document.title = 'Admin · சொல்வளம்'; }, []);

  const derived = useMemo(() => (data ? buildIndex(data) : null), [data]);

  const run = useCallback(async (path: string, body: unknown, okText: string) => {
    if (!data) return null;
    setBusy(true);
    try {
      const r = await post(data.token, path, body);
      if (r.data) setData(r.data);
      setFlash({ kind: 'ok', text: okText, written: r.written, stage: path === 'publish' ? 'built' : 'saved' });
      return r;
    } catch (e) {
      const err = e as AdminError;
      setFlash({ kind: 'error', text: err.message, errors: err.errors });
      return null;
    } finally { setBusy(false); }
  }, [data]);

  if (error) {
    return (
      <main id="main-content" className="admin admin--error">
        <h1>Admin</h1>
        <p className="admin-alert admin-alert--error">{error}</p>
        <p>{L('இந்த நிர்வாகப் பக்கம் இக்கணினியில் npm run dev மூலம் மட்டுமே இயங்கும்.', 'This admin works only on this computer, under npm run dev.')}</p>
      </main>
    );
  }
  if (!data || !derived) return <main id="main-content" className="admin admin--loading"><p>{L('ஏற்றுகிறது…', 'Loading…')}</p></main>;

  const sourceOrigin = (id: string) => data.sources.find((s) => s.id === id)?.origin ?? 'unknown';
  const ctx: Ctx = { data, ...derived, run, reload, flash, setFlash, busy, L, sourceOrigin };

  return (
    <AdminContext.Provider value={ctx}>
      <div className="admin">
        <aside className="admin__side">
          <Link to="/admin" className="admin__brand"><span lang="ta">சொல்வளம்</span><small>{L('நிர்வாகம் · உள்ளூர்', 'Admin · local')}</small></Link>
          <nav aria-label={L('நிர்வாகப் பகுதிகள்', 'Admin sections')}>
            <ul className="admin__nav">
              <li><NavLink to="/admin" end>{L('மேலோட்டம் · மதிப்பாய்வு', 'Overview · review queue')}</NavLink></li>
              <li><NavLink to="/admin/entry/new">{L('புதிய சொல்', 'New entry')}</NavLink></li>
              <li><NavLink to="/admin/citations">{L('பாடல்கள் · மேற்கோள்கள்', 'Poems · citations')}</NavLink></li>
              <li><NavLink to="/admin/today">{L('இன்றைய சொல்', 'Word of the day')}</NavLink></li>
              <li><NavLink to="/admin/data">{L('இறக்குமதி · ஏற்றுமதி', 'Import · export · publish')}</NavLink></li>
            </ul>
          </nav>
          <SiteState />
          <div className="admin__side-foot">
            <LanguageSelect />
            <Link to="/" className="admin__site-link">{L('தளத்தைப் பார் ↗', 'View the site ↗')}</Link>
          </div>
        </aside>
        <main id="main-content" className="admin__main">
          <FlashBar />
          <Routes>
            <Route index element={<Overview />} />
            <Route path="entry/new" element={<EntryEditor key="new" />} />
            <Route path="entry/:id" element={<EntryEditor />} />
            <Route path="citations" element={<Citations />} />
            <Route path="today" element={<WordOfDayAdmin />} />
            <Route path="data" element={<DataTools />} />
            <Route path="*" element={<p>{L('இப்பகுதி இல்லை.', 'No such admin page.')} <Link to="/admin">{L('மேலோட்டம்', 'Overview')}</Link></p>} />
          </Routes>
        </main>
      </div>
    </AdminContext.Provider>
  );
}

/** Where saved content stands: in /content only, or also in the site data the pages read. */
function SiteState() {
  const { data, run, busy, L } = useAdmin();
  const { needsRebuild } = data.site;
  const errors = data.validation.errors.length;
  return (
    <section className="admin__state" aria-labelledby="site-state">
      <h2 id="site-state">{L('தள நிலை', 'Site status')}</h2>
      <p className={`state-dot ${errors ? 'is-bad' : needsRebuild ? 'is-wait' : 'is-ok'}`}>
        {errors ? L(`சரிபார்ப்புப் பிழைகள்: ${errors}`, `Validation errors: ${errors}`)
          : needsRebuild ? L('சேமித்த மாற்றங்கள் தளத் தரவில் இன்னும் இல்லை', 'Saved changes are not in the site data yet')
            : L('தளத் தரவு content/ உடன் ஒத்துள்ளது', 'Site data matches content/')}
      </p>
      {needsRebuild && !errors && (
        <button type="button" className="a-btn a-btn--small" disabled={busy}
          onClick={() => void run('publish', {}, L('தளத் தரவு மீண்டும் உருவாக்கப்பட்டது. உள்ளூர்த் தளத்தில் இப்போது தெரியும்; நேரலைக்கு build + deploy தேவை.', 'Site data rebuilt. Visible on the local site now; the live site needs a build and deploy.'))}>
          {L('தளத் தரவைப் புதுப்பி', 'Rebuild site data')}
        </button>
      )}
    </section>
  );
}

function FlashBar() {
  const { flash, setFlash, L, data } = useAdmin();
  if (!flash) return <div role="status" className="visually-hidden" />;
  return (
    <div role={flash.kind === 'error' ? 'alert' : 'status'} className={`admin-alert admin-alert--${flash.kind}`}>
      <div>
        <p><strong>{flash.text}</strong></p>
        {flash.written && (
          <p className="admin-alert__detail">
            {flash.written.length ? <>{L('எழுதப்பட்டவை', 'Written')}: {flash.written.map((w) => <code key={w}>{w}</code>)}</> : L('கோப்புகளில் மாற்றம் இல்லை.', 'No file changed.')}
          </p>
        )}
        {flash.stage === 'saved' && flash.written && flash.written.length > 0 && (
          <ol className="admin-stages" aria-label={L('வெளியீட்டு நிலைகள்', 'Publishing stages')}>
            <li className="is-done">{L('content/ இல் சேமிக்கப்பட்டது', 'Saved in content/')}</li>
            <li className={data.site.needsRebuild ? '' : 'is-done'}>{L('தளத் தரவு புதுப்பிப்பு (உள்ளூர் முன்னோட்டம்)', 'Rebuild site data (local preview)')}</li>
            <li>{L('npm run build + deploy (நேரலை)', 'npm run build + deploy (live site)')}</li>
          </ol>
        )}
        {flash.errors && flash.errors.length > 0 && <ul className="admin-errors">{flash.errors.slice(0, 30).map((e, i) => <li key={i}>{e}</li>)}</ul>}
      </div>
      <button type="button" className="a-icon" onClick={() => setFlash(null)} aria-label={L('மூடு', 'Dismiss')}>×</button>
    </div>
  );
}

