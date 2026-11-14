import { useMemo } from 'react';
import { tajweedVar } from '../lib/data';
import type { TajweedLegend, TajweedRule, TajweedSpan } from '../types';

interface Piece {
  text: string;
  rule: TajweedRule | null;
}

// Split the verse at every span boundary. Where spans overlap (a few dozen
// cases, e.g. a shadda's ghunnah running into the next tanwīn rule) the span
// that starts later wins, so each rule still shows where it begins.
export function tajweedPieces(text: string, spans: TajweedSpan[]): Piece[] {
  const chars = Array.from(text);
  const cuts = new Set<number>([0, chars.length]);
  for (const [s, e] of spans) {
    cuts.add(Math.max(0, Math.min(s, chars.length)));
    cuts.add(Math.max(0, Math.min(e, chars.length)));
  }
  const points = [...cuts].sort((a, b) => a - b);
  const pieces: Piece[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    let rule: TajweedRule | null = null;
    let bestStart = -1;
    for (const [s, e, r] of spans) if (s <= a && e >= b && s > bestStart) { rule = r; bestStart = s; }
    const t = chars.slice(a, b).join('');
    const last = pieces[pieces.length - 1];
    if (last && last.rule === rule) last.text += t;
    else pieces.push({ text: t, rule });
  }
  return pieces;
}

export default function TajweedText({
  text,
  spans,
  legend,
}: {
  text: string;
  spans: TajweedSpan[];
  legend: TajweedLegend | null;
}) {
  const pieces = useMemo(() => tajweedPieces(text, spans), [text, spans]);
  return (
    <>
      {pieces.map((p, i) => {
        if (!p.rule) return <span key={i}>{p.text}</span>;
        const info = legend?.[p.rule];
        return (
          <span
            key={i}
            style={info ? { color: tajweedVar(info.group) } : undefined}
            title={info?.label}
          >
            {p.text}
          </span>
        );
      })}
    </>
  );
}
