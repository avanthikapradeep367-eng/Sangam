/**
 * Decorative artwork for the book: engravings, desk objects, ornaments and line icons.
 * All of it is inline SVG drawn in a printed-engraving style (thin sepia strokes, hatching),
 * so it stays sharp at any size and carries no essential text. Every piece is aria-hidden.
 */
import type { ReactNode, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const deco = { 'aria-hidden': true, focusable: false } as const;

// ─── Ornaments ─────────────────────────────────────────────────────────────
/** Filigree for a page corner; rotate with CSS for the other three corners. */
export function CornerOrnament(props: P) {
  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" {...deco} {...props}>
      <path d="M6 114V22Q6 6 22 6h92" />
      <path d="M12 114V26Q12 12 26 12h88" strokeWidth=".6" />
      <path d="M20 60c0-18 6-30 18-34s22 2 20 12-12 10-16 4 2-12 8-10" />
      <path d="M60 20c-18 0-30 6-34 18" />
      <path d="M20 86c2-10 6-16 12-18M86 20c-10 2-16 6-18 12" strokeWidth=".8" />
      <circle cx="40" cy="40" r="2.4" fill="currentColor" stroke="none" />
      <path d="M26 46c-6 4-8 12-4 18M46 26c4-6 12-8 18-4" strokeWidth=".7" />
      <path d="M30 30l-8-8M34 24c4-6 10-8 14-6M24 34c-6 4-8 10-6 14" strokeWidth=".7" />
    </svg>
  );
}

/** A thin rule with a central flourish. */
export function Divider({ width = 520, ...props }: P & { width?: number }) {
  const c = width / 2;
  return (
    <svg viewBox={`0 0 ${width} 24`} fill="none" stroke="currentColor" strokeLinecap="round" {...deco} {...props}>
      <path d={`M4 12H${c - 46}M${c + 46} 12H${width - 4}`} strokeWidth=".9" />
      <circle cx="4" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx={width - 4} cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d={`M${c} 4l6 8-6 8-6-8z`} strokeWidth="1" />
      <circle cx={c} cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d={`M${c - 8} 12c-6-8-14-8-18-2s2 10 8 6-2-8-6-4M${c - 26} 12h-18`} strokeWidth="1" />
      <path d={`M${c + 8} 12c6-8 14-8 18-2s-2 10-8 6 2-8 6-4M${c + 26} 12h18`} strokeWidth="1" />
      <path d={`M${c - 10} 14c-4 6-12 6-16 2M${c + 10} 14c4 6 12 6 16 2`} strokeWidth=".7" />
    </svg>
  );
}

/** Round bronze medallion with a letter, flanked by scrollwork (home page). */
export function LetterEmblem({ letter = 'அ', ...props }: P & { letter?: string }) {
  return (
    <svg viewBox="0 0 320 110" {...deco} {...props}>
      <defs>
        <radialGradient id="em-face" cx="45%" cy="38%" r="70%">
          <stop offset="0" stopColor="#7a3b22" />
          <stop offset=".65" stopColor="#4a2213" />
          <stop offset="1" stopColor="#2c140b" />
        </radialGradient>
        <linearGradient id="em-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e2bf7c" />
          <stop offset=".5" stopColor="#9a6a2f" />
          <stop offset="1" stopColor="#d9b06a" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#7a5532" strokeWidth="1.2" strokeLinecap="round">
        <path d="M118 66c-16 0-26-10-40-8s-22 12-34 10M40 68c-8 0-12-6-10-10s8-4 8 0" />
        <path d="M110 74c-12 4-24 2-32-4M96 58c-6-8-16-10-22-6" strokeWidth=".8" />
        <path d="M202 66c16 0 26-10 40-8s22 12 34 10M280 68c8 0 12-6 10-10s-8-4-8 0" />
        <path d="M210 74c12 4 24 2 32-4M224 58c6-8 16-10 22-6" strokeWidth=".8" />
        <circle cx="62" cy="62" r="1.8" fill="#7a5532" /><circle cx="258" cy="62" r="1.8" fill="#7a5532" />
      </g>
      <circle cx="160" cy="54" r="48" fill="url(#em-ring)" />
      <circle cx="160" cy="54" r="48" fill="none" stroke="#5a3415" strokeWidth="1" />
      <circle cx="160" cy="54" r="41" fill="url(#em-face)" stroke="#f0d49a" strokeOpacity=".5" />
      <circle cx="160" cy="54" r="36" fill="none" stroke="#d6aa63" strokeOpacity=".55" strokeDasharray="1.5 3" />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <circle key={i} cx={160 + Math.cos(a) * 44.5} cy={54 + Math.sin(a) * 44.5} r="1.3" fill="#6b4318" />;
      })}
      <text x="160" y="72" textAnchor="middle" fontSize="50" fontFamily="'Noto Serif Tamil', serif" fontWeight="600" fill="#f1d9a6">{letter}</text>
    </svg>
  );
}

