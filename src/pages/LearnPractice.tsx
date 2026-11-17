import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Segmented, StatBar } from '../components/PracticeKit';
import { ExampleVerse, LemmaFacts, useExamples } from '../components/VocabBits';
import {
  displayMeaning,
  keyOf,
  loadVocab,
  poolStats,
  vocabQuiz,
  vocabSession,
  vocabTrack,
  type Lemma,
  type Pool,
  type VocabIndex,
  type VocabQuestion,
} from '../lib/vocab';

type Mode = 'flashcards' | 'quiz';

export default function LearnPractice() {
  const [index, setIndex] = useState<VocabIndex | null>(null);
  const [mode, setMode] = useState<Mode>('flashcards');
  const [pool, setPool] = useState<Pool>('all');

  useEffect(() => {
    loadVocab().then(setIndex).catch(() => {});
  }, []);

  if (!index) return <div className="mx-auto h-64 max-w-reading animate-pulse card" />;

  return (
    <div className="mx-auto flex max-w-reading flex-col gap-5">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-xs uppercase tracking-widest text-muted">Vocabulary practice</span>
        <h1 className="font-display text-2xl font-semibold">The whole Qur’an, most frequent first</h1>
        <Link to="/learn" className="tap mt-1 inline-flex items-center text-xs text-muted hover:text-ink">
          ← Progress and word list
        </Link>
      </div>

      <div className="seg mx-auto text-sm">
        {(['flashcards', 'quiz'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className="capitalize"
          >
            {m}
          </button>
        ))}
      </div>
      <Segmented
        value={pool}
        onChange={setPool}
        options={[
          ['all', 'All words'],
          ['content', 'Content'],
          ['function', 'Function'],
        ]}
      />

      {mode === 'flashcards' ? (
        <Flashcards key={pool} index={index} pool={pool} />
      ) : (
        <Quiz key={pool} index={index} pool={pool} />
      )}
    </div>
  );
}

/* --------------------------------- Flashcards ---------------------------- */

