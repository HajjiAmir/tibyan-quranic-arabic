import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  KIND_LABEL,
  displayMeaning,
  forget,
  isAttached,
  loadExamples,
  markKnown,
  rootPath,
  wordPath,
  type Example,
  type Lemma,
  type Mastery,
  type Status,
  type VocabIndex,
} from '../lib/vocab';

// Pieces shared by the Learn page and vocabulary practice.

export function ExampleVerse({ ex }: { ex: Example }) {
  const [s, v] = ex.ref.split(':');
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
          <Link
            to={`/surah/${s}?v=${v}`}
            className="tnum underline decoration-line underline-offset-2 hover:text-ink"
            aria-label={`Open verse ${ex.ref} in the reader`}
          >
            {ex.ref} →
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
  const attached = isAttached(l);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <p className="font-display text-xl font-semibold leading-snug">{displayMeaning(l)}</p>
        {l.kind === 'initials' ? (
          <p className="text-xs text-muted">
            Quranic initials: read by their letter names. The word-by-word gloss gives the letter names, not a
            translation.
          </p>
        ) : (
          <>
            {l.meaning && l.inContext.length > 0 && (
              <p className="text-xs text-muted">In context: {l.inContext.join(' · ')}</p>
            )}
            {!l.meaning && l.inContext.length > 1 && (
              <p className="text-xs text-muted">Also: {l.inContext.slice(1).join(' · ')}</p>
            )}
          </>
        )}
      </div>
      {l.senses && l.senses.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl border border-line/70 bg-paper/50 px-3 py-2 text-xs">
          {l.senses.map(([use, gloss, n]) => (
            <li key={use + gloss} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0">
                <span className="text-muted">{use}</span>
                {gloss && <span className="font-medium"> — {gloss}</span>}
              </span>
              <span className="tnum shrink-0 text-muted">{n.toLocaleString()}×</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="flex flex-wrap gap-1.5 text-xs">
        {l.kind && <Chip label="Type">{KIND_LABEL[l.kind]}</Chip>}
        {l.root && (
          <Chip label="Root">
            <Link
              to={rootPath(l.root)}
              className="inline-flex items-center gap-1 underline decoration-gold/40 underline-offset-4 hover:text-gold"
              aria-label={`Root ${l.root}: see its word family`}
            >
              <span lang="ar" className="ar-naskh text-[0.95rem] leading-none">
                {l.root.split('').join(' ')}
              </span>
              <span className="text-gold">family →</span>
            </Link>
          </Chip>
        )}
        {!attached && (
          <Chip label="Form">
            {l.pos.map(([p, n]) => (l.pos.length > 1 ? `${p} (${n})` : p)).join(' · ')}
            {l.form ? ` · Form ${l.form}` : ''}
          </Chip>
        )}
        <Chip label={attached ? 'Attached' : 'Occurs'}>
          <span className="tnum">{l.count.toLocaleString()}×</span>
        </Chip>
      </dl>
      {l.spellings && (
        <p className="text-xs text-muted">
          Spellings:{' '}
          {l.spellings.map((sp, i) => (
            <span key={sp}>
              {i > 0 && ' · '}
              <bdi lang="ar" className="ar-naskh text-[1rem]">
                {sp}
              </bdi>
            </span>
          ))}
        </p>
      )}
      <p className="text-xs text-muted">
        e.g. <bdi lang="ar" className="ar-naskh text-[1rem]">{l.sample.arabic}</bdi> — {l.sample.description}
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
  const words = index.lemmas.filter((l) => !isAttached(l));
  const marks = [100, 300, 1000].map((n) => ({
    n,
    at: words.slice(0, n).reduce((t, l) => t + l.count, 0) / index.totals.words,
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
          <span className="absolute left-0">Top words</span>
          {marks.map((k) => (
            <span key={k.n} className="tnum absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${k.at * 100}%` }}>
              {k.n >= 1000 ? `${k.n / 1000}k` : k.n}
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
      {m.attachedTotal > 0 && (
        <p className="text-center text-xs leading-relaxed text-muted text-pretty sm:text-left">
          Attached forms (<bdi lang="ar" className="ar-naskh">وَ</bdi>, <bdi lang="ar" className="ar-naskh">ٱل</bdi>,{' '}
          <bdi lang="ar" className="ar-naskh">ـهُمْ</bdi> …): <span className="tnum font-medium text-ink">{m.attachedKnown}</span> of{' '}
          <span className="tnum">{m.attachedTotal}</span> known. They are not added to coverage, because every word already
          counts once, for its main word.
        </p>
      )}
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

/** "I know this word" / Reset, shared by the list rows and the word page. */
export function StatusActions({ l, status, onChange }: { l: Lemma; status: Status; onChange: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {status !== 'known' ? (
        <button
          onClick={() => {
            markKnown(l);
            onChange();
          }}
          className="rounded-lg border border-emerald/60 bg-emerald/10 px-3 py-1.5 text-xs font-semibold text-emerald"
        >
          I know this {isAttached(l) ? 'form' : 'word'}
        </button>
      ) : (
        <span className="rounded-lg bg-emerald/10 px-3 py-1.5 text-xs font-semibold text-emerald">Known ✓</span>
      )}
      {status !== 'new' && (
        <button
          onClick={() => {
            forget(l);
            onChange();
          }}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
        >
          Reset
        </button>
      )}
    </div>
  );
}

/** One lemma as a compact linked row (root families, word page). */
export function LemmaLink({ l, status, current }: { l: Lemma; status: Status; current?: boolean }) {
  return (
    <Link
      to={wordPath(l)}
      aria-current={current ? 'page' : undefined}
      className={`flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-surface-2/40 sm:px-4 ${
        current ? 'bg-gold/[0.07]' : ''
      }`}
    >
      <StatusDot status={status} />
      <span lang="ar" className="ar-naskh w-[5.5rem] shrink-0 text-right text-[1.4rem] leading-[1.6] sm:w-28">
        {l.lemma}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[0.92rem] font-medium">{displayMeaning(l)}</span>
        <span className="truncate text-[11px] text-muted">
          {l.pos[0]?.[0]}
          {l.form ? ` · Form ${l.form}` : ''} · #{l.id}
        </span>
      </span>
      <span className="tnum shrink-0 text-xs text-muted">{l.count.toLocaleString()}×</span>
    </Link>
  );
}