/** Literary-tree emblem for the masthead. */
export function TreeEmblem(props: P) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" {...deco} {...props}>
      <path d="M32 58V30M32 44l-9-8M32 40l9-9M32 34l-7-9M32 30l6-10M32 30V16" />
      <path d="M24 58c4-2 6-4 8-8 2 4 4 6 8 8M18 58h28" />
      {[[16, 26], [20, 18], [27, 12], [36, 11], [44, 16], [48, 24], [44, 32], [20, 33], [32, 8], [12, 34], [52, 33]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y}c3-3 6-2 6 1s-4 4-6 3-2-2 0-4`} fill="currentColor" fillOpacity=".35" />
      ))}
      <path d="M14 30c4-14 14-22 18-22s14 8 18 22" strokeWidth=".7" strokeDasharray="1 2.5" />
    </svg>
  );
}

// ─── Engravings ───────────────────────────────────────────────────────────
function hatch(x1: number, x2: number, y1: number, y2: number, step = 3) {
  const d: string[] = [];
  for (let x = x1; x <= x2; x += step) d.push(`M${x.toFixed(1)} ${y1}V${y2}`);
  return d.join('');
}

function Palm({ x, y, h, lean, s = 1 }: { x: number; y: number; h: number; lean: number; s?: number }) {
  const tx = x + lean, ty = y - h;
  const fronds = [-160, -130, -100, -70, -40, -10, 15, -190].map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const len = (26 + (i % 3) * 6) * s;
    const ex = tx + Math.cos(a) * len, ey = ty - Math.sin(a) * len * -1;
    const droop = ey + 12 * s;
    const cx = tx + Math.cos(a) * len * 0.5, cy = ty + Math.sin(a) * len * 0.5 - 6 * s;
    const leaflets: string[] = [];
    for (let t = 0.2; t < 1; t += 0.12) {
      const px = tx + (ex - tx) * t, py = ty + (droop - ty) * t + Math.sin(t * Math.PI) * -6 * s;
      leaflets.push(`M${px.toFixed(1)} ${py.toFixed(1)}l${(2 * s).toFixed(1)} ${(6 * s).toFixed(1)}M${px.toFixed(1)} ${py.toFixed(1)}l${(-2 * s).toFixed(1)} ${(6 * s).toFixed(1)}`);
    }
    return <g key={i}><path d={`M${tx} ${ty}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${droop.toFixed(1)}`} /><path d={leaflets.join('')} strokeWidth=".45" /></g>;
  });
  const rings: string[] = [];
  for (let t = 0.08; t < 0.95; t += 0.07) {
    const px = x + lean * t * t, py = y - h * t;
    rings.push(`M${(px - 2.2 * s).toFixed(1)} ${py.toFixed(1)}h${(4.4 * s).toFixed(1)}`);
  }
  return (
    <g>
      <path d={`M${x - 2.5 * s} ${y}Q${x + lean * 0.2} ${y - h * 0.5} ${tx - 1.5 * s} ${ty}M${x + 2.5 * s} ${y}Q${x + lean * 0.2 + 4 * s} ${y - h * 0.5} ${tx + 1.5 * s} ${ty}`} strokeWidth=".8" />
      <path d={rings.join('')} strokeWidth=".45" />
      {fronds}
    </g>
  );
}

/** Dravidian temple gateway (gopuram) with mandapam and palms, as an old book engraving. */
export function TempleEngraving(props: P) {
  const cx = 150;
  const tiers = Array.from({ length: 7 }, (_, i) => {
    const yb = 222 - i * 22;
    const w = 62 - i * 6.6;
    const wt = w - 4.6;
    const niches: ReactNode[] = [];
    const n = Math.max(2, Math.round(w / 9));
    for (let k = 0; k < n; k++) {
      const nx = cx - wt + 4 + (k * (2 * wt - 8)) / (n - 1);
      niches.push(<path key={k} d={`M${nx - 2.4} ${yb - 3}v-9a2.4 2.4 0 0 1 4.8 0v9`} strokeWidth=".55" />);
    }
    return (
      <g key={i}>
        <path d={`M${cx - w} ${yb}L${cx - wt} ${yb - 22}H${cx + wt}L${cx + w} ${yb}Z`} />
        <path d={`M${cx - wt - 2} ${yb - 22}h${2 * wt + 4}M${cx - w + 1} ${yb - 2}h${2 * w - 2}`} strokeWidth=".6" />
        {niches}
        <path d={hatch(cx + wt * 0.35, cx + w - 2, yb - 19, yb - 3, 2.2)} strokeWidth=".35" />
      </g>
    );
  });
  const top = 222 - 7 * 22;
  return (
    <svg viewBox="0 0 300 300" fill="none" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round" {...deco} {...props}>
      {/* ground */}
      <path d="M8 268h284M20 274h120M170 274h110M40 280h80M190 280h60" strokeWidth=".5" />
      {/* gateway base */}
      <path d={`M${cx - 70} 268V226H${cx + 70}V268`} />
      <path d={`M${cx - 74} 226h148M${cx - 74} 230h148M${cx - 70} 246h140`} strokeWidth=".6" />
      <path d={`M${cx - 13} 268v-28a13 13 0 0 1 26 0v28`} />
      <path d={`M${cx - 9} 268v-27a9 9 0 0 1 18 0v27`} strokeWidth=".5" />
      <path d={hatch(cx - 8, cx + 8, 244, 267, 1.8)} strokeWidth=".35" />
      {[-56, -40, 28, 44].map((dx) => <path key={dx} d={`M${cx + dx} 266v-16h10v16`} strokeWidth=".5" />)}
      <path d={hatch(cx + 30, cx + 68, 232, 266, 2.6)} strokeWidth=".3" />
      {tiers}
      {/* crowning barrel vault and finials */}
      <path d={`M${cx - 20} ${top}c0-14 8-20 20-20s20 6 20 20Z`} />
      <path d={`M${cx - 24} ${top}h48`} />
      <path d={`M${cx - 6} ${top - 8}a6 6 0 0 1 12 0`} strokeWidth=".6" />
      {[-14, -7, 0, 7, 14].map((dx) => (
        <path key={dx} d={`M${cx + dx} ${top - (dx === 0 ? 20 : 16 - Math.abs(dx) * 0.3)}v-5m-2 0a2 2.6 0 1 0 4 0a2 2.6 0 1 0 -4 0m2-3v-3`} strokeWidth=".7" />
      ))}
      <path d={`M${cx - 22} ${top - 2}l-6-6M${cx + 22} ${top - 2}l6-6`} strokeWidth=".6" />
      {/* side mandapam */}
      <path d="M36 268v-34h44v34M30 234h56M32 230h52l-6-8H38z" />
      {[42, 52, 62, 72].map((x) => <path key={x} d={`M${x} 266v-30`} strokeWidth=".7" />)}
      <path d={hatch(38, 78, 224, 229, 2)} strokeWidth=".3" />
      <path d="M220 268v-26h40v26M216 242h48M218 238h44l-5-7h-34z" />
      {[226, 236, 246, 254].map((x) => <path key={x} d={`M${x} 266v-22`} strokeWidth=".7" />)}
      {/* palms and shrubs */}
      <Palm x={18} y={268} h={92} lean={10} s={0.85} />
      <Palm x={276} y={268} h={110} lean={-14} />
      <Palm x={290} y={268} h={76} lean={4} s={0.7} />
      <path d="M90 268c-4-10 4-16 10-10 2-8 12-6 12 2 6-2 10 4 6 8M180 268c-2-8 6-12 10-6 4-8 14-4 12 4 6 0 8 4 4 6" strokeWidth=".7" />
      <path d="M98 262l2 4M106 260l1 5M188 262l1 4M196 261l2 4" strokeWidth=".4" />
      {/* birds */}
      <path d="M210 60q4-4 8 0q4-4 8 0M232 48q3-3 6 0q3-3 6 0M70 70q3-3 6 0q3-3 6 0" strokeWidth=".6" />
    </svg>
  );
}

/** Tamil countryside: hills, palms, a hut and still water, in the same engraving style. */
export function LandscapeEngraving(props: P) {
  const hillHatch: string[] = [];
  for (let x = 150; x < 286; x += 3.2) {
    const yTop = 120 - 52 * Math.exp(-(((x - 216) / 44) ** 2));
    hillHatch.push(`M${x.toFixed(1)} ${(yTop + 5).toFixed(1)}l-6 ${(18 + (x % 7)).toFixed(1)}`);
  }
  return (
    <svg viewBox="0 0 300 260" fill="none" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round" {...deco} {...props}>
      <path d="M100 150c20-24 36-34 54-40 22-8 30-46 62-50 26 4 38 30 54 44 10 8 18 14 26 18" />
      <path d={hillHatch.join('')} strokeWidth=".35" />
      <path d="M60 160c22-14 40-18 64-16" strokeWidth=".6" />
      <path d="M14 196c40-6 92-8 150-6 60 2 100 8 130 6" strokeWidth=".7" />
      {[204, 210, 217, 224, 232].map((y, i) => <path key={y} d={`M${30 + i * 14} ${y}h${140 - i * 18}M${190 - i * 6} ${y + 2}h${70 - i * 8}`} strokeWidth=".4" />)}
      {/* hut */}
      <path d="M150 192v-20h30v20M144 174l21-16 21 16" />
      <path d="M160 192v-12h9v12" strokeWidth=".6" />
      <path d={hatch(146, 184, 162, 172, 2.4)} strokeWidth=".3" />
      {/* palms */}
      <Palm x={226} y={194} h={122} lean={-10} />
      <Palm x={250} y={196} h={94} lean={12} s={0.85} />
      <Palm x={198} y={194} h={70} lean={-6} s={0.65} />
      <Palm x={96} y={194} h={60} lean={4} s={0.55} />
      {/* field rows */}
      <path d="M20 240c40-8 90-10 140-8M40 250c40-6 80-8 120-6M70 232l6 10M90 230l5 10M110 229l4 10M130 229l3 10" strokeWidth=".45" />
      <path d="M40 92q4-4 8 0q4-4 8 0M64 80q3-3 6 0q3-3 6 0M120 56q3-3 6 0q3-3 6 0" strokeWidth=".6" />
      <circle cx="80" cy="120" r="12" strokeWidth=".5" strokeDasharray="1 2" />
    </svg>
  );
}

// ─── Desk objects ─────────────────────────────────────────────────────────
function Tome({ x, y, w, h, hue, i }: { x: number; y: number; w: number; h: number; hue: [string, string, string]; i: number }) {
  const d = 22; // depth of the top cover face
  return (
    <g>
      {/* page block seen from the end */}
      <path d={`M${x + w} ${y + 3}l${d} ${-d * 0.55}v${h - 6}l${-d} ${d * 0.55}z`} fill="#e3cc9c" />
      <path d={Array.from({ length: Math.floor(h / 2.2) }, (_, k) => `M${x + w + 1} ${y + 4 + k * 2.2}l${d - 2} ${-d * 0.55}`).join('')} stroke="#b89a66" strokeWidth=".45" />
      {/* top cover */}
      <path d={`M${x} ${y}l${d} ${-d * 0.55}h${w}l${-d} ${d * 0.55}z`} fill={`url(#tome-top-${i})`} />
      {/* spine face */}
      <rect x={x} y={y} width={w} height={h} rx="5" fill={`url(#tome-spine-${i})`} />
      <rect x={x} y={y} width={w} height={h} rx="5" fill="url(#leather)" opacity=".5" />
      {[0.12, 0.2, 0.8, 0.88].map((t) => <path key={t} d={`M${x + w * t} ${y + 2}v${h - 4}`} stroke="#c9a15a" strokeWidth="1.6" opacity=".85" />)}
      <path d={`M${x + w * 0.35} ${y + h / 2}h${w * 0.3}`} stroke="#c9a15a" strokeWidth="1" opacity=".7" />
      <rect x={x + w * 0.4} y={y + h * 0.3} width={w * 0.2} height={h * 0.4} fill="none" stroke="#c9a15a" strokeWidth=".7" opacity=".6" />
      <path d={`M${x + 3} ${y + 2}h${w - 6}`} stroke={hue[0]} strokeWidth="1.5" opacity=".6" />
    </g>
  );
}

