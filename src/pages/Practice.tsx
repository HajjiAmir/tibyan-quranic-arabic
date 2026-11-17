import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadSurah } from '../lib/data';
import type { Surah } from '../types';
import {
  buildItems,
  buildQuiz,
  buildSession,
  deckItems,
  deckKey,
  rate,
  stats,
  type Deck,
  type Item,
  type Question,
  type QuizFocus,
} from '../lib/practice';
import GrammarPanel from '../components/GrammarPanel';
import { Segmented, StatBar } from '../components/PracticeKit';

type Mode = 'flashcards' | 'quiz';

export default function Practice() {
  const { id } = useParams();
  const surahId = Number(id);
  const [surah, setSurah] = useState<Surah | null>(null);
  const [mode, setMode] = useState<Mode>('flashcards');
  const [deck, setDeck] = useState<Deck>('meaning');
  const [focus, setFocus] = useState<QuizFocus>('mixed');

  useEffect(() => {
    setSurah(null);
    window.scrollTo(0, 0);
    loadSurah(surahId).then(setSurah).catch(() => {});
  }, [surahId]);

  const items = useMemo(() => (surah ? buildItems(surah) : []), [surah]);

  if (!surah) return <div className="h-64 animate-pulse card" />;

  return (
    <div className="mx-auto flex max-w-reading flex-col gap-5">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-xs uppercase tracking-widest text-muted">Practice</span>
        <h1 className="ar-title text-[2.6rem] text-accent">{surah.name}</h1>
        <h2 className="font-display text-xl font-semibold">{surah.transliteration}</h2>
        <Link to={`/surah/${surah.id}`} className="tap mt-1 inline-flex items-center text-xs text-muted hover:text-ink">
          ← Back to reading
        </Link>
      </div>

      <div className="seg mx-auto text-sm">
        {(['flashcards', 'quiz'] as Mode[]).map((m) => (
          <button
            key={m}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className="capitalize"
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'flashcards' ? (
        <>
          <Segmented
            value={deck}
            onChange={setDeck}
            options={[
              ['meaning', 'Meaning'],
              ['grammar', 'Grammar'],
            ]}
          />
          <Flashcards key={deck} deck={deck} items={deckItems(items, deck)} />
        </>
      ) : (
        <>
          <Segmented
            value={focus}
            onChange={setFocus}
            options={[
              ['mixed', 'Mixed'],
              ['meaning', 'Meaning'],
              ['grammar', 'Grammar'],
            ]}
          />
          <Quiz key={focus} focus={focus} items={items} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Flashcards ---------------------------- */

function Flashcards({ items, deck }: { items: Item[]; deck: Deck }) {
  const [session, setSession] = useState<Item[]>(() => buildSession(items, deck));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);

  const s = stats(items, deck);
  const card = session[idx];

  function next(good: boolean) {
    if (!card) return;
    rate(deckKey(card, deck), good);
    setDone((d) => d + 1);
    setRevealed(false);
    setIdx((i) => i + 1);
  }

  function restart() {
    setSession(buildSession(items, deck));
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
            Missed words return sooner; words you knew come back later. Come back anytime to keep them fresh.
          </p>
          <button
            onClick={restart}
            className="btn btn-primary"
          >
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
              {card.surah}:{card.verse}
            </span>
          </div>

          <div className="card-raised p-6">
            <p className="ar mb-2 text-center text-[3.2rem] leading-[1.9]">{card.arabic}</p>
            {!revealed ? (
              <div className="mt-6 flex flex-col items-center gap-3">
                <p className="text-sm text-muted">
                  {deck === 'meaning' ? 'What does this word mean?' : 'Recall its role, root and form.'}
                </p>
                <button
                  onClick={() => setRevealed(true)}
                  className="btn btn-secondary"
                >
                  Show answer
                </button>
              </div>
            ) : (
              <div className="mt-2">
                {deck === 'meaning' && card.gloss && (
                  <div className="mb-1 flex flex-col items-center gap-0.5 text-center">
                    <p className="font-display text-2xl font-semibold">{card.gloss}</p>
                    {card.translit && <p className="text-sm italic text-muted">{card.translit}</p>}
                  </div>
                )}
                <GrammarPanel word={card.word} />
                <p className="mt-3 text-center text-sm italic text-muted">
                  &ldquo;{card.verseTranslation}&rdquo;
                </p>
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
              <button
                onClick={() => next(true)}
                className="rounded-xl border border-emerald bg-emerald/10 px-4 py-3 text-sm font-semibold text-emerald"
              >
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

function Quiz({ items, focus }: { items: Item[]; focus: QuizFocus }) {
  const [questions, setQuestions] = useState<Question[]>(() => buildQuiz(items, focus));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const q = questions[idx];
  const finished = idx >= questions.length;

  function pick(opt: string) {
    if (picked) return;
    setPicked(opt);
    const correct = opt === q.answer;
    if (correct) setScore((s) => s + 1);
    rate(deckKey(q.item, q.deck), correct);
  }
  function next() {
    setPicked(null);
    setIdx((i) => i + 1);
  }
  function restart() {
    setQuestions(buildQuiz(items, focus));
    setIdx(0);
    setPicked(null);
    setScore(0);
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center gap-3 card p-10 text-center">
        <p className="font-display text-3xl font-semibold text-accent">
          {score} / {questions.length}
        </p>
        <p className="text-sm text-muted">
          {pct >= 80 ? 'Excellent work, mashallah.' : pct >= 50 ? 'Good — keep practising.' : 'Keep going, it builds fast.'}
        </p>
        <button
          onClick={restart}
          className="btn btn-primary"
        >
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
        {q.kind === 'word' ? (
          <p className="mb-3 font-display text-3xl font-semibold leading-tight">{q.cue}</p>
        ) : (
          <p className="ar mb-3 text-[3.2rem] leading-[1.9]">{q.cue}</p>
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
          const arabicOpt = q.kind === 'root' || q.kind === 'word';
          return (
            <button
              key={opt}
              onClick={() => pick(opt)}
              disabled={!!picked}
              className={`rounded-xl border px-4 py-3 text-center font-medium transition-colors ${cls}`}
              style={
                picked && isPicked && !isAnswer ? { borderColor: 'var(--role-negation)', color: 'var(--role-negation)' } : undefined
              }
            >
              <span className={arabicOpt ? 'ar-naskh text-2xl' : 'text-sm'}>{opt}</span>
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="flex flex-col gap-3">
          {(q.kind === 'meaning' || q.kind === 'word') && (
            <p className="text-center text-sm">
              <span className="ar-naskh text-xl">{q.item.arabic}</span>
              <span className="text-muted"> — </span>
              <span className="font-medium">{q.item.gloss}</span>
              <span className="tnum text-muted"> ({q.item.surah}:{q.item.verse})</span>
            </p>
          )}
          <p className="text-center text-sm italic text-muted">&ldquo;{q.item.verseTranslation}&rdquo;</p>
          <button
            onClick={next}
            className="btn btn-secondary self-center"
          >
            {idx + 1 >= questions.length ? 'See results' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
}
