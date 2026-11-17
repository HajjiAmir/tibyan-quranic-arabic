import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { displayMeaning, loadExamples, type Example, type Lemma, type Mastery, type Status, type VocabIndex } from '../lib/vocab';

// Pieces shared by the Learn page and vocabulary practice.

export function ExampleVerse({ ex }: { ex: Example }) {
  const [s] = ex.ref.split(':');
  return (
    <figure className="flex flex-col gap-1.5 rounded-xl border border-line/70 bg-paper/50 px-4 py-3">
      <p lang="ar" dir="rtl" className="ar text-[1.45rem] leading-[2.1]">
        {ex.words.map((w, i) => (
          <span key={i}>
            {i > 0 && ' '}
            <span className={i === ex.hit ? 'rounded-md bg-gold/15 px-1 text-gold' : undefined}>{w}</span>
          </span>
        ))}
      </p>
      <figcaption className="flex flex-col gap-1 text-[0.86rem] leading-relaxed text-ink/85">
        <span>{ex.translation}</span>
        <span className="text-xs text-muted">
          <Link to={`/surah/${s}`} className="tnum underline decoration-line underline-offset-2 hover:text-ink">
            {ex.ref}
          </Link>
          {ex.gloss && <> · here: “{ex.gloss}”</>}
        </span>
      </figcaption>
    </figure>
  );
}

export function useExamples(lemma: Lemma | null, chunk: number) {
  const [ex, setEx] = useState<Example[] | null>(null);
  useEffect(() => {
    setEx(null);
    if (!lemma) return;
    let live = true;
    loadExamples(lemma.id, chunk)
      .then((e) => live && setEx(e))
      .catch(() => live && setEx([]));
    return () => {
      live = false;
    };
  }, [lemma, chunk]);
  return ex;
}

/** Meaning, root and grammatical form of a lemma. */
export function LemmaFacts({ l }: { l: Lemma }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <p className="font-display text-xl font-semibold leading-snug">{displayMeaning(l)}</p>
        {l.meaning && l.inContext.length > 0 && (
          <p className="text-xs text-muted">In context: {l.inContext.join(' · ')}</p>
        )}
        {!l.meaning && l.inContext.length > 1 && (
          <p className="text-xs text-muted">Also: {l.inContext.slice(1).join(' · ')}</p>
        )}
      </div>
      <dl className="flex flex-wrap gap-1.5 text-xs">
        {l.root && (
          <Chip label="Root">
            <span lang="ar" className="ar-naskh text-[0.95rem] leading-none">
              {l.root.split('').join(' ')}
            </span>
          </Chip>
        )}
        <Chip label="Form">
          {l.pos.map(([p, n]) => (l.pos.length > 1 ? `${p} (${n})` : p)).join(' · ')}
          {l.form ? ` · Form ${l.form}` : ''}
        </Chip>
        <Chip label="Occurs">
          <span className="tnum">{l.count.toLocaleString()}×</span>
        </Chip>
      </dl>
      <p className="text-xs text-muted">
        e.g. <span className="ar-naskh text-[1rem]">{l.sample.arabic}</span> — {l.sample.description}
      </p>
    </div>
  );
}

function Chip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-line bg-paper/60 px-2.5 py-1">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

export function StatusDot({ status }: { status: Status }) {
  const cls = status === 'known' ? 'bg-emerald' : status === 'learning' ? 'bg-gold' : 'bg-line';
  return <span aria-label={status} title={status} className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

// ---- dashboard -----------------------------------------------------------------

function Ring({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0 -rotate-90 sm:h-36 sm:w-36" aria-hidden>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="9" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="rgb(var(--gold))"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${Math.max(value, value > 0 ? 0.004 : 0) * c} ${c}`}
        className="transition-[stroke-dasharray] duration-700"
      />
    </svg>
  );
}

const pct = (x: number) => (x === 0 ? '0' : x < 0.001 ? '<0.1' : (x * 100).toFixed(1));

export function Dashboard({ index, m }: { index: VocabIndex; m: Mastery }) {
  // Coverage of the most frequent N lemmas, as milestones on the bar.
  const marks = [100, 300, 1000].map((n) => ({
    n,
    at: index.lemmas.slice(0, n).reduce((t, l) => t + l.count, 0) / index.totals.words,
  }));
  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-7">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
        <div className="relative">
          <Ring value={m.coverage} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="tnum font-display text-[1.9rem] font-semibold leading-none text-gold">{pct(m.coverage)}%</span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted">of the Qur’an</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 text-center sm:text-left">
          <h2 className="font-display text-[1.35rem] font-semibold leading-snug tracking-tight text-balance">
            {m.known === 0
              ? 'Start with the words the Qur’an uses most'
              : `You now understand about ${pct(m.coverage)}% of the words in the Qur’an`}
          </h2>
          <p className="text-sm leading-relaxed text-muted text-pretty">
            {m.known === 0 ? (
              <>The 100 most frequent words make up {pct(marks[0].at)}% of all the words in the Qur’an.</>
            ) : (
              <>
                The <span className="tnum">{m.known.toLocaleString()}</span> words you know occur{' '}
                <span className="tnum">{m.coveredWords.toLocaleString()}</span> times among its{' '}
                <span className="tnum">{index.totals.words.toLocaleString()}</span> words.
              </>
            )}
            {m.nextStep && (
              <>
                {' '}
                Learn the next <span className="tnum font-medium text-ink">{m.nextStep.words}</span> to reach{' '}
                {m.nextStep.target}%.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5" aria-hidden>
        <div className="relative h-2 rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-gold transition-[width] duration-700" style={{ width: `${m.coverage * 100}%` }} />
          {marks.map((k) => (
            <span key={k.n} className="absolute top-[-3px] h-[14px] w-px bg-muted/50" style={{ left: `${k.at * 100}%` }} />
          ))}
        </div>
        <div className="relative h-4 text-[10px] text-muted">
          {marks.map((k) => (
            <span key={k.n} className="tnum absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${k.at * 100}%` }}>
              {k.n >= 1000 ? `${k.n / 1000}k` : k.n} words
            </span>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Tile label="Words known" value={m.known} sub={`${m.learning} learning`} />
        <Tile label="Roots known" value={m.rootsKnown} sub={`of ${index.totals.roots.toLocaleString()}`} />
        <Tile label="Due for review" value={m.due} sub={m.due ? 'ready now' : 'all caught up'} />
        <Tile label="Day streak" value={m.streak} sub={m.streak === 1 ? 'day' : 'days'} />
      </dl>
    </section>
  );
}

function Tile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-line/70 bg-paper/50 px-3.5 py-3">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="tnum font-display text-2xl font-semibold leading-tight">{value.toLocaleString()}</dd>
      <dd className="text-[11px] text-muted">{sub}</dd>
    </div>
  );
}
