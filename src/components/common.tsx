import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { copyText } from '../utils/citation';
import { savedWords, useSavedWords } from '../utils/storage';
import { sourceById } from '../data';
import type { Collection, MeaningOrigin, ReviewStatus, SenseUsage } from '../types';
import { ORIGIN_LABEL } from '../utils/languages';

/** Text with [start, end) ranges wrapped in <mark>. */
export function Marked({ text, ranges, markClass }: { text: string; ranges: [number, number][]; markClass?: string }) {
  if (!ranges.length) return <>{text}</>;
  const out: ReactNode[] = [];
  let at = 0;
  [...ranges].sort((a, b) => a[0] - b[0]).forEach(([s, e], i) => {
    if (s < at) return;
    if (s > at) out.push(text.slice(at, s));
    out.push(<mark key={i} className={markClass}>{text.slice(s, e)}</mark>);
    at = e;
  });
  out.push(text.slice(at));
  return <>{out}</>;
}

/**
 * Breadcrumb trail set as a book's running head: the path on the left and, on the right,
 * the current work or letter, like the heading at the top of a printed page.
 */
export function Breadcrumb({ items, running }: { items: { to?: string; label: ReactNode }[]; running?: ReactNode }) {
  return (
    <nav className="breadcrumb" aria-label="வழித்தடம்">
      {running && <span className="breadcrumb__running" lang="ta">{running}</span>}
      <ol>
        {items.map((it, i) => (
          <li key={i}>
            {it.to ? <Link to={it.to}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Polite live region shared by copy/save feedback. */
function useAnnounce(): [string, (msg: string) => void] {
  const [msg, setMsg] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [msg, (m) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(''), 2500);
  }];
}

export function CopyButton({ text, label, done = 'நகலெடுக்கப்பட்டது', className = 'tool-btn' }: {
  text: () => string; label: ReactNode; done?: string; className?: string;
}) {
  const [msg, announce] = useAnnounce();
  return (
    <>
      <button type="button" className={className} onClick={async () => announce((await copyText(text())) ? done : 'நகலெடுக்க இயலவில்லை')}>
        {msg ? <span aria-hidden="true">✓ {msg}</span> : label}
      </button>
      <span className="visually-hidden" role="status">{msg}</span>
    </>
  );
}

export function SaveButton({ entryId, senseId }: { entryId: string; senseId?: string }) {
  const saved = useSavedWords().some((s) => s.entryId === entryId);
  return (
    <button
      type="button"
      className={`tool-btn${saved ? ' is-on' : ''}`}
      aria-pressed={saved}
      onClick={() => (saved ? savedWords.remove(entryId) : savedWords.add(entryId, senseId))}
    >
      <span aria-hidden="true">{saved ? '★' : '☆'}</span> {saved ? 'சேமிக்கப்பட்டது' : 'சேமி'}
    </button>
  );
}

export const REVIEW_LABEL: Record<ReviewStatus, string> = {
  reviewed: 'சரிபார்க்கப்பட்டது',
  unreviewed: 'சரிபார்க்கப்படவில்லை',
};

export function ReviewTag({ status, what }: { status: ReviewStatus; what?: string }) {
  return (
    <span className={`review-tag review-tag--${status}`}>
      {what ? `${what}: ` : ''}{REVIEW_LABEL[status]}
    </span>
  );
}

export function SourceName({ id }: { id: string }) {
  const s = sourceById.get(id);
  if (!s) return <>{id}</>;
  return <Link to={`/sources#${s.id}`}>{s.title}</Link>;
}

export function EmptyState({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="empty-state" role="status">
      <p className="empty-state__title">{title}</p>
      {children && <div className="empty-state__body">{children}</div>}
    </div>
  );
}

const ORIGIN_TEXT: Record<MeaningOrigin, string> = ORIGIN_LABEL;
const ORIGIN_TITLE: Record<MeaningOrigin, string> = {
  book: 'மூல அகராதியில் உள்ளபடி',
  editor: 'இத்தளத்தின் ஆசிரியர் எழுதியது',
  machine: 'கணினி / AI உருவாக்கிய மொழிபெயர்ப்பு — சரிபார்க்கப்படும் வரை நம்பகமானதாகக் கொள்ள வேண்டாம்',
  unknown: 'இப்பொருள் எங்கிருந்து வந்தது என்பது பதிவு செய்யப்படவில்லை',
};

/** Where a meaning came from. Machine translations are always labelled. */
export function OriginTag({ origin }: { origin: MeaningOrigin }) {
  return <span className={`origin-tag origin-tag--${origin}`} title={ORIGIN_TITLE[origin]}>{ORIGIN_TEXT[origin]}</span>;
}

const USAGE_LABEL: Record<SenseUsage, string> = {
  'colloquial-only': 'பேச்சுத் தமிழில் மட்டும்',
  'literary-only': 'இலக்கிய வழக்கில் மட்டும்',
  explanation: 'விளக்கம், நேர்ப்பொருள் அல்ல',
};

export function UsageTags({ usage }: { usage: SenseUsage[] }) {
  return (
    <p className="usage-tags">
      {usage.map((u) => <span key={u} className="usage-tag">{USAGE_LABEL[u]}</span>)}
    </p>
  );
}

const REVIEW_TEXT = {
  pending: 'AI படியெடுப்பு — சரிபார்க்கப்படவில்லை',
  approved: 'ஆசிரியர் ஒப்புதல் பெற்றது',
  flagged: 'ஆசிரியர் குறியிட்டது — திருத்தம் தேவை',
} as const;

/** Review state of an imported book record. */
export function ImportStatus({ status }: { status: keyof typeof REVIEW_TEXT }) {
  return <span className={`import-status import-status--${status}`}>{REVIEW_TEXT[status]}</span>;
}

/** Small label naming which dictionary a row comes from. */
export function CollectionTag({ collection }: { collection: Collection }) {
  return <span className={`collection-tag collection-tag--${collection}`}>{collection === 'modern' ? 'நவீனத் தமிழ்' : 'சங்கம்'}</span>;
}
