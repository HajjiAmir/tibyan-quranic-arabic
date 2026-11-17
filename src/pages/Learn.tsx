import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Segmented } from '../components/PracticeKit';
import { Dashboard, ExampleVerse, LemmaFacts, StatusActions, StatusDot, useExamples } from '../components/VocabBits';
import { RootsPreview } from './LearnRoots';
import {
  KIND_LABEL,
  displayMeaning,
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
  if (!index || !m) return <div className="mx-auto h-80 max-w-reading animate-pulse card" />;

  const firstNew = list.find((l) => statusOf(l, store) === 'new');

  return (
    <div className="mx-auto flex max-w-reading flex-col gap-7">
      <header className="flex flex-col items-center gap-2 pt-4 text-center sm:pt-8">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Vocabulary mastery</span>
        <h1 className="font-display text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-[2.3rem]">
          Learn the Qur’an’s words, most frequent first
        </h1>
      </header>

      <Dashboard index={index} m={m} />

      <div className="flex flex-col items-center gap-2">
        <Link
          to="/learn/practice"
          className="btn btn-primary btn-lg"
        >
          {m.due > 0 ? `Review ${m.due} due ${m.due === 1 ? 'word' : 'words'}` : 'Practise new words'} →
        </Link>
        <p className="text-xs text-muted">Flashcards and quizzes over the whole Qur’an, due words first.</p>
      </div>

      <RootsPreview index={index} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Learning path</h2>
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
          added to coverage. A word counts as known after a few spaced correct answers, or when you mark it known.
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
  const examples = useExamples(open ? l : null, chunk);
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
          <LemmaFacts l={l} />
          {examples === null ? (
            <div className="h-20 animate-pulse rounded-xl bg-surface-2/60" />
          ) : (
            examples.map((ex) => <ExampleVerse key={ex.ref} ex={ex} />)
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusActions l={l} status={status} onChange={onChange} />
            <Link to={wordPath(l)} className="text-xs font-medium text-gold underline underline-offset-4">
              Word page →
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}
