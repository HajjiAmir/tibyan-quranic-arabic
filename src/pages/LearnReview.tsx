import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CardFront, useDetail } from '../components/TeachCard';
import { MasteryRing, itemLabel } from '../components/ReviewKit';
import { QuestionCard, TeachingCard } from './LearnStudy';
import { TRACKS, loadDetails, makeQuestion, type LearnItem, type Question, type TrackId } from '../lib/learn';
import {
  gradeRetest,
  markBatchesReviewed,
  parseScope,
  retestRound,
  scopeItems,
  scopeParam,
  scopeTitle,
  type ItemInfo,
  type Scope,
} from '../lib/review';
import { loadVocab, type Detail, type VocabIndex } from '../lib/vocab';

// On-demand review of passed batches (brief 18), at #/learn/review/:track?scope=…&do=cards|test.
// "cards": go through the teaching cards again, at your own pace, nothing graded.
// "test": a scored retest, each item asked once; results go into the Leitner store
// (see lib/review gradeRetest), and the results screen offers to drill the misses.

const isTrack = (t: string | undefined): t is TrackId => t === 'words' || t === 'roots' || t === 'attached';
const libraryPath = '/learn?mode=review';

export default function LearnReview() {
  const { track } = useParams();
  const [params] = useSearchParams();
  const scope = parseScope(params.get('scope'));
  const mode = params.get('do') === 'test' ? 'test' : 'cards';
  const [index, setIndex] = useState<VocabIndex | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadVocab().then(setIndex).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [track, mode, params]);

  // Taken once per visit, so grading during the session does not reshuffle it.
  const items = useMemo(() => (index && isTrack(track) && scope ? scopeItems(index, track, scope) : null), [index, track, params]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isTrack(track) || !scope)
    return (
      <p className="pt-10 text-center text-sm text-muted">
        Nothing to review here. <Link to={libraryPath} className="text-accent underline">Back to the review library</Link>
      </p>
    );
  if (err) return <p style={{ color: 'var(--role-negation)' }}>Could not load the vocabulary. {err}</p>;
  if (!index || !items) return <div className="mx-auto h-80 max-w-reading skeleton card" />;

  const t = TRACKS[track];
  return (
    <div className="mx-auto flex max-w-reading flex-col gap-5 sm:gap-6">
      <div className="title-bloom flex flex-col items-center gap-2 pt-4 text-center sm:pt-6">
        <Link to={libraryPath} className="tap inline-flex items-center text-xs text-muted hover:text-ink">
          ← Review library
        </Link>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          {mode === 'test' ? 'Retest' : 'Review'} · {t.label}
        </span>
        <h1 className="font-display text-[1.5rem] font-semibold leading-tight tracking-tight sm:text-[1.8rem]">{scopeTitle(scope, track)}</h1>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 card p-8 text-center">
          <p className="font-display text-lg font-semibold">Nothing in this selection right now.</p>
          <Link to={libraryPath} className="btn btn-primary">
            Back to the library
          </Link>
        </div>
      ) : mode === 'cards' ? (
        <Cards key={params.toString()} index={index} track={track} scope={scope} items={items} />
      ) : (
        <Retest key={params.toString()} index={index} track={track} items={items} />
      )}
    </div>
  );
}

const batchesOf = (items: ItemInfo[]) => [...new Set(items.map((i) => i.batch))];

/* ---------------------------------- cards ---------------------------------- */

function Cards({ index, track, scope, items }: { index: VocabIndex; track: TrackId; scope: Scope; items: ItemInfo[] }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(false);
  const info = items[i];
  const item = info.item;
  const detail = useDetail(item.track !== 'roots' ? item.lemma : null, index.chunk);
  const t = TRACKS[track];

  function go(to: number) {
    setI(to);
    setShown(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function finish() {
    markBatchesReviewed(track, batchesOf(items.slice(0, i + 1)));
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 card-raised p-6 text-center sm:p-8">
        <p className="font-display text-[1.6rem] font-semibold text-accent">Reviewed.</p>
        <p className="max-w-sm text-sm text-muted text-pretty">
          {i + 1} {i === 0 ? t.one : t.many} looked over. Nothing was graded; when you are ready, a retest checks them and
          updates your mastery.
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <Link to={`/learn/review/${track}?scope=${scopeParam(scope)}&do=test`} className="btn btn-primary">
            Retest these →
          </Link>
          <Link to={libraryPath} className="btn btn-secondary">
            Back to the library
          </Link>
        </div>
      </div>
    );
  }

  const front = item.track === 'roots' ? item.root.split('').join(' ') : item.lemma.lemma;
  const last = i === items.length - 1;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="tnum">
          Card {i + 1} of {items.length}
        </span>
        <span className="tnum">Batch {info.batch + 1} · nothing graded</span>
      </div>
      <Progress done={i + (shown ? 1 : 0)} total={items.length} />
      <article className="card-raised p-5 sm:p-6">
        {!shown ? (
          <div className="flex flex-col items-center gap-4">
            <CardFront arabic={front} hint={item.track === 'roots' ? 'What sense do its words share?' : 'Recall what you can, then turn the card.'} />
            <button onClick={() => setShown(true)} className="btn btn-secondary btn-lg">
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
          <button onClick={finish} className="btn btn-primary">
            Done
          </button>
        ) : (
          <button onClick={() => go(i + 1)} className="btn btn-primary">
            Next →
          </button>
        )}
      </div>
      {!last && (
        <button onClick={finish} className="tap self-center text-xs text-muted underline underline-offset-4 hover:text-ink">
          Stop here
        </button>
      )}
      {scope.kind !== 'batch' && <p className="text-center text-[11px] text-muted">Relaxed review: go at your own pace, skip freely.</p>}
    </div>
  );
}

