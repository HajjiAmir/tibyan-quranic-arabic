import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TRACKS, type TrackId } from '../lib/learn';
import { ago, isWeak, passedBatches, scopeItems, scopeParam, type BatchInfo, type ItemInfo, type Scope } from '../lib/review';
import type { VocabIndex } from '../lib/vocab';
import { BoxMarks, MasteryRing, itemLabel } from './ReviewKit';

// The review library (brief 18): every batch already passed, in each track, to
// revisit on demand. Separate from the automatic refreshers: here the learner
// decides what to go back to.

const TRACK_KEY = 'tibyan.review.track.v1';
const VIEW_KEY = 'tibyan.review.view.v1';
const PAGE = 10;

type View = 'batches' | 'due' | 'weak';
type Filter = 'all' | 'due' | 'weak' | 'secure';

const read = <T extends string>(key: string, ok: readonly T[], dflt: T): T => {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && ok.includes(v) ? v : dflt;
  } catch {
    return dflt;
  }
};
const keep = (key: string, v: string) => {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* not kept */
  }
};

export const reviewPath = (t: TrackId, s: Scope, mode: 'cards' | 'test') => `/learn/review/${t}?scope=${scopeParam(s)}&do=${mode}`;

export default function ReviewLibrary({ index, onLearn }: { index: VocabIndex; onLearn: () => void }) {
  const [track, setTrack] = useState<TrackId>(() => read(TRACK_KEY, ['words', 'roots', 'attached'] as const, 'words'));
  const [view, setView] = useState<View>(() => read(VIEW_KEY, ['batches', 'due', 'weak'] as const, 'batches'));
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(PAGE);
  useEffect(() => keep(TRACK_KEY, track), [track]);
  useEffect(() => keep(VIEW_KEY, view), [view]);
  useEffect(() => setShown(PAGE), [track, view, filter]);

  const libs = useMemo(
    () => ({ words: passedBatches(index, 'words'), roots: passedBatches(index, 'roots'), attached: passedBatches(index, 'attached') }),
    [index],
  );
  const lib = libs[track];
  const t = TRACKS[track];
  const all = lib.flatMap((b) => b.items);
  const learned = all.length;
  const secure = all.filter((i) => i.box >= 4).length;
  const due = useMemo(() => scopeItems(index, track, { kind: 'due' }), [index, track]);
  const weak = useMemo(() => scopeItems(index, track, { kind: 'weak' }), [index, track]);

  return (
    <section className="flex flex-col gap-5" aria-labelledby="review-h">
      <div className="flex flex-col gap-1">
        <h2 id="review-h" className="font-display text-xl font-semibold tracking-tight">
          Your review library
        </h2>
        <p className="text-xs leading-relaxed text-muted text-pretty">
          Everything you have passed, to revisit whenever you choose. A retest is practice: it updates your mastery, and
          never locks a batch you have passed.
        </p>
      </div>

      <div className="seg grid grid-cols-3 text-[13px]" role="tablist" aria-label="Track">
        {(Object.keys(TRACKS) as TrackId[]).map((k) => (
          <button key={k} role="tab" aria-selected={track === k} aria-pressed={track === k} onClick={() => setTrack(k)} className="flex flex-col items-center leading-tight">
            <span>{TRACKS[k].label}</span>
            <span className="tnum text-[10px] font-medium text-muted">
              {libs[k].length} {libs[k].length === 1 ? 'batch' : 'batches'}
            </span>
          </button>
        ))}
      </div>

      {lib.length === 0 ? (
        <div className="flex flex-col items-center gap-3 card p-8 text-center">
          <p className="font-display text-lg font-semibold">No {t.one} batches passed yet</p>
          <p className="max-w-xs text-sm text-muted text-pretty">Pass your first batch of {t.many} and it will wait for you here, ready to review or retest.</p>
          <button onClick={onLearn} className="btn btn-primary">
            Learn new {t.many} →
          </button>
        </div>
      ) : (
        <>
          <div className="card-raised flex items-center gap-4 p-4 sm:p-5">
            <MasteryRing value={secure} total={learned} size={64} label={`${secure} of ${learned} secure`} center={`${Math.round((secure / learned) * 100)}%`} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="font-display text-[1.1rem] font-semibold leading-snug">
                {learned.toLocaleString()} {learned === 1 ? t.one : t.many} learned
              </p>
              <p className="tnum text-xs text-muted">
                {secure.toLocaleString()} secure · {due.length} due now · {weak.length} weak
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link to={reviewPath(track, { kind: 'all' }, 'cards')} className="btn btn-secondary justify-center">
              Review all learned
            </Link>
            <Link to={reviewPath(track, { kind: 'all' }, 'test')} className="btn btn-primary justify-center">
              Retest everything
            </Link>
          </div>

          <div className="seg grid grid-cols-3 text-[13px]" role="tablist" aria-label="View">
            {(
              [
                ['batches', 'Batches', lib.length],
                ['due', 'Due now', due.length],
                ['weak', 'Weak', weak.length],
              ] as [View, string, number][]
            ).map(([v, label, n]) => (
              <button key={v} role="tab" aria-selected={view === v} aria-pressed={view === v} onClick={() => setView(v)}>
                {label} <span className="tnum text-muted">{n}</span>
              </button>
            ))}
          </div>

          {view === 'batches' ? (
            <Batches index={index} lib={lib} track={track} filter={filter} setFilter={setFilter} shown={shown} more={() => setShown((n) => n + PAGE)} />
          ) : view === 'due' ? (
            <ItemList
              index={index}
              track={track}
              items={due}
              scope={{ kind: 'due' }}
              empty={`Nothing is due. Your ${t.many} come back on their own as their gaps run out.`}
              note="Due items, lowest box first. Retesting them now counts as their refresher."
              action={`Retest ${Math.min(due.length, 20)} due`}
            />
          ) : (
            <ItemList
              index={index}
              track={track}
              items={weak}
              scope={{ kind: 'weak' }}
              empty={`No weak ${t.many}: nothing has been missed more often than answered right.`}
              note="The ones you have missed most, then the lowest boxes. Misses are counted from this update on; for earlier progress, an item back in box 1 counts as weak."
              action={`Drill the ${Math.min(weak.length, 20)} weakest`}
              weak
            />
          )}
        </>
      )}
    </section>
  );
}

