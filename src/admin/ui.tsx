import type { ReactNode } from 'react';
import { useAdmin, useL } from './context';

export function StatusBadge({ status }: { status: string }) {
  const L = useL();
  const label = status === 'reviewed' ? L('ஒப்புதல்', 'Approved') : status === 'demo' ? L('மாதிரி', 'Demo') : L('வரைவு', 'Draft');
  return <span className={`a-badge a-badge--${status}`}>{label}</span>;
}

export function OriginBadge({ origin }: { origin: string }) {
  const L = useL();
  const label = origin === 'machine' ? L('இயந்திரம்', 'Machine') : origin === 'editor' ? L('ஆசிரியர்', 'Editor') : origin === 'book' ? L('நூல்', 'Book') : L('மூலம் தெரியாது', 'Unknown origin');
  return <span className={`a-badge a-badge--origin-${origin}`}>{label}</span>;
}

export function Section({ title, children, actions, id }: { title: ReactNode; children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section className="a-section" aria-labelledby={id}>
      <div className="a-section__head"><h2 id={id}>{title}</h2>{actions}</div>
      {children}
    </section>
  );
}

export function SourceSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const { data, L } = useAdmin();
  const known = data.sources.some((s) => s.id === value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {!value && <option value="">—</option>}
      {!known && value && <option value={value}>{value} ({L('தெரியாத ஆதாரம்', 'unknown source')})</option>}
      {data.sources.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.origin}</option>)}
    </select>
  );
}

