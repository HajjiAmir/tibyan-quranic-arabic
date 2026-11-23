// Self-directed review (brief 18): the learner revisits batches he has already
// passed, on demand, separate from the automatic refreshers.
//
// Built on the existing stores, which this never resets:
// - the Leitner boxes (tibyan.vocab.v1, tibyan.roots.v1) say what is learned
//   (any box), secure (box 4+) and due;
// - a small answer history (tibyan.history.v1) adds how often each item was
//   missed or answered right, and when it was last seen, so weak items can be
//   found. It starts empty for progress made before it existed; until then an
//   item back in box 1 counts as weak.
// - tibyan.batchReview.v1 keeps when each batch was last reviewed or retested.
//
// A voluntary retest grades each answer into the Leitner box (a miss goes back
// to box 1 and returns sooner; a right answer moves it up toward secure), but
// never removes an item from the store, so no passed batch can lock again.

import { DAY, INTERVALS, KNOWN_BOX, type Box } from './practice';
import { BATCH, TRACKS, storeOf, trackItems, type LearnItem, type TrackId } from './learn';
import type { VocabIndex } from './vocab';

/* --------------------------------- storage --------------------------------- */

interface History {
  /** Answers right and missed, and when last answered (epoch ms). */
  r: number;
  m: number;
  t: number;
}

const HISTORY_KEY = 'tibyan.history.v1';
const BATCH_KEY = 'tibyan.batchReview.v1';

function readJson<T>(key: string): T {
  try {
    const raw = localStorage.getItem(key);
    return (raw ? JSON.parse(raw) : {}) as T;
  } catch {
    return {} as T;
  }
}
function writeJson(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable: history is just not kept */
  }
}

const hKey = (t: TrackId, key: string) => `${t}|${key}`;
const bKey = (t: TrackId, b: number) => `${t}|${b}`;

export const readHistory = () => readJson<Record<string, History>>(HISTORY_KEY);

/** Note one answer (any test: batch, refresher or retest). */
export function recordAnswer(t: TrackId, key: string, good: boolean, now = Date.now()) {
  const h = readHistory();
  const cur = h[hKey(t, key)] ?? { r: 0, m: 0, t: 0 };
  h[hKey(t, key)] = { r: cur.r + (good ? 1 : 0), m: cur.m + (good ? 0 : 1), t: now };
  writeJson(HISTORY_KEY, h);
}

export function markBatchesReviewed(t: TrackId, batches: number[], now = Date.now()) {
  if (!batches.length) return;
  const s = readJson<Record<string, number>>(BATCH_KEY);
  for (const b of batches) s[bKey(t, b)] = now;
  writeJson(BATCH_KEY, s);
}

/** When a Leitner box was last set: its due date minus that box's gap. */
const setAt = (b: Box) => b.due - INTERVALS[b.box] * DAY;

/* --------------------------------- library --------------------------------- */

export interface ItemInfo {
  item: LearnItem;
  batch: number;
  box: number;
  due: boolean;
  missed: number;
  right: number;
  last: number;
}

export interface BatchInfo {
  track: TrackId;
  /** 0-based. */
  batch: number;
  items: ItemInfo[];
  learned: number;
  secure: number;
  due: number;
  weak: number;
  /** Last reviewed, retested or answered (epoch ms), 0 when unknown. */
  last: number;
}

export const isWeak = (i: ItemInfo) => i.box <= 1 || (i.missed > 0 && i.missed >= i.right);
/** Higher is weaker: misses count most, then a low box. */
export const weakness = (i: ItemInfo) => i.missed * 2 - i.right * 0.5 + (5 - i.box);

/** Every batch of a track whose items are all learned, oldest first. */
export function passedBatches(index: VocabIndex, t: TrackId, now = Date.now()): BatchInfo[] {
  const items = trackItems(index, t);
  const store = storeOf(t).read();
  const hist = readHistory();
  const reviewed = readJson<Record<string, number>>(BATCH_KEY);
  const out: BatchInfo[] = [];
  for (let b = 0; b * BATCH < items.length; b++) {
    const slice = items.slice(b * BATCH, (b + 1) * BATCH);
    if (!slice.every((i) => store[i.key])) continue;
    const infos = slice.map((item): ItemInfo => {
      const box = store[item.key];
      const h = hist[hKey(t, item.key)];
      return {
        item,
        batch: b,
        box: box.box,
        due: box.due <= now,
        missed: h?.m ?? 0,
        right: h?.r ?? 0,
        last: Math.max(h?.t ?? 0, setAt(box)),
      };
    });
    out.push({
      track: t,
      batch: b,
      items: infos,
      learned: infos.length,
      secure: infos.filter((i) => i.box >= KNOWN_BOX).length,
      due: infos.filter((i) => i.due).length,
      weak: infos.filter(isWeak).length,
      last: Math.max(reviewed[bKey(t, b)] ?? 0, ...infos.map((i) => i.last)),
    });
  }
  return out;
}

