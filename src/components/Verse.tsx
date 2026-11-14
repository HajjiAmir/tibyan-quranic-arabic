import { useState, type ReactNode } from 'react';
import { roleVar } from '../lib/data';
import type { TajweedLegend, Verse as VerseT } from '../types';
import type { Recitation } from '../lib/useRecitation';
import { VerseAudio } from './AudioControls';
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
  rec: Recitation;
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
    <div className="relative mt-6 max-w-reading">
      <p className="text-[0.975rem] leading-7 text-ink/75">{parts}</p>
      {open && notes.get(open) && (
        <p className="mt-3 rounded-xl border border-line/80 bg-surface/70 px-4 py-3 text-[0.8rem] leading-relaxed text-muted">
          <span className="mr-1 font-semibold text-gold">{open}</span>
          {notes.get(open)}
        </p>
      )}
    </div>
  );
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arabicNumber = (n: number) => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

export default function Verse({
  verse,
  showTranslation,
  colorWords,
  showGloss,
  tajweed,
  tajweedLegend,
  studied,
  onToggleStudied,
  rec,
}: Props) {
  const reciting = rec.state.verse === verse.id;
  const [selected, setSelected] = useState<number | null>(null);
  const selectedWord = verse.words.find((w) => w.position === selected) ?? null;

  return (
    <article
      className="relative scroll-mt-40 border-b border-line/60 py-8 sm:py-10"
      id={`v${verse.id}`}
      aria-current={reciting ? 'true' : undefined}
    >
      {/* the āyah being recited: a quiet gold rule and wash, nothing heavier */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -inset-x-3 inset-y-2 rounded-2xl bg-gold/[0.06] transition-opacity duration-500 sm:-inset-x-5 ${
          reciting ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute -left-3 top-8 bottom-8 w-[2px] rounded-full bg-gold transition-opacity duration-500 sm:-left-5 ${
          reciting ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div className="relative mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span
            className={`tnum text-[11px] font-medium uppercase tracking-[0.14em] transition-colors ${
              reciting ? 'text-gold' : 'text-muted'
            }`}
          >
            Āyah {verse.id}
          </span>
          <VerseAudio verse={verse.id} rec={rec} />
        </span>
        <button
          onClick={onToggleStudied}
          aria-pressed={studied}
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
            studied
              ? 'border-emerald/40 bg-emerald/10 text-emerald'
              : 'border-transparent text-muted hover:border-line hover:text-ink'
          }`}
        >
          {studied ? '✓ Studied' : 'Mark studied'}
        </button>
      </div>

      {/* the authentic reading line — the centrepiece */}
      <p className="quran-line relative">
        {tajweed && verse.tajweed ? (
          <TajweedText text={verse.arabic} spans={verse.tajweed} legend={tajweedLegend} />
        ) : (
          verse.arabic
        )}
        <span className="ayah-mark" aria-label={`end of verse ${verse.id}`}>
          {'\u06DD' + arabicNumber(verse.id)}
        </span>
      </p>

      {/* interlinear, colour-coded word-by-word analysis */}
      <div
        dir="rtl"
        className="relative mt-5 flex flex-wrap items-start gap-x-1 gap-y-3 border-t border-dashed border-line/70 pt-5"
      >
        {verse.words.map((w) => {
          const isSel = w.position === selected;
          return (
            <button
              key={w.position}
              onClick={() => setSelected(isSel ? null : w.position)}
              className={`flex min-w-[2.75rem] flex-col items-center gap-0.5 rounded-xl px-2.5 pb-1.5 pt-0.5 transition-colors ${
                isSel ? 'bg-surface ring-1 ring-gold/60 shadow-sm' : 'hover:bg-surface/80'
              }`}
              title={[w.gloss, ...w.segments.map((s) => s.description)].filter(Boolean).join(' · ')}
            >
              <span className="ar text-[1.65rem] leading-[1.9]">
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
                <span dir="ltr" className="max-w-[8.5rem] text-center text-[11.5px] leading-snug text-muted">
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
