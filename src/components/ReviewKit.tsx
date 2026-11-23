import type { LearnItem } from '../lib/learn';
import { displayMeaning, familySense, rootFamily, type VocabIndex } from '../lib/vocab';

/** The Arabic and a short meaning of a learning item. */
export function itemLabel(index: VocabIndex, i: LearnItem): { ar: string; en: string } {
  if (i.track === 'roots') return { ar: i.root.split('').join(' '), en: familySense(rootFamily(index, i.root), 1)[0] ?? '' };
  return { ar: i.lemma.lemma, en: displayMeaning(i.lemma) };
}

/**
 * A mastery ring: a faint full track for what is learned, an emerald arc for the
 * share that is secure, and the secure count in the middle. The arc eases in
 * (instant under reduced motion, via the global rule).
 */
export function MasteryRing({
  value,
  total,
  size = 44,
  label,
  center,
}: {
  value: number;
  total: number;
  size?: number;
  label: string;
  center?: string;
}) {
  const stroke = size >= 80 ? 7 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const share = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--accent) / 0.18)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--emerald))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - share)}
          className="ring-arc"
          style={{ opacity: share > 0 ? 1 : 0, ['--ring-c' as string]: c }}
        />
      </svg>
      <span className={`tnum absolute font-semibold ${size >= 80 ? 'font-display text-[1.6rem]' : 'text-[12px]'}`}>{center ?? value}</span>
    </span>
  );
}

/** Five small marks for an item's Leitner box (1–5); 4 and up is secure. */
export function BoxMarks({ box }: { box: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]" role="img" aria-label={`Box ${box} of 5${box >= 4 ? ', secure' : ''}`}>
      {[1, 2, 3, 4, 5].map((k) => (
        <span
          key={k}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: k <= box ? (box >= 4 ? 'rgb(var(--emerald))' : 'rgb(var(--accent))') : 'rgb(var(--line))' }}
        />
      ))}
    </span>
  );
}
