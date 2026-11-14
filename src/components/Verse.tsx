import { useState, type ReactNode } from 'react';
import { roleVar } from '../lib/data';
import type { TajweedLegend, Verse as VerseT } from '../types';
import GrammarPanel from './GrammarPanel';
import TajweedText from './TajweedText';

interface Props {
  surahId: number;
  verse: VerseT;
  showTranslation: boolean;
  colorWords: boolean;
  showGloss: boolean;
  tajweed: boolean;
  tajweedLegend: TajweedLegend | null;
  studied: boolean;
  onToggleStudied: () => void;
}

// Saheeh International footnotes arrive as "[2]- text\n[3]- text".
function parseFootnotes(raw: string): Map<string, string> {
  const notes = new Map<string, string>();
  for (const m of raw.matchAll(/\[(\d+)\]-\s*([\s\S]*?)(?=\n\[\d+\]-|$)/g)) notes.set(m[1], m[2].trim());
  return notes;
}

function Translation({ text, footnotes }: { text: string; footnotes: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const notes = parseFootnotes(footnotes);
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[(\d+)\]/g)) {
    const n = m[1];
    const idx = m.index ?? 0;
    if (!notes.has(n)) continue; // leave anything that is not a known footnote as written
    parts.push(text.slice(last, idx));
    parts.push(
      <button
        key={idx}
        onClick={() => setOpen(open === n ? null : n)}
        aria-expanded={open === n}
        aria-label={`Footnote ${n}`}
        className={`mx-0.5 align-super text-[0.65rem] font-semibold leading-none ${
          open === n ? 'text-ink' : 'text-gold hover:text-ink'
        }`}
      >
        {n}
      </button>,
    );
    last = idx + m[0].length;
  }
  parts.push(text.slice(last));

  return (
    <div className="mt-4 max-w-reading">
      <p className="text-[0.95rem] leading-relaxed text-muted">{parts}</p>
      {open && notes.get(open) && (
        <p className="mt-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-muted">
          <span className="mr-1 font-semibold text-gold">{open}</span>
          {notes.get(open)}
        </p>
      )}
    </div>
  );
}

export default function Verse({
  verse,
  showTranslation,
  colorWords,
  showGloss,
  tajweed,
  tajweedLegend,
  studied,
  onToggleStudied,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedWord = verse.words.find((w) => w.position === selected) ?? null;

  return (
    <article className="scroll-mt-24 border-b border-line/70 py-6" id={`v${verse.id}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="tnum flex h-7 min-w-7 items-center justify-center rounded-full border border-line bg-surface px-2 text-xs font-semibold text-gold">
          {verse.id}
        </span>
        <button
          onClick={onToggleStudied}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            studied
              ? 'border-emerald/40 bg-emerald/10 text-emerald'
              : 'border-line text-muted hover:text-ink'
          }`}
        >
          {studied ? '✓ Studied' : 'Mark studied'}
        </button>
      </div>

      {/* authentic reading line */}
      <p className="ar mb-4 text-right text-[2rem] leading-[2.2] sm:text-[2.4rem]">
        {tajweed && verse.tajweed ? (
          <TajweedText text={verse.arabic} spans={verse.tajweed} legend={tajweedLegend} />
        ) : (
          verse.arabic
        )}
      </p>

      {/* interactive, colour-coded word-by-word analysis */}
      <div dir="rtl" className="flex flex-wrap gap-x-1.5 gap-y-2">
        {verse.words.map((w) => {
          const isSel = w.position === selected;
          return (
            <button
              key={w.position}
              onClick={() => setSelected(isSel ? null : w.position)}
              className={`flex flex-col items-center rounded-lg px-2 py-1 transition-all ${
                isSel ? 'bg-surface-2 ring-1 ring-gold' : 'hover:bg-surface-2/60'
              }`}
              title={[w.gloss, ...w.segments.map((s) => s.description)].filter(Boolean).join(' · ')}
            >
              <span className="ar text-2xl leading-tight">
                {w.segments.map((s, i) => (
                  <span
                    key={i}
                    style={{ color: colorWords ? roleVar(s.role) : 'rgb(var(--ink))' }}
                  >
                    {s.arabic}
                  </span>
                ))}
              </span>
              {showGloss && w.gloss && (
                <span dir="ltr" className="max-w-[9rem] text-center text-[11px] leading-tight text-muted">
                  {w.gloss}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedWord && <GrammarPanel word={selectedWord} />}

      {showTranslation && <Translation text={verse.translation} footnotes={verse.footnotes} />}
    </article>
  );
}
