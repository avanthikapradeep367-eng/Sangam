import type { HTMLAttributes, ReactNode } from 'react';
import { CornerOrnament } from './Art';

/**
 * The open book that every page sits in. It is HTML and CSS (leather boards, stacked page
 * edges, parchment leaves, a shaded gutter); only the ornaments are SVG. Text inside the
 * leaves is ordinary, selectable, accessible content.
 *
 *   spread — two facing leaves (dictionary explorer); stacks to one column on small screens
 *   flat   — one wide sheet across the opening (home page)
 *   single — a single leaf (interior pages: search, poems, saved words…)
 */
export function Book({ variant = 'single', className = '', children }: {
  variant?: 'spread' | 'flat' | 'single'; className?: string; children: ReactNode;
}) {
  return (
    <div className={`book book--${variant} ${className}`}>
      <div className="book__edges" aria-hidden="true" />
      <div className="book__pages">{children}</div>
    </div>
  );
}

export function Leaf({ side, className = '', children, ...rest }: {
  side?: 'left' | 'right'; children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section className={`leaf${side ? ` leaf--${side}` : ''} ${className}`} {...rest}>
      <Corners />
      {children}
    </section>
  );
}

export function Corners() {
  return (
    <span className="corners" aria-hidden="true">
      <CornerOrnament className="corner corner--tl" />
      <CornerOrnament className="corner corner--tr" />
      <CornerOrnament className="corner corner--bl" />
      <CornerOrnament className="corner corner--br" />
    </span>
  );
}
