import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdmin, type EntryInfo, type Issue } from './context';
import { StatusBadge } from './ui';
import { list } from './api';
import { tamilCollator } from '../utils/tamil';

const TINAI = ['குறிஞ்சி', 'முல்லை', 'மருதம்', 'நெய்தல்', 'பாலை'];
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Counts and the review queue. Filters live in the URL, so a filtered queue can be bookmarked. */
export default function Overview() {
  const { data, infos, L } = useAdmin();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'draft';
  const cite = params.get('cite') ?? '';
  const topic = params.get('topic') ?? '';
  const tinai = params.get('tinai') ?? '';
  const issue = params.get('issue') ?? '';
  const q = params.get('q') ?? '';
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p, { replace: true });
  };

  const counts = useMemo(() => ({
    draft: infos.filter((i) => i.row.status === 'draft').length,
    demo: infos.filter((i) => i.row.status === 'demo').length,
    reviewed: infos.filter((i) => i.row.status === 'reviewed').length,
    noVerified: infos.filter((i) => i.verified === 0).length,
    noCitation: infos.filter((i) => i.citations.length === 0).length,
    incomplete: infos.filter((i) => i.issues.length > 0).length,
  }), [infos]);

  const rows = useMemo(() => {
    const needle = q.trim();
    const n = fold(needle);
    return infos.filter((i) => {
      if (status !== 'all' && i.row.status !== status) return false;
      if (cite === 'none' && i.citations.length) return false;
      if (cite === 'unverified' && i.verified > 0) return false;
      if (cite === 'verified' && i.verified === 0) return false;
      if (topic && !i.topics.includes(topic)) return false;
      if (tinai && i.row.tinai !== tinai) return false;
      if (issue && !i.issues.includes(issue as Issue)) return false;
      if (needle) {
        const hit = i.row.headword.includes(needle)
          || fold(i.row.transliteration).includes(n)
          || list(i.row.roman_aliases).some((a) => fold(a).includes(n))
          || i.english.some((e) => e.toLowerCase().includes(needle.toLowerCase()))
          || i.senses.some((s) => s.definition_ta.includes(needle))
          || i.id.includes(n);
        if (!hit) return false;
      }
      return true;
    }).sort((a, b) => tamilCollator.compare(a.row.headword, b.row.headword));
  }, [infos, status, cite, topic, tinai, issue, q]);

  const issueLabel: Record<Issue, string> = {
    translit: L('ஒலிபெயர்ப்பு இல்லை', 'No transliteration'),
    english: L('ஆங்கில வரி இல்லை', 'Missing English line'),
    languages: L('சில மொழிபெயர்ப்புகள் இல்லை', 'Missing translations'),
  };
  const topicLabel = (id: string) => data.topics.find((t) => t.id === id)?.label ?? id;

  return (
    <>
      <header className="a-head">
        <h1>{L('மேலோட்டம்', 'Overview')}</h1>
        <p className="a-sub">{L(`content/ இல் ${infos.length} சொற்கள் · ${data.tables.citations.length} மேற்கோள்கள் · ${data.poems.length} பாடல்கள்`,
          `${infos.length} entries · ${data.tables.citations.length} citations · ${data.poems.length} poems in content/`)}</p>
      </header>

      <ul className="a-stats">
        <Stat n={counts.draft} label={L('மதிப்பாய்வுக்குக் காத்திருப்பவை', 'Awaiting review')} sub={counts.demo ? L(`+ ${counts.demo} மாதிரி`, `+ ${counts.demo} demo`) : undefined} onClick={() => setParams({ status: 'draft' }, { replace: true })} />
        <Stat n={counts.reviewed} label={L('ஒப்புதல் பெற்றவை', 'Approved')} onClick={() => setParams({ status: 'reviewed' }, { replace: true })} />
        <Stat n={counts.noVerified} label={L('சரிபார்த்த மேற்கோள் இல்லாதவை', 'No verified citation')} sub={L(`${counts.noCitation} இல் மேற்கோளே இல்லை`, `${counts.noCitation} with no citation at all`)} onClick={() => setParams({ status: 'all', cite: 'unverified' }, { replace: true })} />
        <Stat n={counts.incomplete} label={L('விடுபட்ட / முழுமையற்ற புலங்கள்', 'Missing or incomplete fields')} onClick={() => setParams({ status: 'all', issue: 'translit' }, { replace: true })} />
      </ul>
      <p className="a-note">{L(
        'முழுமையற்றவை = ஒலிபெயர்ப்பு இல்லை, அல்லது ஒரு பொருளுக்கு ஆங்கில வரி இல்லை, அல்லது languages.json இல் உள்ள ஒரு மொழியில் மொழிபெயர்ப்பு இல்லை.',
        'Incomplete = no transliteration, a meaning without its English line, or a meaning missing a translation in one of the languages in languages.json.')}
        {data.vocabImported === 0 && ' ' + L('இறக்குமதி செய்த நவீனச் சொற்றொகுதி இக்கணினியில் இல்லை; அதற்கு /editor பயன்படும்.', 'The imported modern vocabulary is not on this computer; it is reviewed in /editor.')}
      </p>

      <section className="a-section" aria-labelledby="queue-title">
        <div className="a-section__head"><h2 id="queue-title">{L('மதிப்பாய்வு வரிசை', 'Review queue')}</h2>
          <Link className="a-btn a-btn--small" to="/admin/entry/new">+ {L('புதிய சொல்', 'New entry')}</Link></div>
        <div className="a-filters" role="search">
          <label className="a-field a-field--grow"><span>{L('தேடு: தமிழ்ச் சொல், ஆங்கிலப் பொருள், ஒலிபெயர்ப்பு', 'Search: Tamil headword, English meaning, transliteration')}</span>
            <input type="search" value={q} onChange={(e) => set('q', e.target.value)} placeholder="அறம் · virtue · aram" />
          </label>
          <label className="a-field"><span>{L('நிலை', 'Review status')}</span>
            <select value={status} onChange={(e) => set('status', e.target.value === 'draft' ? '' : e.target.value)}>
              <option value="draft">{L('காத்திருப்பவை (வரைவு)', 'Awaiting review (draft)')}</option>
              <option value="reviewed">{L('ஒப்புதல்', 'Approved')}</option>
              <option value="demo">{L('மாதிரி', 'Demo')}</option>
              <option value="all">{L('எல்லாம்', 'All')}</option>
            </select>
          </label>
          <label className="a-field"><span>{L('மேற்கோள்', 'Citations')}</span>
            <select value={cite} onChange={(e) => set('cite', e.target.value)}>
              <option value="">{L('எல்லாம்', 'Any')}</option>
              <option value="unverified">{L('சரிபார்த்தது இல்லை', 'No verified citation')}</option>
              <option value="none">{L('மேற்கோளே இல்லை', 'No citation at all')}</option>
              <option value="verified">{L('சரிபார்த்தது உண்டு', 'Has a verified citation')}</option>
            </select>
          </label>
          <label className="a-field"><span>{L('தலைப்பு', 'Topic')}</span>
            <select value={topic} onChange={(e) => set('topic', e.target.value)}>
              <option value="">{L('எல்லாம்', 'Any')}</option>
              {data.topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="a-field"><span>திணை</span>
            <select value={tinai} onChange={(e) => set('tinai', e.target.value)}>
              <option value="">{L('எல்லாம்', 'Any')}</option>
              {TINAI.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="a-field"><span>{L('குறைபாடு', 'Missing field')}</span>
            <select value={issue} onChange={(e) => set('issue', e.target.value)}>
              <option value="">{L('எல்லாம்', 'Any')}</option>
              {(Object.keys(issueLabel) as Issue[]).map((k) => <option key={k} value={k}>{issueLabel[k]}</option>)}
            </select>
          </label>
        </div>
        <p className="a-count" role="status">{L(`${rows.length} சொற்கள்`, `${rows.length} entries`)}</p>

        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th scope="col">{L('சொல்', 'Headword')}</th>
                <th scope="col">{L('பொருள்', 'Meaning')}</th>
                <th scope="col">{L('நிலை', 'Status')}</th>
                <th scope="col">{L('மேற்கோள்', 'Citations')}</th>
                <th scope="col">{L('கவனிக்க', 'To fix')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => <QueueRow key={i.id} info={i} issueLabel={issueLabel} topicLabel={topicLabel} />)}
            </tbody>
          </table>
          {!rows.length && <p className="a-empty">{L('இவ்வடிகட்டிகளுக்குச் சொல் இல்லை.', 'No entries match these filters.')}</p>}
        </div>
      </section>
    </>
  );
}

