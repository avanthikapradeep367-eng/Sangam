import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { citationsByPoem, coverage, poemPath, poemsByWork, sourceById, workById } from '../data';
import { Breadcrumb, SourceName } from '../components/common';
import { usePageTitle } from '../utils/usePageTitle';
import NotFound from './NotFound';

export default function WorkDetailPage() {
  const { workId = '' } = useParams();
  const work = workById.get(workId);
  const [tinai, setTinai] = useState('');
  usePageTitle(work?.title ?? 'நூல் கிடைக்கவில்லை');
  if (!work) return <NotFound title="இந்த நூல் பட்டியலில் இல்லை"><p><Link to="/works">நூல்கள்</Link></p></NotFound>;

  const poems = poemsByWork.get(work.id) ?? [];
  const tinais = Array.from(new Set(poems.map((p) => p.tinai).filter((t): t is string => Boolean(t))));
  const shown = poems.filter((p) => !tinai || p.tinai === tinai);
  const source = work.sourceId ? sourceById.get(work.sourceId) : undefined;

  return (
    <main id="main-content" className="page">
      <div className="container">
        <Breadcrumb items={[{ to: '/works', label: 'நூல்கள்' }, { label: work.title }]} running={work.title} />
        <h1 className="page-title" lang="ta">{work.title}</h1>
        <p className="page-sub">{work.transliteration} · {work.type}{work.poemCount ? ` · ${work.poemCount} பாடல்கள்` : ''}</p>
        <p className="page-lede" lang="ta">{work.description}</p>

        {poems.length === 0 ? (
          <p className="section-note">இந்த நூலின் பாடல்கள் இன்னும் இக்களஞ்சியத்தில் சேர்க்கப்படவில்லை.</p>
        ) : (
          <>
            <p className="section-note">
              இக்களஞ்சியத்தில் {poems.length} பாடல்கள் உள்ளன{work.poemCount ? ` (மொத்தம் ${work.poemCount}-இல்)` : ''}.
              பதிப்பு: {source ? <SourceName id={source.id} /> : '—'}.{' '}
              {coverage.works[work.id]?.reviewedPoems === 0 && 'எந்தப் பாடலும் இன்னும் அச்சுப் பதிப்புடன் ஒப்பிடப்படவில்லை.'}{' '}
              <Link to={`/search?work=${work.id}`}>இந்நூலில் வரும் சொற்கள் →</Link>
            </p>
            {tinais.length > 1 && (
              <div className="chips" role="group" aria-label="திணை வாரியாக">
                <button type="button" className="chip" aria-pressed={!tinai} onClick={() => setTinai('')}>எல்லாம்</button>
                {tinais.map((t) => (
                  <button key={t} type="button" className="chip" aria-pressed={tinai === t} onClick={() => setTinai(t)}>{t}</button>
                ))}
              </div>
            )}
            <ol className="poem-list">
              {shown.map((p) => (
                <li key={p.id}>
                  <Link to={poemPath(p)} className="poem-list__n">{p.number}</Link>
                  <span className="poem-list__first" lang="ta">{p.lines[0]}</span>
                  <span className="poem-list__meta">
                    {[p.tinai, p.poet].filter(Boolean).join(' · ')}
                    {(citationsByPoem.get(p.id)?.length ?? 0) > 0 && <> · {citationsByPoem.get(p.id)!.length} சொல் இணைப்புகள்</>}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </main>
  );
}
