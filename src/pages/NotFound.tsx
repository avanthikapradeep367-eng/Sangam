import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../utils/usePageTitle';

export default function NotFound({ title = 'பக்கம் கிடைக்கவில்லை', children }: { title?: string; children?: ReactNode }) {
  usePageTitle(title);
  return (
    <main id="main-content" className="page">
      <div className="container">
        <h1 className="page-title">{title}</h1>
        {children ?? <p><Link to="/">அகராதி முகப்புக்குச் செல்க</Link></p>}
      </div>
    </main>
  );
}