function Stat({ n, label, sub, onClick }: { n: number; label: string; sub?: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" className="a-stat" onClick={onClick}>
        <span className="a-stat__n">{n}</span>
        <span className="a-stat__label">{label}</span>
        {sub && <span className="a-stat__sub">{sub}</span>}
      </button>
    </li>
  );
}

function QueueRow({ info, issueLabel, topicLabel }: { info: EntryInfo; issueLabel: Record<Issue, string>; topicLabel: (id: string) => string }) {
  const { L } = useAdmin();
  const first = info.senses[0];
  return (
    <tr>
      <th scope="row">
        <Link to={`/admin/entry/${info.id}`} className="a-hw" lang="ta">{info.row.headword}{info.row.homograph && <sup>{info.row.homograph}</sup>}</Link>
        <span className="a-translit" lang="ta-Latn">{info.row.transliteration || '—'}</span>
        <span className="a-id">{info.id}</span>
      </th>
      <td>
        <span lang="ta" className="a-def">{first?.definition_ta ?? '—'}</span>
        {info.english[0] && <span lang="en" className="a-en">{info.english.filter(Boolean).join('; ')}</span>}
        <span className="a-tags">
          {info.row.tinai && <span className="a-tag">திணை: {info.row.tinai}</span>}
          {info.topics.map((t) => <span key={t} className="a-tag">{topicLabel(t)}</span>)}
        </span>
      </td>
      <td><StatusBadge status={info.row.status} /></td>
      <td>
        {info.citations.length === 0
          ? <span className="a-flag a-flag--bad">{L('ஆதாரம் இல்லை', 'No source')}</span>
          : <span className={info.verified ? 'a-flag a-flag--ok' : 'a-flag a-flag--warn'}>{L(`${info.verified}/${info.citations.length} சரிபார்த்தவை`, `${info.verified}/${info.citations.length} verified`)}</span>}
      </td>
      <td>{info.issues.length ? info.issues.map((k) => <span key={k} className="a-flag a-flag--warn">{issueLabel[k]}</span>) : <span className="a-flag a-flag--ok">✓</span>}</td>
    </tr>
  );
}
