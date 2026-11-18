import { Link, useSearchParams } from 'react-router-dom';

export const PAGE_SIZE = 20;

/** Current page from ?page=, clamped to the number of pages. */
export function usePage(total: number): [number, number] {
  const [params] = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(params.get('page')) || 1));
  return [page, pages];
}

export function pageSlice<T>(items: T[], page: number): T[] {
  return items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
}

/** Numbered pages, kept in the URL so a results page can be shared and Back works. */
export default function Pagination({ page, pages }: { page: number; pages: number }) {
  const [params] = useSearchParams();
  if (pages <= 1) return null;
  const href = (n: number) => {
    const next = new URLSearchParams(params);
    if (n === 1) next.delete('page'); else next.set('page', String(n));
    return `?${next.toString()}`;
  };
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2);
  return (
    <nav className="pagination" aria-label="முடிவுப் பக்கங்கள்">
      {page > 1 ? <Link to={href(page - 1)} rel="prev">← முந்தைய</Link> : <span className="is-off">← முந்தைய</span>}
      <ol>
        {nums.map((n, i) => (
          <li key={n}>
            {i > 0 && n - nums[i - 1] > 1 && <span className="pagination__gap" aria-hidden="true">…</span>}
            {n === page ? <span aria-current="page">{n}</span> : <Link to={href(n)} aria-label={`பக்கம் ${n}`}>{n}</Link>}
          </li>
        ))}
      </ol>
      {page < pages ? <Link to={href(page + 1)} rel="next">அடுத்த →</Link> : <span className="is-off">அடுத்த →</span>}
    </nav>
  );
}