function Flashcards({ index, pool }: { index: VocabIndex; pool: Pool }) {
  const [session, setSession] = useState<Lemma[]>(() => vocabSession(index, pool));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const card = session[idx] ?? null;
  const examples = useExamples(card, index.chunk);
  const s = poolStats(index, pool);
  const box = card ? vocabTrack.read()[keyOf(card)]?.box : undefined;

  function next(good: boolean) {
    if (!card) return;
    vocabTrack.rate(keyOf(card), good);
    setDone((d) => d + 1);
    setRevealed(false);
    setIdx((i) => i + 1);
  }
  function restart() {
    setSession(vocabSession(index, pool));
    setIdx(0);
    setRevealed(false);
    setDone(0);
  }

  return (
    <div className="flex flex-col gap-4">
      <StatBar known={s.known} learning={s.learning} unseen={s.unseen} />
      {!card ? (
        <div className="flex flex-col items-center gap-3 card p-10 text-center">
          <p className="font-display text-lg font-semibold">
            {done > 0 ? `Reviewed ${done} ${done === 1 ? 'word' : 'words'}. Well done.` : 'Nothing due right now.'}
          </p>
          <p className="max-w-sm text-sm text-muted">
            Missed words return sooner; words you knew come back later. A new session adds the next most frequent words.
          </p>
          <button onClick={restart} className="btn btn-primary">
            New session
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Card {idx + 1} of {session.length}
            </span>
            <span className="tnum">
              #{card.id} · {box ? 'review' : 'new'} · {card.count.toLocaleString()}× in the Qur’an
            </span>
          </div>
          <div className="card-raised p-5 sm:p-6">
            <p lang="ar" className="ar mb-2 text-center text-[3.2rem] leading-[1.9]">
              {card.lemma}
            </p>
            {!revealed ? (
              <div className="mt-4 flex flex-col items-center gap-3">
                <p className="text-sm text-muted">What does it mean? Recall its root and form too.</p>
                <button onClick={() => setRevealed(true)} className="btn btn-secondary">
                  Show answer
                </button>
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-3">
                <LemmaFacts l={card} />
                {examples === null ? (
                  <div className="h-20 animate-pulse rounded-xl bg-surface-2/60" />
                ) : (
                  examples.slice(0, 1).map((ex) => <ExampleVerse key={ex.ref} ex={ex} />)
                )}
              </div>
            )}
          </div>
          {revealed && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => next(false)}
                className="rounded-xl border px-4 py-3 text-sm font-semibold"
                style={{ borderColor: 'var(--role-negation)', color: 'var(--role-negation)' }}
              >
                Again
              </button>
              <button onClick={() => next(true)} className="rounded-xl border border-emerald bg-emerald/10 px-4 py-3 text-sm font-semibold text-emerald">
                Got it
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------ Quiz ------------------------------- */

function Quiz({ index, pool }: { index: VocabIndex; pool: Pool }) {
  const [questions, setQuestions] = useState<VocabQuestion[]>(() => vocabQuiz(index, pool));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const q = questions[idx];
  const examples = useExamples(picked && q ? q.lemma : null, index.chunk);

  function pick(opt: string) {
    if (picked) return;
    setPicked(opt);
    const correct = opt === q.answer;
    if (correct) setScore((s) => s + 1);
    vocabTrack.rate(keyOf(q.lemma), correct);
  }
  function restart() {
    setQuestions(vocabQuiz(index, pool));
    setIdx(0);
    setPicked(null);
    setScore(0);
  }

  if (!q) {
    const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="flex flex-col items-center gap-3 card p-10 text-center">
        <p className="font-display text-3xl font-semibold text-accent">
          {score} / {questions.length}
        </p>
        <p className="text-sm text-muted">
          {pct >= 80 ? 'Excellent work, mashallah.' : pct >= 50 ? 'Good — keep practising.' : 'Keep going, it builds fast.'}
        </p>
        <button onClick={restart} className="btn btn-primary">
          New quiz
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Question {idx + 1} of {questions.length}
        </span>
        <span className="tnum">Score {score}</span>
      </div>
      <div className="card-raised p-6 text-center">
        {q.cueArabic ? (
          <p lang="ar" className="ar mb-3 text-[3.2rem] leading-[1.9]">
            {q.cue}
          </p>
        ) : (
          <p className="mb-3 font-display text-3xl font-semibold leading-tight">{q.cue}</p>
        )}
        <p className="text-sm font-medium text-muted">{q.prompt}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {q.options.map((opt) => {
          const isAnswer = opt === q.answer;
          const isPicked = opt === picked;
          let cls = 'border-line bg-surface hover:border-accent/50';
          if (picked) {
            if (isAnswer) cls = 'border-emerald bg-emerald/10 text-emerald';
            else if (isPicked) cls = 'bg-surface-2';
          }
          return (
            <button
              key={opt}
              onClick={() => pick(opt)}
              disabled={!!picked}
              className={`rounded-xl border px-4 py-3 text-center font-medium transition-colors ${cls}`}
              style={picked && isPicked && !isAnswer ? { borderColor: 'var(--role-negation)', color: 'var(--role-negation)' } : undefined}
            >
              <span lang={q.optionsArabic ? 'ar' : undefined} className={q.optionsArabic ? 'ar-naskh text-2xl' : 'text-sm'}>
                {q.kind === 'root' ? opt.split('').join(' ') : opt}
              </span>
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm">
            <span lang="ar" className="ar-naskh text-xl">
              {q.lemma.lemma}
            </span>
            <span className="text-muted"> — </span>
            <span className="font-medium">{displayMeaning(q.lemma)}</span>
            <span className="text-muted">
              {' '}
              · {q.lemma.pos[0]?.[0]}
              {q.lemma.root ? ` · root ${q.lemma.root.split('').join(' ')}` : ''}
            </span>
          </p>
          {examples && examples[0] && <ExampleVerse ex={examples[0]} />}
          <button
            onClick={() => {
              setPicked(null);
              setIdx((i) => i + 1);
            }}
            className="btn btn-secondary self-center"
          >
            {idx + 1 >= questions.length ? 'See results' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
}
