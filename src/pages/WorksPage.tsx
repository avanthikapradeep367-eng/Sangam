import { Link } from 'react-router-dom';
import worksRaw from '../data/works.json';
import type { LiteraryWork } from '../types';
import { getEntriesByWork } from '../utils/search';

const works = worksRaw as LiteraryWork[];

export default function WorksPage() {
  return (
    <main className="works-page" id="main-content">
      <div className="container">
        <nav className="breadcrumb" aria-label="வழித்தடம்">
          <Link to="/">முகப்பு</Link>
          <span className="breadcrumb__sep" aria-hidden="true">›</span>
          <span aria-current="page">நூல்கள்</span>
        </nav>

        <h1 className="page-title">சங்க நூல்கள்</h1>
        <p className="page-subtitle">
          இந்த அகராதியில் உள்ள சொற்கள் பயன்படுத்தப்பட்ட நூல்கள்.
        </p>

        <ul className="works-list" role="list">
          {works.map((work) => {
            const entryCount = getEntriesByWork(work.title).length;
            return (
              <li key={work.id}>
                <Link to={`/works/${work.id}`} className="work-item">
                  <div className="work-item__title">{work.title}</div>
                  <div className="work-item__meta">
                    <span className="work-item__type">{work.type}</span>
                    {work.poemCount && (
                      <span className="work-item__count">{work.poemCount} பாடல்கள்</span>
                    )}
                    {entryCount > 0 && (
                      <span className="work-item__count">{entryCount} சொற்கள்</span>
                    )}
                  </div>
                  <p className="work-item__desc">{work.description}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
