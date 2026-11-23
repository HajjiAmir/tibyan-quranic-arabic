import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Segmented } from '../components/PracticeKit';
import { Dashboard, StatusActions, StatusDot } from '../components/VocabBits';
import { WordCard, useDetail } from '../components/TeachCard';
import { RootsPreview } from './LearnRoots';
import { BATCH, TRACKS, trackState, type LearnItem, type TrackId } from '../lib/learn';
import {
  KIND_LABEL,
  displayMeaning,
  familySense,
  rootFamily,
  inPool,
  loadVocab,
  mastery,
  statusOf,
  vocabTrack,
  wordPath,
  type Lemma,
  type Pool,
  type VocabIndex,
} from '../lib/vocab';

const PAGE = 30;
const POOL_KEY = 'tibyan.learn.pool.v1';
const readPool = (): Pool => {
  try {
    const p = localStorage.getItem(POOL_KEY);
    return p === 'content' || p === 'function' ? p : 'all';
  } catch {
    return 'all';
  }
};

export default function Learn() {
  const [index, setIndex] = useState<VocabIndex | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pool, setPool] = useState<Pool>(readPool);
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<number | null>(null);
  // Bumped after any change to progress, so derived numbers recompute.
  const [rev, setRev] = useState(0);

  useEffect(() => {
    loadVocab().then(setIndex).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(POOL_KEY, pool);
    } catch {
      /* not kept */
    }
    setShown(PAGE);
  }, [pool]);

  const m = useMemo(() => (index ? mastery(index) : null), [index, rev]);
  const store = useMemo(() => vocabTrack.read(), [rev]);
  const list = useMemo(() => (index ? index.lemmas.filter((l) => inPool(l, pool)) : []), [index, pool]);

  if (err) return <p style={{ color: 'var(--role-negation)' }}>Could not load the vocabulary. {err}</p>;
  if (!index || !m) return <div className="mx-auto h-80 max-w-reading skeleton card" />;

  const firstNew = list.find((l) => statusOf(l, store) === 'new');

  return (
    <div className="mx-auto flex max-w-reading flex-col gap-8 sm:gap-10">
      <header className="title-bloom flex flex-col items-center gap-3 pt-6 text-center sm:pt-10">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Vocabulary mastery</span>
        <h1 className="font-display text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-[2.3rem]">
          Learn the Qur’an’s words, most frequent first
        </h1>
      </header>

      <Dashboard index={index} m={m} />

      <PathPanel index={index} rev={rev} />

      <RootsPreview index={index} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Every word, in order</h2>
            <p className="text-xs text-muted">
              {list.length.toLocaleString()} words and forms in frequency order
              {firstNew ? ` · next new word: #${firstNew.id}` : ''}
            </p>
          </div>
          <Segmented
            value={pool}
            onChange={setPool}
            options={[
              ['all', 'All'],
              ['content', 'Content'],
              ['function', 'Function'],
            ]}
          />
        </div>

        <ol className="flex flex-col overflow-hidden card">
          {list.slice(0, shown).map((l) => (
            <Row
              key={l.id}
              l={l}
              chunk={index.chunk}
              status={statusOf(l, store)}
              open={open === l.id}
              onToggle={() => setOpen((o) => (o === l.id ? null : l.id))}
              onChange={() => setRev((r) => r + 1)}
            />
          ))}
        </ol>
        {shown < list.length && (
          <button
            onClick={() => setShown((n) => n + PAGE)}
            className="btn btn-secondary self-center font-medium"
          >
            Show {Math.min(PAGE, list.length - shown)} more
          </button>
        )}
        <p className="text-xs leading-relaxed text-muted">
          Counted per word: each of the Qur’an’s {index.totals.words.toLocaleString()} words counts once, for its main
          word — a corpus lemma, a separate pronoun (<bdi lang="ar" className="ar-naskh">هُوَ</bdi>,{' '}
          <bdi lang="ar" className="ar-naskh">نَحْنُ</bdi> …) or a set of Quranic initials. Attached prefixes (
          <bdi lang="ar" className="ar-naskh">وَ</bdi>, <bdi lang="ar" className="ar-naskh">بِ</bdi>,{' '}
          <bdi lang="ar" className="ar-naskh">ٱل</bdi> …) and attached pronouns (<bdi lang="ar" className="ar-naskh">ـهُ</bdi>,{' '}
          <bdi lang="ar" className="ar-naskh">ـكُمْ</bdi> …) are listed too, ranked by how often they are attached, but are not
          added to coverage. A word counts as learned once its batch test is passed, and as secure after a few spaced
          refreshers answered right.
          Lemmas, roots, grammar and prefix meanings: Quranic Arabic Corpus; pronoun and article meanings: the reviewed
          pronoun table; meanings in context: Quran.com word-by-word; verse translations: Saheeh International.
        </p>
      </section>
    </div>
  );
}

