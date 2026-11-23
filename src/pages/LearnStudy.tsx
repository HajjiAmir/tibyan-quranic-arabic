import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CardFront, RootCard, WordCard, useDetail } from '../components/TeachCard';
import { ExampleVerse } from '../components/VocabBits';
import {
  TRACKS,
  bankSession,
  loadDetails,
  makeQuestion,
  startSession,
  trackState,
  type LearnItem,
  type Question,
  type Session,
  type TrackId,
} from '../lib/learn';
import { loadVocab, type Detail, type VocabIndex } from '../lib/vocab';

const isTrack = (t: string | undefined): t is TrackId => t === 'words' || t === 'roots' || t === 'attached';

/** One run of the loop for a track: learn the batch, pass its test, bank it. */
export default function LearnStudy() {
  const { track } = useParams();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'review' ? 'review' : 'batch';
  const [index, setIndex] = useState<VocabIndex | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    loadVocab().then(setIndex).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [run, track, mode]);

  const session = useMemo(() => (index && isTrack(track) ? startSession(index, track, mode) : null), [index, track, mode, run]);

  if (!isTrack(track))
    return (
      <p className="pt-10 text-center text-sm text-muted">
        Unknown track. <Link to="/learn" className="text-accent underline">Back to Learn</Link>
      </p>
    );
  if (err) return <p style={{ color: 'var(--role-negation)' }}>Could not load the vocabulary. {err}</p>;
  if (!index || !session) return <div className="mx-auto h-80 max-w-reading skeleton card" />;

  return <Run key={`${track}-${mode}-${run}`} index={index} session={session} onAgain={() => setRun((r) => r + 1)} />;
}

type Phase = 'learn' | 'test' | 'passed';