function Progress({ done, total }: { done: number; total: number }) {
  if (total > 24) {
    return (
      <div className="h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(done / total) * 100}%` }} />
      </div>
    );
  }
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: total }, (_, k) => (
        <span key={k} className={`h-1 flex-1 rounded-full ${k < done ? 'bg-accent' : 'bg-surface-2'}`} />
      ))}
    </div>
  );
}

/* ---------------------------------- retest --------------------------------- */

interface Result {
  item: LearnItem;
  batch: number;
  good: boolean;
}

function Retest({ index, track, items }: { index: VocabIndex; track: TrackId; items: ItemInfo[] }) {
  // A round is at most 20 items; bigger selections continue round by round.
  const [round, setRound] = useState<ItemInfo[]>(() => retestRound(items));
  const [asked, setAsked] = useState<Set<string>>(() => new Set());
  const [drill, setDrill] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [n, setN] = useState(0);

  function start(next: ItemInfo[], isDrill: boolean) {
    setRound(next);
    setDrill(isDrill);
    setResults(null);
    setN((x) => x + 1);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  if (results) {
    const missed = results.filter((r) => !r.good);
    const left = items.filter((i) => !asked.has(i.item.key));
    return (
      <Results
        index={index}
        track={track}
        results={results}
        drill={drill}
        left={left.length}
        onDrill={() => start(round.filter((r) => missed.some((m) => m.item.key === r.item.key)), true)}
        onNextRound={() => start(retestRound(items, asked), false)}
        onAgain={() => start(drill ? round : retestRound(items), drill)}
      />
    );
  }
  return (
    <RetestRun
      key={n}
      index={index}
      round={round}
      drill={drill}
      onDone={(res) => {
        gradeRetest(track, res.map((r) => ({ key: r.item.key, good: r.good })), [...new Set(res.map((r) => r.batch))]);
        setAsked((a) => new Set([...a, ...res.map((r) => r.item.key)]));
        setResults(res);
        window.scrollTo({ top: 0, behavior: 'instant' });
      }}
    />
  );
}

function RetestRun({ index, round, drill, onDone }: { index: VocabIndex; round: ItemInfo[]; drill: boolean; onDone: (r: Result[]) => void }) {
  const [details, setDetails] = useState<Map<string, Detail> | null>(null);
  const [qs, setQs] = useState<Question[] | null>(null);
  const [k, setK] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [res, setRes] = useState<Result[]>([]);

  useEffect(() => {
    let live = true;
    const order = [...round].sort(() => Math.random() - 0.5);
    loadDetails(index, order.map((r) => r.item))
      .catch(() => new Map<string, Detail>())
      .then((d) => {
        if (!live) return;
        setDetails(d);
        setQs(order.map((r) => makeQuestion(index, r.item, d.get(r.item.key))));
      });
    return () => {
      live = false;
    };
  }, [index, round]);

  if (!qs || !details) return <div className="h-64 skeleton card" />;
  const q = qs[k];
  const info = round.find((r) => r.item.key === q.item.key)!;
  const right = picked !== null && picked === q.answer;
  const score = res.filter((r) => r.good).length;

  function pick(opt: string) {
    if (picked) return;
    setPicked(opt);
    setRes((r) => [...r, { item: q.item, batch: info.batch, good: opt === q.answer }]);
  }
  function next() {
    setPicked(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (k + 1 >= qs!.length) onDone(res);
    else setK(k + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="tnum">
          Question {k + 1} of {qs.length}
        </span>
        <span className="tnum">
          {drill ? 'Drill · ' : ''}Score {score}
        </span>
      </div>
      <div className="flex gap-1" aria-hidden>
        {qs.map((x, j) => {
          const r = res[j];
          return (
            <span
              key={x.item.key}
              className={`h-1 flex-1 rounded-full ${r ? (r.good ? 'bg-emerald' : 'bg-[var(--role-negation)] opacity-60') : j === k ? 'bg-accent/50' : 'bg-surface-2'}`}
            />
          );
        })}
      </div>

      <QuestionCard q={q} picked={picked} onPick={pick} />

      {picked && (
        <div className="flex flex-col gap-4">
          <p className="text-center text-sm font-semibold" style={{ color: right ? 'rgb(var(--emerald))' : 'var(--role-negation)' }}>
            {right ? 'Right.' : 'Not this time. Here is the card again; this one will come back sooner.'}
          </p>
          {!right && (
            <article className="card-raised p-5 sm:p-6">
              <TeachingCard index={index} item={q.item} detail={details.get(q.item.key) ?? null} />
            </article>
          )}
          <button onClick={next} className="btn btn-primary self-center">
            {k + 1 >= qs.length ? 'See results' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
}

function Results({
  index,
  track,
  results,
  drill,
  left,
  onDrill,
  onNextRound,
  onAgain,
}: {
  index: VocabIndex;
  track: TrackId;
  results: Result[];
  drill: boolean;
  left: number;
  onDrill: () => void;
  onNextRound: () => void;
  onAgain: () => void;
}) {
  const t = TRACKS[track];
  const good = results.filter((r) => r.good).length;
  const missed = results.filter((r) => !r.good);
  const pct = Math.round((good / results.length) * 100);
  const oneBatch = new Set(results.map((r) => r.batch)).size === 1;
  const headline = pct === 100 ? 'Every one right.' : pct >= 80 ? 'Strong work.' : pct >= 50 ? 'Getting there.' : 'Worth another pass.';
  return (
    <div className="flex flex-col gap-4">
      <div className="card-raised flex flex-col items-center gap-4 p-6 text-center sm:p-8">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">{drill ? 'Drill results' : 'Retest results'}</span>
        <MasteryRing value={good} total={results.length} size={112} label={`${good} of ${results.length} right`} center={`${good}/${results.length}`} />
        <div className="flex flex-col gap-1">
          <p className="font-display text-[1.6rem] font-semibold leading-tight text-accent">{headline}</p>
          <p className="tnum text-sm text-muted">
            {pct}% right · {good} {good === 1 ? t.one : t.many} moved toward secure
            {missed.length > 0 && ` · ${missed.length} will come back sooner`}
          </p>
        </div>
        <p className="max-w-sm text-[11.5px] leading-relaxed text-muted text-pretty">
          This was practice: your batches stay open whatever the score.
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {missed.length > 0 && (
            <button onClick={onDrill} className="btn btn-primary btn-lg justify-center">
              Drill the {missed.length} missed →
            </button>
          )}
          {!drill && left > 0 && (
            <button onClick={onNextRound} className={`btn ${missed.length ? 'btn-secondary' : 'btn-primary'} btn-lg justify-center`}>
              Next round · {left} left
            </button>
          )}
          {missed.length === 0 && (drill || left === 0) && (
            <button onClick={onAgain} className="btn btn-secondary btn-lg justify-center">
              Retest again
            </button>
          )}
          <Link to={libraryPath} className="btn btn-ghost btn-lg justify-center">
            Back to the library
          </Link>
        </div>
      </div>

      <ol className="flex flex-col overflow-hidden card" aria-label="Answers">
        {[...missed, ...results.filter((r) => r.good)].map((r) => {
          const { ar, en } = itemLabel(index, r.item);
          return (
            <li key={r.item.key} className="flex items-center gap-3 border-b border-line/60 px-3.5 py-2.5 last:border-b-0">
              <span
                aria-label={r.good ? 'Right' : 'Missed'}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                style={r.good ? { background: 'rgb(var(--emerald) / 0.14)', color: 'rgb(var(--emerald))' } : { background: 'color-mix(in srgb, var(--role-negation) 14%, transparent)', color: 'var(--role-negation)' }}
              >
                {r.good ? '✓' : '✕'}
              </span>
              <span lang="ar" className="ar-naskh w-[5.5rem] shrink-0 text-right text-[1.35rem] leading-[1.6]">
                {ar}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.92rem]">{en}</span>
              {!oneBatch && <span className="tnum shrink-0 text-[11px] text-muted">Batch {r.batch + 1}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