/* --------------------------------- batches --------------------------------- */

function Batches({
  index,
  lib,
  track,
  filter,
  setFilter,
  shown,
  more,
}: {
  index: VocabIndex;
  lib: BatchInfo[];
  track: TrackId;
  filter: Filter;
  setFilter: (f: Filter) => void;
  shown: number;
  more: () => void;
}) {
  const list = [...lib]
    .reverse()
    .filter((b) => (filter === 'due' ? b.due > 0 : filter === 'weak' ? b.weak > 0 : filter === 'secure' ? b.secure === b.learned : true));
  const first = lib[0].batch;
  const last = lib[lib.length - 1].batch;
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(last);
  useEffect(() => {
    setFrom(first);
    setTo(last);
  }, [first, last]);
  const options = lib.map((b) => b.batch);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show batches">
        {(
          [
            ['all', 'All'],
            ['due', 'With due'],
            ['weak', 'With weak'],
            ['secure', 'All secure'],
          ] as [Filter, string][]
        ).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`tap-y inline-flex items-center rounded-full border px-3.5 text-[13px] transition-colors ${
              filter === f ? 'border-accent/60 bg-accent/15 text-ink' : 'border-line text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {lib.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-[13px]">
          <span className="text-muted">Batches</span>
          <BatchSelect value={from} options={options} onChange={setFrom} label="From batch" />
          <span className="text-muted">to</span>
          <BatchSelect value={to} options={options} onChange={setTo} label="To batch" />
          <span className="ml-auto flex gap-1.5">
            <Link to={reviewPath(track, { kind: 'range', from: Math.min(from, to), to: Math.max(from, to) }, 'cards')} className="btn btn-ghost btn-sm">
              Review
            </Link>
            <Link to={reviewPath(track, { kind: 'range', from: Math.min(from, to), to: Math.max(from, to) }, 'test')} className="btn btn-secondary btn-sm">
              Retest
            </Link>
          </span>
        </div>
      )}

      <p className="flex items-center gap-3 text-[11px] text-muted" aria-hidden>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgb(var(--emerald))' }} />secure</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgb(var(--accent) / 0.45)' }} />learning</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--role-negation)' }} />weak</span>
        <span className="ml-auto">Newest first</span>
      </p>

      {list.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">No batches match this filter.</p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {list.slice(0, shown).map((b) => (
            <BatchCard key={b.batch} index={index} b={b} track={track} />
          ))}
        </ol>
      )}
      {shown < list.length && (
        <button onClick={more} className="btn btn-secondary self-center">
          Show {Math.min(PAGE, list.length - shown)} more
        </button>
      )}
    </div>
  );
}

function BatchSelect({ value, options, onChange, label }: { value: number; options: number[]; onChange: (n: number) => void; label: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(+e.target.value)}
      aria-label={label}
      className="tnum h-11 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink sm:h-9"
    >
      {options.map((b) => (
        <option key={b} value={b}>
          {b + 1}
        </option>
      ))}
    </select>
  );
}

function BatchCard({ index, b, track }: { index: VocabIndex; b: BatchInfo; track: TrackId }) {
  const scope: Scope = { kind: 'batch', b: b.batch };
  return (
    <li className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3.5">
        <MasteryRing value={b.secure} total={b.learned} size={48} label={`${b.secure} of ${b.learned} secure`} center={`${b.secure}/${b.learned}`} />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-[1.05rem] font-semibold">Batch {b.batch + 1}</span>
            {b.due > 0 && <span className="tnum text-[11px] font-medium text-accent">{b.due} due</span>}
            {b.weak > 0 && (
              <span className="tnum text-[11px] font-medium" style={{ color: 'var(--role-negation)' }}>
                {b.weak} weak
              </span>
            )}
          </p>
          <p className="tnum text-[11.5px] text-muted">
            {b.learned} learned · {b.secure} secure · reviewed {ago(b.last)}
          </p>
        </div>
      </div>
      <ul lang="ar" dir="rtl" className="ar-naskh flex flex-wrap gap-x-3.5 gap-y-0.5 text-[1.2rem] leading-[1.8]">
        {b.items.map((i) => (
          <li key={i.item.key} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: isWeak(i) ? 'var(--role-negation)' : i.box >= 4 ? 'rgb(var(--emerald))' : 'rgb(var(--accent) / 0.45)' }}
            />
            {itemLabel(index, i.item).ar}
            <span className="sr-only">{isWeak(i) ? ' (weak)' : i.box >= 4 ? ' (secure)' : ''}</span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <Link to={reviewPath(track, scope, 'cards')} className="btn btn-secondary justify-center">
          Review
        </Link>
        <Link to={reviewPath(track, scope, 'test')} className="btn btn-secondary justify-center">
          Retest
        </Link>
      </div>
    </li>
  );
}

/* --------------------------------- item lists -------------------------------- */

function ItemList({
  index,
  track,
  items,
  scope,
  empty,
  note,
  action,
  weak = false,
}: {
  index: VocabIndex;
  track: TrackId;
  items: ItemInfo[];
  scope: Scope;
  empty: string;
  note: string;
  action: string;
  weak?: boolean;
}) {
  const [shown, setShown] = useState(12);
  if (items.length === 0) return <p className="card p-6 text-center text-sm text-muted text-pretty">{empty}</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Link to={reviewPath(track, scope, 'cards')} className="btn btn-secondary justify-center">
          Review cards
        </Link>
        <Link to={reviewPath(track, scope, 'test')} className="btn btn-primary justify-center">
          {action}
        </Link>
      </div>
      <p className="text-[11.5px] leading-relaxed text-muted text-pretty">{note}</p>
      <ol className="flex flex-col overflow-hidden card">
        {items.slice(0, shown).map((i) => {
          const { ar, en } = itemLabel(index, i.item);
          return (
            <li key={i.item.key} className="flex items-center gap-3 border-b border-line/60 px-3.5 py-2.5 last:border-b-0">
              <span lang="ar" className="ar-naskh w-[5.5rem] shrink-0 text-right text-[1.35rem] leading-[1.6]">
                {ar}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[0.92rem] font-medium">{en}</span>
                <span className="tnum truncate text-[11px] text-muted">
                  Batch {i.batch + 1}
                  {weak && (i.missed > 0 ? ` · missed ${i.missed}× · right ${i.right}×` : ' · back in box 1')}
                  {!weak && ` · last seen ${ago(i.last)}`}
                </span>
              </span>
              <BoxMarks box={i.box} />
            </li>
          );
        })}
      </ol>
      {shown < items.length && (
        <button onClick={() => setShown((n) => n + 12)} className="btn btn-secondary self-center">
          Show more
        </button>
      )}
    </div>
  );
}

