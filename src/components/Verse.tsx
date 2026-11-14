import { useState } from 'react';
import { roleVar } from '../lib/data';
import type { Verse as VerseT } from '../types';
import GrammarPanel from './GrammarPanel';

interface Props {
  surahId: number;
  verse: VerseT;
  showTranslation: boolean;
  colorWords: boolean;
  studied: boolean;
  onToggleStudied: () => void;
}

export default function Verse({
  verse,
  showTranslation,
  colorWords,
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
      <p className="ar mb-4 text-right text-[2rem] leading-[2.2] sm:text-[2.4rem]">{verse.arabic}</p>

      {/* interactive, colour-coded word-by-word analysis */}
      <div dir="rtl" className="flex flex-wrap gap-x-1.5 gap-y-2">
        {verse.words.map((w) => {
          const isSel = w.position === selected;
          return (
            <button
              key={w.position}
              onClick={() => setSelected(isSel ? null : w.position)}
              className={`rounded-lg px-2 py-1 transition-all ${
                isSel ? 'bg-surface-2 ring-1 ring-gold' : 'hover:bg-surface-2/60'
              }`}
              title={w.segments.map((s) => s.description).join(' · ')}
            >
              <span className="ar text-2xl leading-tight">
                {w.segments.map((s, i) => (
                  <span
                    key={i}
                    style={{ color: colorWords ? roleVar(s.role) : 'var(--ink)' }}
                  >
                    {s.arabic}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {selectedWord && <GrammarPanel word={selectedWord} />}

      {showTranslation && (
        <p className="mt-4 max-w-reading text-[0.95rem] leading-relaxed text-muted">
          {verse.translation}
        </p>
      )}
    </article>
  );
}
