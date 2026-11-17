import { Link } from 'react-router-dom';
import { coverage, works } from '../data';
import { Breadcrumb } from '../components/common';
import { usePageTitle } from '../utils/usePageTitle';

export default function WorksPage() {
  usePageTitle('நூல்கள்');
  return (
    <main id="main-content" className="page">
      <div className="container">
        <Breadcrumb items={[{ to: '/', label: 'அகராதி' }, { label: 'நூல்கள்' }]} />
        <h1 className="page-title">நூல்கள்</h1>
        <p className="page-lede">
          இக்களஞ்சியத்தில் பாடல் மூலம் சேர்க்கப்பட்ட நூல்களை முழுமையாகப் படிக்கலாம்; அவற்றின் சொற்கள் அகராதிப் பதிவுகளுடன் இணைக்கப்பட்டுள்ளன.
          மற்ற நூல்கள் பெயரளவில் மட்டும் பட்டியலிடப்பட்டுள்ளன.
        </p>
        <ul className="work-list">
          {works.map((w) => {
            const n = coverage.works[w.id]?.poems ?? 0;
            return (
              <li key={w.id} className={n ? '' : 'is-pending'}>
                <div className="work-list__title">
                  {n ? <Link to={`/works/${w.id}`} lang="ta">{w.title}</Link> : <span lang="ta">{w.title}</span>}
                  <span className="work-list__type">{w.type}</span>
                </div>
                <p className="work-list__desc" lang="ta">{w.description}</p>
                <p className="work-list__cov">
                  {n
                    ? <>இக்களஞ்சியத்தில்: {n} பாடல்கள் ({coverage.works[w.id].numbers[0]}–{coverage.works[w.id].numbers.at(-1)}){w.poemCount ? ` / மொத்தம் ${w.poemCount}` : ''}</>
                    : 'பாடல்கள் இன்னும் சேர்க்கப்படவில்லை'}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
