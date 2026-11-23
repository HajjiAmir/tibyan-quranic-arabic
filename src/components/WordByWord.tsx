import { useCallback, useState } from 'react';
import { roleVar } from '../lib/data';
import { usePhone } from '../lib/useMedia';
import type { Word } from '../types';
import BottomSheet from './BottomSheet';
import GrammarPanel from './GrammarPanel';

/**
 * A verse word by word: each word coloured by grammatical role (per segment),
 * its word-by-word English beneath it, and tappable for its full grammar
 * (inline on wide screens, a bottom sheet on phones). Shared by the reader and
 * by the example verses of the learning cards and tests.
 */
export default function WordByWord({
  words,
  colorWords = true,
  showGloss = true,
  size = 'reader',
  target,
  targetPart,
  maskTarget = false,
  showTranslit = false,
  verseRef,
}: {
  words: Word[];
  colorWords?: boolean;
  showGloss?: boolean;
  size?: 'reader' | 'compact';
  /** Index of the word being studied: emphasised. */
  target?: number;
  /** [start, end) of the studied segment inside the target word (UTF-16 offsets). */
  targetPart?: [number, number] | null;
  /** In a test: hide the target's colour, English and grammar until it is answered. */
  maskTarget?: boolean;
  /** Each word's transliteration (Quran.com word by word) under its Arabic. */
  showTranslit?: boolean;
  /** "s:v", so a tapped word can be heard (recorded word audio). */
  verseRef?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const phone = usePhone();
  const close = useCallback(() => setSelected(null), []);
  const selectedWord = selected === null ? null : (words[selected] ?? null);
  const step = (d: number) => {
    if (selected === null) return;
    const n = selected + d;
    if (n >= 0 && n < words.length && !(maskTarget && n === target)) setSelected(n);
  };
  const compact = size === 'compact';

  return (
    <>
      <div dir="rtl" className={`relative flex flex-wrap items-start ${compact ? 'gap-x-0.5 gap-y-2' : 'gap-x-1 gap-y-3'}`}>
        {words.map((w, i) => {
          const isSel = i === selected;
          const isTarget = i === target;
          const masked = maskTarget && isTarget;
          // Offsets of each segment inside the word, to underline the studied part.
          let at = 0;
          const segs = w.segments.map((s) => {
            const from = at;
            at += s.arabic.length;
            return { s, from, to: at };
          });
          const partOk = isTarget && targetPart && segs.map((x) => x.s.arabic).join('') === w.arabic;
          return (
            <button
              key={w.position}
              onClick={() => !masked && setSelected(isSel ? null : i)}
              aria-disabled={masked || undefined}
              aria-label={masked ? 'The word asked about' : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-xl transition-colors duration-300 ${
                compact ? 'min-w-[2.75rem] px-1.5 pb-1 pt-0' : 'min-w-[2.75rem] px-2.5 pb-1.5 pt-0.5'
              } ${
                isSel
                  ? 'word-bloom bg-surface ring-1 ring-accent/45 shadow-sm'
                  : isTarget
                    ? 'bg-accent/[0.12] ring-1 ring-accent/50'
                    : 'hover:bg-surface/80'
              } ${masked ? 'cursor-default' : ''}`}
              title={masked ? undefined : [w.gloss, ...w.segments.map((s) => s.description)].filter(Boolean).join(' · ')}
            >
              <span className={`ar ${compact ? 'text-[1.4rem] leading-[1.85]' : 'text-[1.65rem] leading-[1.9]'}`}>
                {segs.map(({ s, from, to }, k) => {
                  const underline = partOk && targetPart && from < targetPart[1] && to > targetPart[0];
                  return (
                    <span
                      key={k}
                      className={underline ? 'underline decoration-accent decoration-2 underline-offset-[10px]' : undefined}
                      style={{ color: masked ? 'rgb(var(--ink))' : colorWords ? roleVar(s.role) : 'rgb(var(--ink))' }}
                    >
                      {s.arabic}
                    </span>
                  );
                })}
              </span>
              {showTranslit && w.translit && (
                <span dir="ltr" className={`max-w-[8.5rem] text-center italic leading-snug text-ink/75 ${compact ? 'text-[11px]' : 'text-[11.5px]'}`}>
                  {w.translit}
                </span>
              )}
              {showGloss && (
                <span dir="ltr" className={`max-w-[8.5rem] text-center leading-snug text-muted ${compact ? 'text-[11px]' : 'text-[11.5px]'}`}>
                  {masked ? '?' : w.gloss}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* On a phone the word's grammar opens as a bottom sheet; on wider screens, inline. */}
      {selectedWord && !phone && <GrammarPanel word={selectedWord} verseRef={verseRef} />}
      {selectedWord && phone && selected !== null && (
        <BottomSheet
          label={`Grammar of ${selectedWord.arabic}`}
          onClose={close}
          footer={
            <div className="flex items-center justify-between gap-2">
              {/* Reading order is right to left, so the next word sits on the left. */}
              <button
                onClick={() => step(1)}
                disabled={selected >= words.length - 1}
                className="btn btn-sm btn-secondary flex-1 disabled:opacity-35"
              >
                ← Next word
              </button>
              <span className="tnum shrink-0 px-1 text-[11px] text-muted">
                {selected + 1} / {words.length}
              </span>
              <button onClick={() => step(-1)} disabled={selected <= 0} className="btn btn-sm btn-secondary flex-1 disabled:opacity-35">
                Previous word →
              </button>
            </div>
          }
        >
          <GrammarPanel word={selectedWord} verseRef={verseRef} bare />
        </BottomSheet>
      )}
    </>
  );
}
