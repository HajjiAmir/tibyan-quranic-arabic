import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSurah, roleVar } from '../lib/data';
import type { Verse } from '../types';
import { RoleChip, SegmentGloss } from './GrammarPanel';

/**
 * The app's core feature, live in the hero: Al-Fātiḥa 1:2 from the real data.
 * Tap a word to see its colour-coded parts, each part's sourced meaning and the
 * root. Nothing here is written by hand; parts with no sourced English stay blank.
 */
const SURAH = 1;
const VERSE = 2;
const START_WORD = 2; // لِلَّهِ: preposition + proper noun, both parts glossed in the corpus

export default function HeroSpecimen() {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [selected, setSelected] = useState(START_WORD);

  useEffect(() => {
    loadSurah(SURAH)
      .then((s) => setVerse(s.verses.find((v) => v.id === VERSE) ?? null))
      .catch(() => {});
  }, []);

  if (!verse) return <div aria-hidden className="card-raised h-[22rem] w-full animate-pulse sm:h-[19rem]" />;
  const word = verse.words.find((w) => w.position === selected) ?? verse.words[0];

  return (
    <figure className="card-raised w-full overflow-hidden text-left">
      <figcaption className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 sm:px-5">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Tap a word</span>
        <Link to={`/surah/${SURAH}?v=${VERSE}`} className="tap -my-2 inline-flex items-center text-xs font-medium text-accent hover:underline">
          Al-Fātiḥa 1:{VERSE} →
        </Link>
      </figcaption>

      <div dir="rtl" className="flex flex-wrap justify-center gap-1 px-3 pb-1 pt-3">
        {verse.words.map((w) => {
          const on = w.position === word.position;
          return (
            <button
              key={w.position}
              onClick={() => setSelected(w.position)}
              aria-pressed={on}
              aria-label={`${w.arabic}${w.gloss ? ` — ${w.gloss}` : ''}`}
              className={`tap rounded-xl px-2.5 transition-colors ${
                on ? 'bg-accent/[0.14] ring-1 ring-accent/50' : 'hover:bg-accent/[0.08]'
              }`}
            >
              <span lang="ar" className="ar text-[1.7rem] leading-[1.9]">
                {w.segments.map((s, i) => (
                  <span key={i} style={{ color: roleVar(s.role) }}>
                    {s.arabic}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4 pt-2 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {word.gloss && <span className="font-display text-lg leading-snug">{word.gloss}</span>}
          {word.translit && <span className="text-sm italic text-muted">{word.translit}</span>}
        </div>
        <ul className="flex flex-col gap-2">
          {word.segments.map((seg, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl border border-line bg-paper/40 px-3 py-2">
              <span lang="ar" className="ar-naskh w-14 shrink-0 text-center text-[1.6rem] leading-[1.4]" style={{ color: roleVar(seg.role) }}>
                {seg.arabic}
              </span>
              <span className="flex min-w-0 flex-col items-start gap-1">
                <RoleChip role={seg.role}>{seg.description}</RoleChip>
                <SegmentGloss seg={seg} />
              </span>
            </li>
          ))}
        </ul>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {word.root ? (
            <>
              <span>Root</span>
              <bdi lang="ar" className="ar-naskh text-[1.15rem] text-accent">
                {word.root.split('').join(' ')}
              </bdi>
            </>
          ) : (
            <span>No root</span>
          )}
          <span aria-hidden>·</span>
          <span>Quranic Arabic Corpus</span>
        </p>
      </div>
    </figure>
  );
}
