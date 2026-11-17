import { Link, useSearchParams } from 'react-router-dom';
import { AKAM_TINAI, entries, entriesByHeadword, entryPath, poemPath, poemRef, poems } from '../data';
import { useMeaningLanguage } from '../context/LanguageContext';
import EntryRow from '../components/EntryRow';
import SenseMeaning from '../components/SenseMeaning';
import { Breadcrumb } from '../components/common';
import { usePageTitle } from '../utils/usePageTitle';

export default function TinaiPage() {
  const [params, setParams] = useSearchParams();
  const [lang] = useMeaningLanguage();
  const active = AKAM_TINAI.find((t) => t === params.get('t')) ?? AKAM_TINAI[0];
  usePageTitle(`திணை — ${active}`);

  const landscapeEntry = entriesByHeadword.get(active)?.[0];
  const landscapeSense = landscapeEntry?.senses[0];
  const tinaiPoems = poems.filter((p) => p.tinai === active);
  const tinaiWords = entries.filter((e) => e.tinai === active && e.headword !== active);
  const untagged = poems.filter((p) => p.workId === 'kuruntokai' && !p.tinai);
  const puram = Array.from(new Set(poems.filter((p) => p.tinai && !(AKAM_TINAI as readonly string[]).includes(p.tinai)).map((p) => p.tinai!)));

  return (
    <main id="main-content" className="page">
      <div className="container">
        <Breadcrumb items={[{ to: '/', label: 'அகராதி' }, { label: 'திணை' }]} />
        <h1 className="page-title">திணை</h1>
        <p className="page-lede">
          அகப்பாடல்கள் ஐந்து நிலப் பின்னணிகளில் அமைகின்றன; ஒவ்வொரு திணைக்கும் உரிய நிலம், பொழுது, தாவரம், உயிரினம், மக்கள், காதல் நிலை ஆகியவை மரபாக அமைந்துள்ளன.
          இப்பக்கம் இக்களஞ்சியத்தில் உள்ள பாடல்களையும் சொற்களையும் திணை வாரியாகத் தொகுக்கிறது.
        </p>

        <div className="tabs" role="tablist" aria-label="ஐந்திணை">
          {AKAM_TINAI.map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              id={`tab-${t}`}
              aria-selected={t === active}
              aria-controls="tinai-panel"
              tabIndex={t === active ? 0 : -1}
              onClick={() => setParams({ t }, { replace: true })}
              onKeyDown={(e) => {
                const i = AKAM_TINAI.indexOf(t);
                const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                if (!d) return;
                const next = AKAM_TINAI[(i + d + AKAM_TINAI.length) % AKAM_TINAI.length];
                setParams({ t: next }, { replace: true });
                document.getElementById(`tab-${next}`)?.focus();
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <section id="tinai-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className="tinai-panel">
          {landscapeEntry && landscapeSense && (
            <div className="tinai-panel__def">
              <SenseMeaning sense={landscapeSense} lang={lang} />
              <Link to={entryPath(landscapeEntry.id)}>“{active}” — முழுப் பதிவு →</Link>
            </div>
          )}

          <h2 className="section-title">இக்களஞ்சியத்தில் {active} திணைப் பாடல்கள் ({tinaiPoems.length})</h2>
          {tinaiPoems.length ? (
            <ul className="poem-hits">
              {tinaiPoems.map((p) => (
                <li key={p.id}>
                  <span className="poem-hits__line" lang="ta">{p.lines[0]}</span>
                  <Link to={poemPath(p)} className="poem-hits__ref">{poemRef(p)}</Link>
                  {p.speaker && <span className="muted"> · {p.speaker}</span>}
                </li>
              ))}
            </ul>
          ) : <p className="section-note">இத்திணைப் பாடல் இக்களஞ்சியத்தில் இன்னும் இல்லை.</p>}

          <h2 className="section-title">{active} நிலத்தோடு குறிக்கப்பட்ட சொற்கள் ({tinaiWords.length})</h2>
          {tinaiWords.length ? (
            <ul className="entry-list">{tinaiWords.map((e) => <EntryRow key={e.id} entry={e} />)}</ul>
          ) : <p className="section-note">இன்னும் இல்லை.</p>}
        </section>

        <section className="home__section">
          <h2 className="section-title">குறிப்புகள்</h2>
          <ul className="plain-list">
            <li>
              திணை, கூற்று ஆகியவை பாடல் மூலப் பக்கத்தில் தரப்பட்டவாறே காட்டப்படுகின்றன.
              மூலத்தில் திணை குறிப்பிடப்படாத குறுந்தொகைப் பாடல்கள்:{' '}
              {untagged.map((p, i) => <span key={p.id}>{i > 0 && ', '}<Link to={poemPath(p)}>{p.number}</Link></span>)}.
            </li>
            {puram.length > 0 && (
              <li>
                புறநானூற்றுப் பாடல்களின் புறத்திணைகள்:{' '}
                {puram.map((t, i) => (
                  <span key={t}>{i > 0 && ', '}{t} ({poems.filter((p) => p.tinai === t).map((p) => p.number).join(', ')})</span>
                ))}.
              </li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
