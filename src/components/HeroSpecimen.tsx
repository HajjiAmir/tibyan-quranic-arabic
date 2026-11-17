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

  if (!verse) return <div aria-hidden className="skeleton h-[24rem] w-full rounded-[18px] sm:h-[22rem]" />;
  const word = verse.words.find((w) => w.position === selected) ?? verse.words[0];

  return (
    <figure className="card-raised w-full overflow-hidden text-left">
      <figcaption className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Tap a word</span>
        <Link to={`/surah/${SURAH}?v=${VERSE}`} className="tap -my-2 inline-flex items-center text-xs font-medium text-accent hover:underline">
          Al-Fātiḥa 1:{VERSE} →
        </Link>
      </figcaption>

      {/* the verse, word by word */}
      <div dir="rtl" className="flex flex-wrap justify-center gap-1.5 px-4 pb-2 pt-4">
        {verse.words.map((w) => {
          const on = w.position === word.position;
          return (
            <button
              key={w.position}
              onClick={() => setSelected(w.position)}
              aria-pressed={on}
              aria-label={`${w.arabic}${w.gloss ? ` — ${w.gloss}` : ''}`}
              className={`tap rounded-xl px-3 py-1 transition-colors duration-300 ${
                on ? 'word-bloom bg-accent/[0.12] ring-1 ring-accent/40' : 'hover:bg-accent/[0.07]'
              }`}
            >
              <span lang="ar" className="ar block text-[1.75rem] leading-[1.7]">
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

      {/* the selected word, one chip per part: the part, a role-coloured rule, its gloss and role */}
      <ul key={word.position} dir="rtl" className="rise flex flex-wrap justify-center gap-2.5 px-4 pb-5 pt-3" style={{ animationDelay: '0ms', animationDuration: '420ms' }}>
        {word.segments.map((seg, i) => (
          <li
            key={i}
            className="flex min-w-[6rem] max-w-[11rem] flex-col items-center gap-2 rounded-2xl border border-line bg-paper/40 px-4 pb-3.5 pt-2"
          >
            <span lang="ar" className="ar-naskh seg-chip-ar text-[2rem]" style={{ color: roleVar(seg.role) }}>
              {seg.arabic}
            </span>
            <span aria-hidden className="h-[2px] w-9 rounded-full" style={{ background: roleVar(seg.role), opacity: 0.85 }} />
            <span dir="ltr" className="flex flex-col items-center gap-1.5 text-center">
              <SegmentGloss seg={seg} />
              <RoleChip role={seg.role}>{seg.description}</RoleChip>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line bg-paper/25 px-5 py-3.5">
        <span className="flex min-w-0 flex-col">
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">Meaning</span>
          <span className="font-display text-[1.05rem] leading-snug">
            {word.gloss || <span className="text-muted">—</span>}
            {word.translit && <span className="ml-2 text-sm italic text-muted">{word.translit}</span>}
          </span>
        </span>
        <span className="flex flex-col items-end">
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">Root</span>
          {word.root ? (
            <bdi lang="ar" className="ar-naskh text-[1.2rem] leading-[1.5] text-accent">
              {word.root.split('').join(' ')}
            </bdi>
          ) : (
            <span className="text-sm text-muted">none</span>
          )}
        </span>
      </div>
      <p className="border-t border-line/60 px-5 py-2 text-[10.5px] text-muted">Source: Quranic Arabic Corpus</p>
    </figure>
  );
}
