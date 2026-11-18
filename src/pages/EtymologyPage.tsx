import { Link } from 'react-router-dom';
import { entries, entryPath, headwordLabel } from '../data';
import { Breadcrumb, EmptyState, SourceName } from '../components/common';
import { usePageTitle } from '../utils/usePageTitle';
import { dictionaryPath } from '../utils/wordOfDay';

/**
 * Index of etymologies. Only notes recorded in content/notes.csv with kind "etymology" and a
 * named source are listed; nothing is derived or guessed here.
 */
export default function EtymologyPage() {
  usePageTitle('சொற்பிறப்பியல்');
  const rows = entries.flatMap((e) => e.notes.filter((n) => n.kind === 'etymology').map((n) => ({ e, n })));

  return (
    <main id="main-content" className="page">
      <div className="container">
        <Breadcrumb items={[{ to: dictionaryPath(), label: 'அகராதி' }, { label: 'சொற்பிறப்பியல்' }]} />
        <h1 className="page-title">சொற்பிறப்பியல் <span className="page-title__en" lang="en">Etymology</span></h1>
        <p className="page-lede">
          சொற்களின் தோற்றமும் வரலாறும். ஒவ்வொரு குறிப்பும் அச்சிட்ட அகராதி அல்லது ஆய்வு நூலை ஆதாரமாகக் கொண்டு மட்டுமே சேர்க்கப்படுகிறது.
        </p>
        {rows.length === 0 ? (
          <EmptyState title="சொற்பிறப்புக் குறிப்புகள் இன்னும் சேர்க்கப்படவில்லை">
            <p>
              ஆதாரம் இல்லாத சொற்பிறப்பு விளக்கங்களை இத்தளம் வெளியிடுவதில்லை. குறிப்புகளைச் சேர்க்கும் முறை: <code>content/notes.csv</code>, <code>kind = etymology</code> (DATA.md).
            </p>
            <p><Link to={dictionaryPath()}>அகராதிக்குத் திரும்பு</Link></p>
          </EmptyState>
        ) : (
          <ul className="etym-list">
            {rows.map(({ e, n }) => (
              <li key={n.id}>
                <Link to={entryPath(e.id)} lang="ta" className="etym-list__word">{headwordLabel(e)}</Link>
                <p lang="ta">{n.text}</p>
                <p className="note__src">ஆதாரம்: <SourceName id={n.sourceId} /></p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