/* ---------------------------------- scopes --------------------------------- */

/**
 * What a review covers, as it appears in the URL:
 * `b3` one batch (0-based), `r0-5` a range of batches, `all` everything learned,
 * `due` the items due now, `weak` the weakest items.
 */
export type Scope = { kind: 'batch'; b: number } | { kind: 'range'; from: number; to: number } | { kind: 'all' } | { kind: 'due' } | { kind: 'weak' };

export function parseScope(s: string | null): Scope | null {
  if (!s) return null;
  if (s === 'all' || s === 'due' || s === 'weak') return { kind: s };
  let m = /^b(\d+)$/.exec(s);
  if (m) return { kind: 'batch', b: +m[1] };
  m = /^r(\d+)-(\d+)$/.exec(s);
  if (m) return { kind: 'range', from: Math.min(+m[1], +m[2]), to: Math.max(+m[1], +m[2]) };
  return null;
}

export function scopeParam(s: Scope): string {
  switch (s.kind) {
    case 'batch':
      return `b${s.b}`;
    case 'range':
      return `r${s.from}-${s.to}`;
    default:
      return s.kind;
  }
}

export function scopeTitle(s: Scope, t: TrackId): string {
  const many = TRACKS[t].many;
  switch (s.kind) {
    case 'batch':
      return `Batch ${s.b + 1}`;
    case 'range':
      return `Batches ${s.from + 1}–${s.to + 1}`;
    case 'all':
      return `All learned ${many}`;
    case 'due':
      return `${many[0].toUpperCase()}${many.slice(1)} due now`;
    case 'weak':
      return `Weakest ${many}`;
  }
}

/** The most items one retest round asks; bigger scopes go round by round. */
export const RETEST_ROUND = 20;
export const WEAK_LIMIT = 40;

/** Every learned item a scope covers, in the order a review shows them. */
export function scopeItems(index: VocabIndex, t: TrackId, s: Scope): ItemInfo[] {
  const lib = passedBatches(index, t);
  const all = lib.flatMap((b) => b.items);
  switch (s.kind) {
    case 'batch':
      return lib.find((b) => b.batch === s.b)?.items ?? [];
    case 'range':
      return all.filter((i) => i.batch >= s.from && i.batch <= s.to);
    case 'all':
      return all;
    case 'due':
      return all.filter((i) => i.due).sort((a, b) => a.box - b.box || a.last - b.last);
    case 'weak':
      return all
        .filter(isWeak)
        .sort((a, b) => weakness(b) - weakness(a))
        .slice(0, WEAK_LIMIT);
  }
}

/**
 * One retest round from a scope: all of it when small; otherwise the items most
 * in need first (weak, then due, then longest unseen), so each round is useful.
 */
export function retestRound(items: ItemInfo[], skip = new Set<string>()): ItemInfo[] {
  const left = items.filter((i) => !skip.has(i.item.key));
  if (left.length <= RETEST_ROUND) return left;
  return [...left]
    .sort((a, b) => Number(isWeak(b)) - Number(isWeak(a)) || Number(b.due) - Number(a.due) || a.last - b.last)
    .slice(0, RETEST_ROUND);
}

/**
 * Grade a voluntary retest into the Leitner store and the history. Right moves an
 * item up a box (toward secure); a miss puts it in box 1, so it comes back within
 * the hour. Nothing is removed, so every passed batch stays open.
 */
export function gradeRetest(t: TrackId, results: { key: string; good: boolean }[], batches: number[]) {
  const store = storeOf(t);
  for (const r of results) {
    store.rate(r.key, r.good);
    recordAnswer(t, r.key, r.good);
  }
  markBatchesReviewed(t, batches);
}

/** "today", "yesterday", "3 days ago", "12 Nov". */
export function ago(ms: number, now = Date.now()): string {
  if (!ms) return 'not yet';
  const d0 = new Date(now);
  d0.setHours(0, 0, 0, 0);
  const days = Math.round((d0.getTime() - new Date(ms).setHours(0, 0, 0, 0)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