function Row({
  l,
  chunk,
  status,
  open,
  onToggle,
  onChange,
}: {
  l: Lemma;
  chunk: number;
  status: ReturnType<typeof statusOf>;
  open: boolean;
  onToggle: () => void;
  onChange: () => void;
}) {
  const detail = useDetail(open ? l : null, chunk);
  return (
    <li className="border-b border-line/60 last:border-b-0">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2/40 sm:px-4"
      >
        <span className="tnum w-9 shrink-0 text-right text-xs text-muted">{l.id}</span>
        <StatusDot status={status} />
        <span lang="ar" className="ar-naskh w-[5.5rem] shrink-0 text-right text-[1.45rem] leading-[1.6] sm:w-28">
          {l.lemma}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[0.92rem] font-medium">{displayMeaning(l)}</span>
          <span className="truncate text-[11px] text-muted">
            {l.kind ? KIND_LABEL[l.kind] : l.pos[0]?.[0]}
            {l.root ? ` · root ${l.root}` : ''}
          </span>
        </span>
        <span className="tnum shrink-0 text-xs text-muted">{l.count.toLocaleString()}×</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-line/50 bg-paper/30 px-4 pb-4 pt-3">
          <WordCard l={l} detail={detail} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusActions l={l} status={status} onChange={onChange} />
            <Link to={wordPath(l)} className="text-xs font-medium text-accent underline underline-offset-4">
              Word page →
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}

/* ------------------------------ the gated path ------------------------------ */

const TRACK_KEY = 'tibyan.learn.track.v1';
const readTrack = (): TrackId => {
  try {
    const t = localStorage.getItem(TRACK_KEY);
    return t === 'roots' || t === 'attached' ? t : 'words';
  } catch {
    return 'words';
  }
};

function itemLabel(index: VocabIndex, i: LearnItem): { ar: string; en: string } {
  if (i.track === 'roots') return { ar: i.root.split('').join(' '), en: familySense(rootFamily(index, i.root), 1)[0] ?? '' };
  return { ar: i.lemma.lemma, en: displayMeaning(i.lemma) };
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function PathPanel({ index, rev }: { index: VocabIndex; rev: number }) {
  const [track, setTrack] = useState<TrackId>(readTrack);
  useEffect(() => {
    try {
      localStorage.setItem(TRACK_KEY, track);
    } catch {
      /* not kept */
    }
  }, [track]);
  const states = useMemo(
    () => ({ words: trackState(index, 'words'), roots: trackState(index, 'roots'), attached: trackState(index, 'attached') }),
    [index, rev],
  );
  const st = states[track];
  const t = TRACKS[track];
  const complete = st.current >= st.batches;
  const store = new Set(st.batchItems.filter((i) => !st.toLearn.includes(i)).map((i) => i.key));

  return (
    <section className="flex flex-col gap-4 card-raised p-5 sm:p-6" aria-labelledby="path-h">
      <div className="flex flex-col gap-1">
        <h2 id="path-h" className="font-display text-xl font-semibold tracking-tight">
          Your learning path
        </h2>
        <p className="text-xs leading-relaxed text-muted text-pretty">
          In batches of {BATCH}, most frequent first: learn the cards, pass the test, and the next batch opens. Learned
          items come back as refreshers when they are due.
        </p>
      </div>

      <div className="seg grid grid-cols-3 text-[13px]" role="tablist" aria-label="Track">
        {(Object.keys(TRACKS) as TrackId[]).map((k) => (
          <button key={k} role="tab" aria-selected={track === k} aria-pressed={track === k} onClick={() => setTrack(k)} className="flex flex-col items-center leading-tight">
            <span>{TRACKS[k].label}</span>
            {states[k].due.length > 0 && <span className="tnum text-[10px] font-medium text-accent">{states[k].due.length} due</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-[1.15rem] font-semibold">
          {complete ? `All ${st.total.toLocaleString()} ${t.many} learned` : `Batch ${st.current + 1} of ${st.batches.toLocaleString()}`}
        </p>
        <p className="tnum text-xs text-muted">
          {st.banked.toLocaleString()} of {st.total.toLocaleString()} learned · {st.secure.toLocaleString()} secure
        </p>
      </div>

      <ol className="flex items-center gap-1.5 text-[11px] font-medium" aria-label="How a batch works">
        {['Learn these', 'Test', 'Unlock next'].map((label, i) => (
          <li key={label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-muted">→</span>}
            <span className={`rounded-full border px-2.5 py-1 ${i === 0 ? 'border-accent/60 bg-accent/15' : 'border-line text-muted'}`}>{label}</span>
          </li>
        ))}
      </ol>

      {!complete && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {st.batchItems.map((i) => {
            const { ar, en } = itemLabel(index, i);
            const done = store.has(i.key);
            return (
              <li key={i.key} className={`flex min-w-0 flex-col rounded-xl border px-3 py-2 ${done ? 'border-emerald/40 bg-emerald/[0.06]' : 'border-line bg-paper/50'}`}>
                <span lang="ar" className="ar-naskh truncate text-[1.3rem] leading-[1.6]">
                  {ar}
                </span>
                <span className="truncate text-[11px] text-muted">{done ? '✓ learned' : en}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {!complete && (
          <Link to={`/learn/study/${track}`} className="btn btn-primary btn-lg flex-1 justify-center">
            {st.toLearn.length < st.batchItems.length ? 'Continue' : 'Learn'} batch {st.current + 1} →
          </Link>
        )}
        {st.due.length > 0 && (
          <Link to={`/learn/study/${track}?mode=review`} className="btn btn-secondary btn-lg flex-1 justify-center">
            Review {Math.min(st.due.length, 12)} due
          </Link>
        )}
      </div>
      {st.due.length > 0 && !complete && (
        <p className="-mt-1 text-center text-[11px] text-muted">
          A batch also folds in up to 3 due refreshers; the review clears the rest.
        </p>
      )}

      {st.next.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line px-3.5 py-3" aria-label="Next batch, locked">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <LockIcon /> Batch {st.current + 2} · opens when you pass batch {st.current + 1}
          </p>
          <p lang="ar" dir="rtl" className="ar-naskh text-[1.15rem] leading-[1.8] text-muted/80">
            {st.next.map((i) => itemLabel(index, i).ar).join(' · ')}
          </p>
        </div>
      )}
    </section>
  );
}
