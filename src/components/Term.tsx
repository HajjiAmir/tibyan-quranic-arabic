import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { descriptionTerms, findTerm, useGlossary, type GlossaryTerm } from '../lib/glossary';
import BottomSheet from './BottomSheet';

// Tappable grammar terms (brief 17). Any term the glossary explains is shown with a
// dotted underline; tapping it opens one explanation sheet, the same wording
// everywhere. Optional context ("here") names the word the term was tapped on.

export interface TermContext {
  arabic: string;
  gloss?: string | null;
  /** When the term is about one part of a word: the whole word and its meaning. */
  word?: string;
  wordGloss?: string | null;
}

interface Open {
  label: string;
  here?: TermContext;
  /** The other terms of the same label, to step through. */
  siblings?: string[];
}

let current: Open | null = null;
const listeners = new Set<() => void>();
function setOpen(o: Open | null) {
  current = o;
  listeners.forEach((f) => f());
}

/** Open the explanation of a term (also usable outside a <Term>). */
export const openTerm = (label: string, here?: TermContext, siblings?: string[]) => setOpen({ label, here, siblings });

/**
 * One term. Renders its text plainly when the glossary has no entry for it.
 * The visible text can differ from the label looked up (`label`).
 */
export function Term({
  label,
  children,
  here,
  siblings,
  className = '',
}: {
  label: string;
  children?: ReactNode;
  here?: TermContext;
  siblings?: string[];
  className?: string;
}) {
  const g = useGlossary();
  const t = findTerm(g, label);
  const text = children ?? label;
  if (!t) return <span className={className}>{text}</span>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        openTerm(label, here, siblings);
      }}
      className={`term ${className}`}
      aria-label={`${typeof text === 'string' ? text : label}: what does this mean?`}
      aria-haspopup="dialog"
    >
      {text}
    </button>
  );
}

/** A QAC description ("Noun — genitive, masculine") with every term tappable. */
export function TermLine({ text, here, className = '' }: { text: string; here?: TermContext; className?: string }) {
  const parts = descriptionTerms(text);
  if (parts.length === 0) return null;
  const [pos, ...rest] = parts;
  return (
    <span className={className}>
      <Term label={pos} here={here} siblings={parts} />
      {rest.length > 0 && ' — '}
      {rest.map((b, i) => (
        <span key={b}>
          {i > 0 && ', '}
          <Term label={b} here={here} siblings={parts} />
        </span>
      ))}
    </span>
  );
}

/** A comma-separated list of features ("perfect, 3rd person, masculine, plural"), each tappable. */
export function TermList({ text, here, className = '' }: { text: string; here?: TermContext; className?: string }) {
  const parts = text.split(', ').filter(Boolean);
  return (
    <span className={className}>
      {parts.map((b, i) => (
        <span key={b}>
          {i > 0 && ', '}
          <Term label={b} here={here} siblings={parts} />
        </span>
      ))}
    </span>
  );
}

/** The one explanation sheet, mounted once at the app root. */
export function TermHost() {
  const [open, set] = useState<Open | null>(current);
  useEffect(() => {
    const f = () => set(current);
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  }, []);
  const close = useCallback(() => setOpen(null), []);
  // A new page closes the explanation.
  const { pathname, search } = useLocation();
  useEffect(() => close(), [pathname, search, close]);
  const g = useGlossary();
  if (!open || !g) return null;
  const t = findTerm(g, open.label);
  if (!t) return null;
  const others = (open.siblings ?? []).filter((s) => findTerm(g, s) && findTerm(g, s)!.id !== t.id);
  return (
    <BottomSheet label={`What “${t.label}” means`} onClose={close} center>
      <TermExplanation t={t} here={open.here} onLeave={close} />
      {others.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line/70 px-5 py-3.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Also in this label</span>
          <div className="flex flex-wrap gap-1.5">
            {others.map((s) => (
              <button
                key={s}
                onClick={() => setOpen({ ...open, label: s })}
                className="tap-y inline-flex items-center rounded-full border border-line px-3 text-sm hover:border-accent/50"
              >
                {findTerm(g, s)!.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function TermExplanation({ t, here, onLeave }: { t: GlossaryTerm; here?: TermContext; onLeave: () => void }) {
  const ex = t.example;
  const whole = !here?.word || here.word === here.arabic;
  const [s, v] = ex?.ref.split(':') ?? [];
  return (
    <div className="flex flex-col gap-3.5 px-5 pb-4 pt-1">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[1.3rem] font-semibold leading-snug first-letter:uppercase">{t.label}</h2>
        {t.arabic && (
          <span lang="ar" className="ar-naskh shrink-0 text-[1.05rem] text-muted">
            {t.arabic}
          </span>
        )}
      </div>
      <p className="text-[0.98rem] leading-relaxed">{t.plain}</p>
      {here && (
        <p className="rounded-xl bg-accent/[0.08] px-3.5 py-2.5 text-[0.92rem] leading-relaxed">
          <span className="font-semibold">Here: </span>
          <bdi lang="ar" className="ar-naskh text-[1.15rem]">
            {here.arabic}
          </bdi>
          {(here.gloss ?? (whole ? here.wordGloss : null)) && <> “{here.gloss ?? here.wordGloss}”</>}
          {!whole ? (
            <>
              , part of{' '}
              <bdi lang="ar" className="ar-naskh text-[1.15rem]">
                {here.word}
              </bdi>
              {here.wordGloss && <> “{here.wordGloss}”</>}.
            </>
          ) : (
            '.'
          )}
        </p>
      )}
      {ex && ex.arabic !== (here?.word ?? here?.arabic) && (
        <p className="text-[0.9rem] leading-relaxed text-muted">
          <span className="font-medium text-ink">Example: </span>
          <bdi lang="ar" className="ar-naskh text-[1.15rem] text-ink">
            {ex.arabic}
          </bdi>
          {ex.gloss && <> “{ex.gloss}”</>}, in{' '}
          <Link to={`/surah/${s}?v=${v}`} onClick={onLeave} className="tnum underline decoration-line underline-offset-2 hover:text-ink">
            {ex.ref}
          </Link>
          .
        </p>
      )}
      <p className="text-[11px] leading-snug text-muted/90">
        A plain summary of standard grammar
        {t.sources.length > 0 && (
          <>
            {' '}
            from{' '}
            {t.sources.map((src, i) => (
              <span key={src.url}>
                {i > 0 && '; '}
                <a href={src.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:text-ink">
                  {src.title}
                </a>
              </span>
            ))}
          </>
        )}
        . The label is the Quranic Arabic Corpus’s, and the English shown is its word-by-word gloss.
      </p>
    </div>
  );
}
