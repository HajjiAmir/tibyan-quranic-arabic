import { useEffect, useState } from 'react';
import { loadVerseWords, type Example } from '../lib/vocab';
import { playWord, useWordAudio, wordKey } from '../lib/wordAudio';
import type { Word } from '../types';

/**
 * Tap to hear one word of the Qur'an, cut from Mishary Alafasy's recitation of its verse (see lib/wordAudio).
 * A 44px target; while it plays the icon turns accent (no animation).
 */
export function SpeakButton({ verseRef, position, label, size = 'md' }: { verseRef: string; position: number; label: string; size?: 'sm' | 'md' }) {
  const st = useWordAudio(wordKey(verseRef, position));
  const on = st === 'playing' || st === 'loading';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        playWord(verseRef, position);
      }}
      aria-label={st === 'error' ? `Could not play ${label}. Try again` : on ? `Stop ${label}` : `Hear ${label}`}
      aria-pressed={on}
      title={st === 'error' ? 'Could not load the recitation. Check your connection.' : 'Hear this word as Mishary Alafasy recites it'}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
        on ? 'text-accent' : st === 'error' ? 'text-muted' : 'text-muted hover:text-accent'
      }`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full border ${size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'} ${
          on ? 'border-accent/60 bg-accent/15' : 'border-line bg-surface/70'
        }`}
      >
        {st === 'error' ? <ErrorIcon /> : <SpeakerIcon on={on} />}
      </span>
    </button>
  );
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fillOpacity={on ? 0.35 : 0} />
      <path d="M15.5 9a4 4 0 0 1 0 6" />
      {on && <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />}
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 7v6M12 17h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

/** The word an example points at, with its transliteration and recording; null while loading. */
export function useExampleWord(ex: Pick<Example, 'ref' | 'hit'> | null | undefined): Word | null {
  const [w, setW] = useState<Word | null>(null);
  const ref = ex?.ref;
  const hit = ex?.hit;
  useEffect(() => {
    setW(null);
    if (!ref || hit === undefined) return;
    let live = true;
    loadVerseWords(ref)
      .then((ws) => live && setW(ws[hit] ?? null))
      .catch(() => live && setW(null));
    return () => {
      live = false;
    };
  }, [ref, hit]);
  return w;
}

// Diacritics and Quranic marks, to tell whether a verse word is spelled as the headword.
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
export const bare = (s: string) => s.replace(MARKS, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي');

/** The example to hear a headword by: one spelled exactly as the headword when there is one. */
export function soundSample(headword: string, candidates: (Example | null | undefined)[]): Example | null {
  const all = candidates.filter((x): x is Example => !!x);
  const h = bare(headword);
  return all.find((x) => bare(x.words[x.hit] ?? '') === h) ?? all[0] ?? null;
}

/**
 * How a headword sounds: the transliteration and recording of a real occurrence
 * (Quran.com transliteration; Alafasy's recitation), never generated. When the verse word is not spelled
 * exactly as the headword (a prefix, an ending), it says which word is heard.
 */
export function Pronounce({ ex, headword, center = false }: { ex: Pick<Example, 'ref' | 'hit'> | null | undefined; headword: string; center?: boolean }) {
  const w = useExampleWord(ex);
  if (!ex) return null;
  if (!w) return <div className={`h-11 ${center ? 'mx-auto' : ''} w-40 skeleton rounded-full`} />;
  const same = w.arabic === headword || bare(w.arabic) === bare(headword);
  return (
    <div className={`flex items-center gap-1 ${center ? 'justify-center' : ''}`}>
      <SpeakButton verseRef={ex.ref} position={w.position} label={w.translit ?? w.arabic} />
      <span className="flex min-w-0 flex-col items-start text-left leading-snug">
        {w.translit && <span className="text-[0.98rem] italic">{w.translit}</span>}
        <span className="text-[11px] text-muted">
          {same ? (
            <>as recited in {ex.ref}</>
          ) : (
            <>
              heard as{' '}
              <bdi lang="ar" className="ar-naskh text-[0.95rem] not-italic text-ink">
                {w.arabic}
              </bdi>{' '}
              in {ex.ref}
            </>
          )}
        </span>
      </span>
    </div>
  );
}
