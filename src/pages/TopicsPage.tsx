import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { Topic } from '../types';
import { entriesByTopic, topicById, topicChildren, topics } from '../data';
import EntryRow from '../components/EntryRow';
import LanguageSelector from '../components/LanguageSelector';
import { Breadcrumb, EmptyState } from '../components/common';
import { usePageTitle } from '../utils/usePageTitle';
import NotFound from './NotFound';

const PAGE_SIZE = 50;
const count = (t: Topic) => entriesByTopic.get(t.id)?.length ?? 0;

function TopicLabel({ t }: { t: Topic }) {
  return (
    <>
      {t.code && <span className="topic__code">{t.code}</span>}
      <span lang="ta">{t.label}</span>
      <span className="letter__count"> {count(t)}</span>
    </>
  );
}

function TopicTree({ parent }: { parent: string }) {
  const kids = topicChildren.get(parent) ?? [];
  if (!kids.length) return null;
  return (
    <ul className="topic-tree">
      {kids.map((t) => (
        <li key={t.id}>
          {count(t) > 0 ? <Link to={`/topics/${t.id}`}><TopicLabel t={t} /></Link> : <span className="is-empty"><TopicLabel t={t} /></span>}
          <TopicTree parent={t.id} />
        </li>
      ))}
    </ul>
  );
}

function TopicIndex() {
  usePageTitle('தலைப்புகள்');
  const sangam = topics.filter((t) => t.scheme === 'sangam');
  const groups = topics.filter((t) => t.scheme === 'modern' && !t.parent);
  return (
    <main id="main-content" className="page">
      <div className="container">
        <Breadcrumb items={[{ to: '/', label: 'அகராதி' }, { label: 'தலைப்புகள்' }]} />
        <h1 className="page-title">தலைப்பு வாரியாக</h1>

        <section className="home__section" aria-labelledby="t-sangam">
          <h2 id="t-sangam" className="section-title">சங்கச் சொல்லகராதி</h2>
          <ul className="chips chips--links">
            {sangam.map((t) => <li key={t.id}><Link className="chip" to={`/topics/${t.id}`}>{t.label} ({count(t)})</Link></li>)}
            <li><Link className="chip" to="/tinai">திணை</Link></li>
          </ul>
        </section>

        <section className="home__section" aria-labelledby="t-mc">
          <h2 id="t-mc" className="section-title">நவீனத் தமிழ்ச் சொற்கள் — பொருள் வகைப்பாடு</h2>
          <p className="section-note">
            ஒரு சொல் ஒன்றுக்கு மேற்பட்ட தலைப்புகளில் வரலாம்.
          </p>
          {groups.map((g) => (
            <details key={g.id} className="topic-group" open>
              <summary><TopicLabel t={g} /></summary>
              <TopicTree parent={g.id} />
            </details>
          ))}
        </section>
      </div>
    </main>
  );
}

export default function TopicsPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const topic = id ? topicById.get(id) : undefined;
  usePageTitle(topic ? `${topic.label} — தலைப்பு` : 'தலைப்புகள்');
  if (!id) return <TopicIndex />;
  if (!topic) return <NotFound title="இந்தத் தலைப்பு இல்லை"><p><Link to="/topics">எல்லாத் தலைப்புகளும்</Link></p></NotFound>;

  const trail: Topic[] = [];
  for (let t = topic.parent ? topicById.get(topic.parent) : undefined; t; t = t.parent ? topicById.get(t.parent) : undefined) trail.unshift(t);
  const list = entriesByTopic.get(topic.id) ?? [];
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(params.get('page')) || 1));
  const kids = topicChildren.get(topic.id) ?? [];

  return (
    <main id="main-content" className="page">
      <div className="container">
        <Breadcrumb items={[
          { to: '/', label: 'அகராதி' }, { to: '/topics', label: 'தலைப்புகள்' },
          ...trail.map((t) => ({ to: `/topics/${t.id}`, label: t.code ? `${t.code} ${t.label}` : t.label })),
          { label: topic.label },
        ]} />
        <h1 className="page-title">
          {topic.code && <span className="topic__code">{topic.code}</span>} {topic.label}
        </h1>
        {kids.length > 0 && (
          <ul className="chips chips--links">
            {kids.map((t) => <li key={t.id}><Link className="chip" to={`/topics/${t.id}`}>{t.code} {t.label} ({count(t)})</Link></li>)}
          </ul>
        )}
        <div className="results-bar">
          <p className="results-count" role="status">
            {list.length} சொற்கள்{pages > 1 && ` · பக்கம் ${page} / ${pages}`}
          </p>
          <LanguageSelector />
        </div>
        {list.length === 0 ? (
          <EmptyState title="இத்தலைப்பில் சொற்கள் இன்னும் இல்லை" />
        ) : (
          <ul className="entry-list">{list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((e) => <EntryRow key={e.id} entry={e} />)}</ul>
        )}
        {pages > 1 && (
          <nav className="pager" aria-label="பக்கங்கள்">
            {page > 1 ? <Link to={`?page=${page - 1}`} rel="prev">← முந்தைய</Link> : <span />}
            <ol>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <li key={p}>{p === page ? <span aria-current="page">{p}</span> : <Link to={`?page=${p}`}>{p}</Link>}</li>
              ))}
            </ol>
            {page < pages ? <Link to={`?page=${page + 1}`} rel="next">அடுத்த →</Link> : <span />}
          </nav>
        )}
      </div>
    </main>
  );
}