/** Three leather-bound books lying on the desk (lower-left foreground). */
export function BookStack(props: P) {
  const books: { x: number; y: number; w: number; h: number; hue: [string, string, string] }[] = [
    { x: 6, y: 196, w: 300, h: 52, hue: ['#9c5a32', '#6a3519', '#3c1c0c'] },
    { x: 20, y: 152, w: 270, h: 44, hue: ['#7d2f22', '#561c14', '#2f0e09'] },
    { x: 34, y: 112, w: 244, h: 40, hue: ['#8a5a30', '#5a3418', '#33190a'] },
  ];
  return (
    <svg viewBox="0 0 340 260" {...deco} {...props}>
      <defs>
        <filter id="leather-noise"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" /><feColorMatrix values="0 0 0 0 .2  0 0 0 0 .1  0 0 0 0 .04  0 0 0 .55 0" /></filter>
        <pattern id="leather" width="120" height="60" patternUnits="userSpaceOnUse"><rect width="120" height="60" filter="url(#leather-noise)" /></pattern>
        {books.map((b, i) => (
          <g key={i}>
            <linearGradient id={`tome-spine-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={b.hue[0]} /><stop offset=".45" stopColor={b.hue[1]} /><stop offset="1" stopColor={b.hue[2]} />
            </linearGradient>
            <linearGradient id={`tome-top-${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={b.hue[1]} /><stop offset="1" stopColor={b.hue[2]} />
            </linearGradient>
          </g>
        ))}
      </defs>
      <ellipse cx="170" cy="250" rx="168" ry="10" fill="#000" opacity=".35" />
      {books.map((b, i) => <Tome key={i} {...b} i={i} />)}
    </svg>
  );
}

/** Brass inkpot with a quill (lower-right foreground). */
export function InkpotQuill(props: P) {
  const barbs: string[] = [];
  for (let t = 0.06; t < 0.96; t += 0.022) {
    const sx = 96 + (228 - 96) * t, sy = 150 - (150 - 6) * t - Math.sin(t * Math.PI) * 18;
    const len = 18 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.95) + 4;
    barbs.push(`M${sx.toFixed(1)} ${sy.toFixed(1)}q${(-len * 0.4).toFixed(1)} ${(-len * 0.2).toFixed(1)} ${(-len * 0.8).toFixed(1)} ${(len * 0.25).toFixed(1)}`);
    barbs.push(`M${sx.toFixed(1)} ${sy.toFixed(1)}q${(len * 0.5).toFixed(1)} ${(len * 0.1).toFixed(1)} ${(len * 0.6).toFixed(1)} ${(len * 0.7).toFixed(1)}`);
  }
  return (
    <svg viewBox="0 0 240 280" {...deco} {...props}>
      <defs>
        <radialGradient id="brass" cx="35%" cy="35%" r="75%">
          <stop offset="0" stopColor="#e6c27a" /><stop offset=".35" stopColor="#a87a38" /><stop offset=".75" stopColor="#5b3a16" /><stop offset="1" stopColor="#2a1808" />
        </radialGradient>
        <linearGradient id="brass-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a2e10" /><stop offset=".3" stopColor="#d9b46a" /><stop offset=".6" stopColor="#8c6228" /><stop offset="1" stopColor="#3a220b" />
        </linearGradient>
        <linearGradient id="vane" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#d8c39a" /><stop offset=".5" stopColor="#f3e6c6" /><stop offset="1" stopColor="#c9ad78" />
        </linearGradient>
      </defs>
      <ellipse cx="96" cy="266" rx="84" ry="11" fill="#000" opacity=".45" />
      {/* quill */}
      <path d="M96 150C130 112 176 64 228 6 214 46 186 86 150 116 132 130 112 142 96 150z" fill="url(#vane)" opacity=".95" />
      <path d={barbs.join('')} stroke="#a88a58" strokeWidth=".5" fill="none" opacity=".75" />
      <path d="M86 176Q140 92 228 6" stroke="#8d7148" strokeWidth="1.6" fill="none" />
      {/* inkpot */}
      <path d="M30 206c0-30 30-46 66-46s66 16 66 46-26 58-66 58-66-28-66-58z" fill="url(#brass)" />
      <path d="M44 214c8 26 28 40 52 40" stroke="#f0d595" strokeWidth="2" fill="none" opacity=".35" />
      <path d="M34 214c20 10 104 10 124 0" stroke="#2a1606" strokeWidth="1.2" fill="none" opacity=".6" />
      <path d="M36 226c22 10 98 10 120 0" stroke="#d9b46a" strokeWidth=".8" fill="none" opacity=".5" />
      <rect x="66" y="146" width="60" height="20" rx="3" fill="url(#brass-rim)" />
      <ellipse cx="96" cy="146" rx="34" ry="8" fill="url(#brass-rim)" />
      <ellipse cx="96" cy="146" rx="26" ry="5" fill="#120804" />
    </svg>
  );
}

// ─── Line icons (feature rows, toolbars) ──────────────────────────────────
function Ico({ sw = 1.5, children, ...props }: P & { sw?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...deco} {...props}>
      {children}
    </svg>
  );
}