function Stepper({ phase, review }: { phase: Phase; review: boolean }) {
  const steps: [Phase, string][] = review
    ? [
        ['test', 'Refresh'],
        ['passed', 'Banked'],
      ]
    : [
        ['learn', 'Learn these'],
        ['test', 'Test'],
        ['passed', 'Unlock next'],
      ];
  const at = steps.findIndex(([p]) => p === phase);
  return (
    <ol className="flex items-center justify-center gap-1.5 text-[11px] font-medium sm:text-xs" aria-label="Steps">
      {steps.map(([p, label], i) => (
        <li key={p} className="flex items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden className="text-muted">
              →
            </span>
          )}
          <span
            aria-current={i === at ? 'step' : undefined}
            className={`rounded-full border px-2.5 py-1 ${
              i === at ? 'border-accent/60 bg-accent/15 text-ink' : i < at ? 'border-emerald/40 text-emerald' : 'border-line text-muted'
            }`}
          >
            {i < at ? '✓ ' : ''}
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Run({ index, session, onAgain }: { index: VocabIndex; session: Session; onAgain: () => void }) {
  const t = TRACKS[session.track];
  const review = session.mode === 'review';
  const nothing = session.fresh.length === 0 && session.refresh.length === 0;
  const [phase, setPhase] = useState<Phase>(review ? 'test' : 'learn');
  const [details, setDetails] = useState<Map<string, Detail> | null>(null);
  const [missed] = useState(() => new Set<string>());
  const navigate = useNavigate();

  useEffect(() => {
    let live = true;
    loadDetails(index, [...session.fresh, ...session.refresh])
      .then((d) => live && setDetails(d))
      .catch(() => live && setDetails(new Map()));
    return () => {
      live = false;
    };
  }, [index, session]);

  const heading = review
    ? `Review · ${t.label.toLowerCase()}`
    : `${t.label} · batch ${session.batch + 1} of ${trackState(index, session.track).batches}`;

  return (
    <div className="mx-auto flex max-w-reading flex-col gap-5 sm:gap-6">
      <div className="title-bloom flex flex-col items-center gap-2 pt-4 text-center sm:pt-6">
        <Link to="/learn" className="tap inline-flex items-center text-xs text-muted hover:text-ink">
          ← Learn
        </Link>
        <h1 className="font-display text-[1.5rem] font-semibold leading-tight tracking-tight sm:text-[1.8rem]">{heading}</h1>
        {!nothing && <Stepper phase={phase} review={review} />}
      </div>

      {nothing ? (
        <div className="flex flex-col items-center gap-3 card p-8 text-center">
          <p className="font-display text-lg font-semibold">
            {review ? `No ${t.many} are due for review right now.` : `Every ${t.one} in this track is learned.`}
          </p>
          <Link to="/learn" className="btn btn-primary">
            Back to Learn
          </Link>
        </div>
      ) : phase === 'learn' ? (
        <LearnPhase index={index} session={session} onTest={() => setPhase('test')} />
      ) : phase === 'test' ? (
        details === null ? (
          <div className="h-64 skeleton card" />
        ) : (
          <TestPhase
            index={index}
            session={session}
            details={details}
            missed={missed}
            onPassed={() => {
              bankSession(session, missed);
              setPhase('passed');
            }}
          />
        )
      ) : (
        <Passed
          index={index}
          session={session}
          missed={missed}
          onNext={onAgain}
          onLearn={() => navigate('/learn')}
        />
      )}
    </div>
  );
}

/* ------------------------------- learn phase -------------------------------- */

function TeachingCard({ index, item, detail }: { index: VocabIndex; item: LearnItem; detail: Detail | null }) {
  return item.track === 'roots' ? <RootCard index={index} root={item.root} /> : <WordCard l={item.lemma} detail={detail} />;
}

function LearnPhase({ index, session, onTest }: { index: VocabIndex; session: Session; onTest: () => void }) {
  const items = session.fresh;
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [seen, setSeen] = useState(0);
  const item = items[i];
  const detail = useDetail(item && item.track !== 'roots' ? item.lemma : null, index.chunk);
  const t = TRACKS[session.track];

  function go(to: number) {
    setI(to);
    setShown(to < seen);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  if (!item) {
    // Every item of this batch is already banked: only refreshers are left.
    return (
      <div className="flex flex-col items-center gap-3 card p-8 text-center">
        <p className="text-sm text-muted">Nothing new in this batch; {session.refresh.length} refreshers are due.</p>
        <button onClick={onTest} className="btn btn-primary">
          Start the test →
        </button>
      </div>
    );
  }

  const front = item.track === 'roots' ? item.root.split('').join(' ') : item.lemma.lemma;
  const last = i === items.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="tnum">
          New {t.one} {i + 1} of {items.length}
        </span>
        {session.refresh.length > 0 && (
          <span className="tnum">
            + {session.refresh.length} {session.refresh.length === 1 ? 'refresher' : 'refreshers'} in the test
          </span>
        )}
      </div>
      <div className="flex gap-1" aria-hidden>
        {items.map((_, k) => (
          <span key={k} className={`h-1 flex-1 rounded-full ${k < i || (k === i && shown) ? 'bg-accent' : 'bg-surface-2'}`} />
        ))}
      </div>

      <article className="card-raised p-5 sm:p-6">
        {!shown ? (
          <div className="flex flex-col items-center gap-4">
            <CardFront
              arabic={front}
              hint={item.track === 'roots' ? 'A root. What sense do its words share?' : 'Say what you know of it, then turn the card.'}
            />
            <button
              onClick={() => {
                setShown(true);
                setSeen((s) => Math.max(s, i + 1));
              }}
              className="btn btn-secondary btn-lg"
            >
              Turn the card
            </button>
          </div>
        ) : (
          <TeachingCard index={index} item={item} detail={detail} />
        )}
      </article>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => go(i - 1)} disabled={i === 0} className="btn btn-secondary disabled:opacity-40">
          ← Back
        </button>
        {last ? (
          <button onClick={onTest} disabled={!shown} className="btn btn-primary disabled:opacity-40">
            Start the test →
          </button>
        ) : (
          <button onClick={() => go(i + 1)} disabled={!shown} className="btn btn-primary disabled:opacity-40">
            Next →
          </button>
        )}
      </div>
      <p className="text-center text-xs text-muted text-pretty">
        Turn each card and read it through. The test then asks about every {t.one} in this batch; the next batch opens when
        you have answered each one correctly.
      </p>
    </div>
  );
}

/* -------------------------------- test phase -------------------------------- */

interface Slot {
  item: LearnItem;
  q: Question;
  refresher: boolean;
}

function TestPhase({
  index,
  session,
  details,
  missed,
  onPassed,
}: {
  index: VocabIndex;
  session: Session;
  details: Map<string, Detail>;
  missed: Set<string>;
  onPassed: () => void;
}) {
  const fresh = new Set(session.fresh.map((x) => x.key));
  const [queue, setQueue] = useState<Slot[]>(() => {
    // New items and refreshers mixed, refreshers spread through.
    const all = [...session.fresh, ...session.refresh];
    const shuffled = all.map((it) => ({ it, r: Math.random() })).sort((a, b) => a.r - b.r);
    return shuffled.map(({ it }) => ({ item: it, q: makeQuestion(index, it, details.get(it.key)), refresher: !fresh.has(it.key) }));
  });
  const [asked, setAsked] = useState<Record<string, string[]>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [passedKeys, setPassedKeys] = useState<Set<string>>(() => new Set());
  const total = session.fresh.length + session.refresh.length;
  const slot = queue[0];
  if (!slot) return null;
  const { q } = slot;
  const right = picked !== null && picked === q.answer;

  function pick(opt: string) {
    if (picked) return;
    setPicked(opt);
    if (opt !== q.answer) missed.add(slot.item.key);
  }
  function next() {
    const key = slot.item.key;
    const kinds = [...(asked[key] ?? []), q.kind];
    setAsked((a) => ({ ...a, [key]: kinds }));
    setPicked(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (right) {
      setPassedKeys((s) => new Set(s).add(key));
      if (queue.length === 1) {
        onPassed();
        return;
      }
      setQueue((qq) => qq.slice(1));
    } else {
      // Re-shown above; asked again (another way, where possible) after the rest.
      setQueue((qq) => [...qq.slice(1), { ...slot, q: makeQuestion(index, slot.item, details.get(key), kinds) }]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="tnum">
          {passedKeys.size} of {total} answered correctly
        </span>
        <span>{slot.refresher ? 'Refresher' : missed.has(slot.item.key) ? 'Asked again' : 'New'}</span>
      </div>
      <div className="flex gap-1" aria-hidden>
        {[...session.fresh, ...session.refresh].map((it) => (
          <span
            key={it.key}
            className={`h-1 flex-1 rounded-full ${passedKeys.has(it.key) ? 'bg-emerald' : missed.has(it.key) ? 'bg-[var(--role-negation)] opacity-60' : 'bg-surface-2'}`}
          />
        ))}
      </div>

      <div className="card-raised flex flex-col gap-3 p-5 text-center sm:p-6">
        {q.cue &&
          (q.cueArabic ? (
            <p lang="ar" className="ar text-[3rem] leading-[1.9]">
              {q.cue}
            </p>
          ) : (
            <p className="font-display text-[1.6rem] font-semibold leading-tight">{q.cue}</p>
          ))}
        {q.example && (
          <div className="text-left">
            <ExampleVerse ex={q.example} compact hideGloss={!picked} hideTranslation={!picked && q.kind !== 'use'} />
          </div>
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
            else cls = 'border-line bg-surface opacity-60';
          }
          return (
            <button
              key={opt}
              onClick={() => pick(opt)}
              disabled={!!picked}
              className={`min-h-[48px] rounded-xl border px-4 py-2.5 text-center font-medium transition-colors ${cls}`}
              style={picked && isPicked && !isAnswer ? { borderColor: 'var(--role-negation)', color: 'var(--role-negation)' } : undefined}
            >
              <span lang={q.optionsArabic ? 'ar' : undefined} className={q.optionsArabic ? 'ar-naskh text-2xl leading-[1.7]' : 'text-sm'}>
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="flex flex-col gap-4">
          <p className="text-center text-sm font-semibold" style={{ color: right ? 'rgb(var(--emerald))' : 'var(--role-negation)' }}>
            {right ? 'Right.' : `Not this time — read the card again. It will be asked again before ${session.mode === 'review' ? 'this review' : 'the batch'} counts.`}
          </p>
          {!right && (
            <article className="card-raised p-5 sm:p-6">
              <TeachingCard index={index} item={slot.item} detail={details.get(slot.item.key) ?? null} />
            </article>
          )}
          <button onClick={next} className="btn btn-primary self-center">
            {right ? (queue.length > 1 ? 'Next →' : 'Finish') : 'Ask me again later →'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- passed ---------------------------------- */

function Passed({
  index,
  session,
  missed,
  onNext,
  onLearn,
}: {
  index: VocabIndex;
  session: Session;
  missed: Set<string>;
  onNext: () => void;
  onLearn: () => void;
}) {
  const t = TRACKS[session.track];
  const st = trackState(index, session.track);
  const review = session.mode === 'review';
  const label = (i: LearnItem) => (i.track === 'roots' ? i.root.split('').join(' ') : i.lemma.lemma);
  return (
    <div className="flex flex-col items-center gap-4 card-raised p-6 text-center sm:p-8">
      <p className="font-display text-[1.6rem] font-semibold text-accent">{review ? 'Refreshed.' : 'Batch passed.'}</p>
      <p className="max-w-sm text-sm text-muted text-pretty">
        {review
          ? `${session.refresh.length} ${session.refresh.length === 1 ? t.one : t.many} refreshed. Right first time moves an item to a longer gap; a miss brings it back sooner.`
          : `${session.fresh.length} ${session.fresh.length === 1 ? t.one : t.many} banked${
              session.refresh.length ? `, ${session.refresh.length} refreshed` : ''
            }. They will come back as refreshers when they are due.`}
        {missed.size > 0 && ` ${missed.size} needed a second go and will return sooner.`}
      </p>
      {!review && (
        <ul className="flex flex-wrap justify-center gap-1.5">
          {session.fresh.map((i) => (
            <li key={i.key} lang="ar" className="ar-naskh rounded-full border border-emerald/40 bg-emerald/10 px-3 py-0.5 text-[1.15rem]">
              {label(i)}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap justify-center gap-2.5">
        {review && st.due.length > 0 && (
          <button onClick={onNext} className="btn btn-primary">
            Review {Math.min(st.due.length, 12)} more
          </button>
        )}
        {!review && st.current < st.batches && (
          <button onClick={onNext} className="btn btn-primary">
            Unlock batch {st.current + 1} →
          </button>
        )}
        <button onClick={onLearn} className="btn btn-secondary">
          Back to Learn
        </button>
      </div>
    </div>
  );
}