export function IconOpenBook(p: P) {
  return <Ico sw={1.5} {...p}><>
  <path d="M24 12c-6-4-14-5-20-4v28c6-1 14 0 20 4 6-4 14-5 20-4V8c-6-1-14 0-20 4z" />
  <path d="M24 12v28M8 14c4 0 9 1 12 3M8 20c4 0 9 1 12 3M8 26c4 0 9 1 12 3M40 14c-4 0-9 1-12 3M40 20c-4 0-9 1-12 3M40 26c-4 0-9 1-12 3" strokeWidth=".9" />
</></Ico>;
}
export function IconBookmark(p: P) {
  return <Ico sw={1.5} {...p}><path d="M14 6h20v36l-10-9-10 9z" /></Ico>;
}
export function IconHistory(p: P) {
  return <Ico sw={1.5} {...p}><>
  <path d="M8 24a16 16 0 1 0 5-11.6" /><path d="M7 7v7h7" /><path d="M24 14v10l7 5" />
</></Ico>;
}
export function IconStar(p: P) {
  return <Ico sw={1.5} {...p}><path d="M24 5l5.6 12.2 13.4 1.4-10 9 2.8 13.2L24 34l-11.8 6.8L15 27.6l-10-9 13.4-1.4z" /></Ico>;
}
/** Sangam vocabulary: a palm-leaf manuscript (ஓலைச்சுவடி) — tapered leaves bound by a cord through the centre, ending in a tassel. */
export function IconPalmLeaf(p: P) {
  return <Ico sw={1.5} {...p}><>
  <path d="M3 14C13 9.8 35 9.8 45 14C35 18.2 13 18.2 3 14z" /><path d="M3 21C13 16.8 35 16.8 45 21C35 25.2 13 25.2 3 21z" /><path d="M3 28C13 23.8 35 23.8 45 28C35 32.2 13 32.2 3 28z" />
  <path d="M9 14h9M30 14h9M10 21h8M30 21h8M11 28h7M30 28h6" strokeWidth=".7" strokeDasharray="1.6 1.2" />
  <path d="M24 10.5v20.5" strokeWidth="1.6" />
  <path d="M21 31.5h6" strokeWidth="1.4" />
  <path d="M24 31.5c-.6 4-2.4 6.5-4.6 9.5M24 31.5v10M24 31.5c.6 4 2.4 6.5 4.6 9.5" strokeWidth="1.1" />
</></Ico>;
}
/** Etymology: a word's roots and growth — a seedling with roots. */
export function IconLeaf(p: P) {
  return <Ico sw={1.6} {...p}><>
  <path d="M24 40V15" />
  <path d="M24 28c-9.5 0-15.5-5.5-15.5-14 8 0 15.5 4.5 15.5 14z" />
  <path d="M24 21c8 0 13.5-4.6 13.5-12-7 0-13.5 3.6-13.5 12z" />
  <path d="M24 28L13 17M24 21l9-8.5" strokeWidth=".8" />
  <path d="M10 40.5h28" strokeWidth="1.1" />
  <path d="M24 40.5l-5 4.5M24 40.5l5 4.5M24 40.5v5M19.5 43l-3.5 1" strokeWidth="1" />
</></Ico>;
}
/** Multilingual meanings: a globe with curved meridian and parallels. */
export function IconGlobe(p: P) {
  return <Ico sw={1.6} {...p}><>
  <circle cx="24" cy="24" r="17" />
  <path d="M24 7c-6.2 5.2-9 11-9 17s2.8 11.8 9 17M24 7c6.2 5.2 9 11 9 17s-2.8 11.8-9 17M24 7v34" strokeWidth="1.1" />
  <path d="M7 24h34M9.5 15.5c9.5 3.4 19.5 3.4 29 0M9.5 32.5c9.5-3.4 19.5-3.4 29 0" strokeWidth="1.1" />
</></Ico>;
}
/** Tamil alphabet: a framed slate with the first letter, அ. */
export function IconAlphabet(p: P) {
  return <Ico sw={1.6} {...p}><>
  <rect x="5" y="6" width="38" height="36" rx="3" />
  <rect x="8.5" y="9.5" width="31" height="29" rx="1.5" strokeWidth=".8" />
  <text x="24" y="33.5" textAnchor="middle" fontSize="23" fontWeight="600" fontFamily="'Noto Serif Tamil', serif" fill="currentColor" stroke="none">அ</text>
</></Ico>;
}
export function IconSearch(p: P) {
  return <Ico sw={2.6} {...p}><><circle cx="21" cy="21" r="12" /><path d="M30 30l11 11" /></></Ico>;
}
export function IconSpeaker(p: P) {
  return <Ico sw={2.6} {...p}><><path d="M8 19h7l10-8v26l-10-8H8z" /><path d="M31 18c3 3 3 9 0 12M35 14c6 5 6 15 0 20" /></></Ico>;
}
export function IconShare(p: P) {
  return <Ico sw={2.4} {...p}><><circle cx="36" cy="11" r="5" /><circle cx="12" cy="24" r="5" /><circle cx="36" cy="37" r="5" /><path d="M16.5 21.5l15-8M16.5 26.5l15 8" /></></Ico>;
}
export function IconHome(p: P) {
  return <Ico sw={2.6} {...p}><path d="M6 24L24 8l18 16M11 20v20h10V30h6v10h10V20" /></Ico>;
}
export function IconLotus(p: P) {
  return <Ico sw={1.6} {...p}><>
  <path d="M24 38c-4-6-4-16 0-24 4 8 4 18 0 24z" /><path d="M24 38c-8-2-14-10-14-18 6 2 12 8 14 18zM24 38c8-2 14-10 14-18-6 2-12 8-14 18z" />
  <path d="M24 38c-10 1-17-4-20-10 8-1 15 3 20 10zM24 38c10 1 17-4 20-10-8-1-15 3-20 10z" /><path d="M10 42h28" />
</></Ico>;
}
export function IconCopy(p: P) {
  return <Ico sw={2.4} {...p}><><rect x="16" y="16" width="24" height="26" rx="2" /><path d="M10 32V8h22" /></></Ico>;
}
