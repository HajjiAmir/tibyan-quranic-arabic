// Vocabulary mastery: the whole Qur'an's lemmas in frequency order
// (public/data/vocab.json, built by scripts/build-vocab.mjs), studied with the
// same Leitner boxes as surah practice but tracked per lemma, so knowing a
// lemma counts everywhere it occurs.

import type { Role } from '../types';
import { createTrack, KNOWN_BOX } from './practice';

export interface Lemma {
  /** Frequency rank, 1 = most frequent. */
  id: number;
  lemma: string;
  root: string | null;
  role: Role;
  /** Noun, verb, adjective or proper noun (vs function words). */
  content: boolean;
  /** Most common parts of speech with their counts. */
  pos: [string, number][];
  form: string | null;
  /** Dictionary gloss from the Quranic Arabic Corpus, where it has one. */
  meaning: string | null;
  /** The most frequent word-by-word glosses of its occurrences (Quran.com). */
  inContext: string[];
  sample: { arabic: string; description: string };
  count: number;
  refs: string[];
  /**
   * Absent for corpus lemmas. 'pronoun': a separate pronoun (هُوَ، نَحْنُ …);
   * 'initials': Quranic initials (الٓمٓ …); 'prefix' / 'suffix': an attached
   * particle or pronoun, counted per attachment and not part of the word count.
   */
  kind?: 'pronoun' | 'initials' | 'prefix' | 'suffix';
  /** Storage key for entries that are not corpus lemmas (e.g. "pre:و"). */
  key?: string;
  /** Attached forms: each use with its sourced meaning and count. */
  senses?: [string, string | null, number][];
  /** Other spellings of the same entry in the Uthmani text. */
  spellings?: string[];
}

export interface VocabIndex {
  rootChunk?: number;
  totals: {
    words: number;
    withLemma: number;
    noLemma: number;
    lemmas: number;
    roots: number;
    kinds?: Record<string, number>;
    attached?: { prefix: number; suffix: number };
  };
  chunk: number;
  lemmas: Lemma[];
  roots: Record<string, { count: number; lemmas: number[] }>;
}

export interface Example {
  ref: string;
  words: string[];
  hit: number;
  gloss: string | null;
  translation: string;
  /** [start, end) of the studied segment inside the hit word, when it is only part of it. */
  part?: [number, number] | null;
}

/**
 * One use of an entry, with an example of exactly that use (scripts/build-vocab.mjs).
 * Words and prefixes: `label` is the QAC part of speech of that use and `gloss`
 * its commonest English there. Attached pronouns: `form` (reviewed-table form)
 * on a `host` word class, with the reviewed-table English and its spellings.
 */
export interface Use {
  label?: string;
  form?: 'object' | 'possessive' | 'both';
  host?: string;
  gloss: string | null;
  count: number;
  spellings?: [string, number][];
  ex: Example;
}

/** A verb tense + person form, or a noun's number, with a real example. */
export interface Form {
  key: string;
  tense: 'PERF' | 'IMPF' | 'IMPV' | null;
  /** The QAC description of the form, e.g. "perfect, 3rd person, masculine, plural". */
  label: string;
  spell: string;
  count: number;
  /** The Quran.com in-context English of the example occurrence. */
  here: string | null;
  ex: Example;
}

export interface Detail {
  ex: Example[];
  uses?: Use[];
  forms?: Form[];
}

const BASE = import.meta.env.BASE_URL;
let indexPromise: Promise<VocabIndex> | null = null;
const chunkCache = new Map<number, Promise<Record<string, Detail | Example[]>>>();
const rootCache = new Map<number, Promise<Record<string, { id: number; ex: Example | null }[]>>>();

export function loadVocab(): Promise<VocabIndex> {
  indexPromise ??= fetch(`${BASE}data/vocab.json`).then((r) => {
    if (!r.ok) throw new Error(`Failed to load vocab.json (${r.status})`);
    return r.json();
  });
  indexPromise.catch(() => (indexPromise = null));
  return indexPromise;
}

export async function loadDetail(id: number, chunk: number): Promise<Detail> {
  const c = Math.floor((id - 1) / chunk);
  let p = chunkCache.get(c);
  if (!p) {
    p = fetch(`${BASE}data/vocab/ex-${c}.json`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load examples (${r.status})`);
      return r.json();
    });
    p.catch(() => chunkCache.delete(c));
    chunkCache.set(c, p);
  }
  const d = (await p)[id];
  if (!d) return { ex: [] };
  return Array.isArray(d) ? { ex: d } : d;
}

export async function loadExamples(id: number, chunk: number): Promise<Example[]> {
  return (await loadDetail(id, chunk)).ex;
}

/** A root's most frequent words, each with its first example verse. */
export async function loadRootFamily(index: VocabIndex, root: string): Promise<{ lemma: Lemma; ex: Example | null }[]> {
  const rank = rootRank(index, root);
  if (rank < 0) return [];
  const size = index.rootChunk ?? 100;
  const c = Math.floor(rank / size);
  let p = rootCache.get(c);
  if (!p) {
    p = fetch(`${BASE}data/vocab/roots-${c}.json`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load root family (${r.status})`);
      return r.json();
    });
    p.catch(() => rootCache.delete(c));
    rootCache.set(c, p);
  }
  const fam = (await p)[root] ?? [];
  return fam.map((f) => ({ lemma: index.lemmas[f.id - 1], ex: f.ex })).filter((f) => !!f.lemma);
}

const rootOrder = new WeakMap<VocabIndex, Map<string, number>>();
export function rootRank(index: VocabIndex, root: string): number {
  let m = rootOrder.get(index);
  if (!m) {
    m = new Map(Object.keys(index.roots).map((r, i) => [r, i]));
    rootOrder.set(index, m);
  }
  return m.get(root) ?? -1;
}

/**
 * The corpus gives meanings for words, not roots: a root's core sense is shown
 * through the distinct dictionary meanings of its most frequent words.
 */
export function familySense(family: Lemma[], max = 4): string[] {
  const out: string[] = [];
  for (const l of family) {
    if (!l.meaning) continue;
    const m = l.meaning.trim();
    if (!out.some((o) => o.toLowerCase() === m.toLowerCase())) out.push(m);
    if (out.length >= max) break;
  }
  if (!out.length && family[0]?.inContext[0]) out.push(family[0].inContext[0]);
  return out;
}

/** Meaning shown on cards and quizzes: the dictionary gloss, else the commonest in-context one. */
export const displayMeaning = (l: Lemma) =>
  l.meaning ?? l.inContext[0] ?? (l.pos[0] ? `(${l.pos[0][0].toLowerCase()})` : '—');

/** Attached prefixes and pronoun endings: studied, but not whole words. */
export const isAttached = (l: Lemma) => l.kind === 'prefix' || l.kind === 'suffix';

export const KIND_LABEL: Record<NonNullable<Lemma['kind']>, string> = {
  pronoun: 'Separate pronoun',
  initials: 'Quranic initials',
  prefix: 'Attached prefix',
  suffix: 'Attached pronoun',
};

export const wordPath = (l: Lemma) => `/learn/word/${encodeURIComponent(keyOf(l))}`;
export const rootPath = (root: string) => `/learn/root/${encodeURIComponent(root)}`;
export const findByKey = (index: VocabIndex, key: string) => index.lemmas.find((l) => keyOf(l) === key) ?? null;

/** Every lemma of a root, most frequent first. */
export function rootFamily(index: VocabIndex, root: string): Lemma[] {
  const ids = index.roots[root]?.lemmas ?? [];
  return ids.map((id) => index.lemmas[id - 1]).filter((l): l is Lemma => !!l && l.root === root);
}

// ---- storage ---------------------------------------------------------------
// tibyan.vocab.v1      lemma -> Leitner box (keyed by the lemma itself, so a
//                      rebuild that reorders ranks keeps progress)
// tibyan.vocab.days.v1 local dates (YYYY-MM-DD) with at least one review
// Both are separate from per-surah studied verses and surah practice.

const DAYS_KEY = 'tibyan.vocab.days.v1';
const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function readDays(): string[] {
  try {
    const raw = localStorage.getItem(DAYS_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
export function markToday() {
  const days = readDays();
  const t = today();
  if (days[days.length - 1] === t) return;
  try {
    localStorage.setItem(DAYS_KEY, JSON.stringify([...days.filter((d) => d !== t), t].slice(-400)));
  } catch {
    /* not kept */
  }
}

export const vocabTrack = createTrack('tibyan.vocab.v1', markToday);
export const keyOf = (l: Lemma) => l.key ?? l.lemma;

/** Consecutive days with a review, ending today (or yesterday, if today has none yet). */
export function streak(now = new Date()): number {
  const days = new Set(readDays());
  const d = new Date(now);
  if (!days.has(today(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export type Status = 'new' | 'learning' | 'known';
export function statusOf(l: Lemma, store = vocabTrack.read()): Status {
  const b = store[keyOf(l)]?.box;
  return !b ? 'new' : b >= KNOWN_BOX ? 'known' : 'learning';
}

export function forget(l: Lemma) {
  vocabTrack.set(keyOf(l), 0);
}

/** Roots are their own track: a root is banked by passing its batch test. */
export const rootTrack = createTrack('tibyan.roots.v1', markToday);
export function rootStatus(root: string, store = rootTrack.read()): Status {
  const b = store[root]?.box;
  return !b ? 'new' : b >= KNOWN_BOX ? 'known' : 'learning';
}

// ---- progress ----------------------------------------------------------------

export interface Mastery {
  /** Whole words banked by passing a batch test (any Leitner box). */
  known: number;
  /** Of those, how many are secure: answered right over spaced refreshers (box 4+). */
  secure: number;
  learning: number;
  /** Roots banked by passing a root batch test. */
  rootsKnown: number;
  /** Banked items due for a refresher, all tracks. */
  due: number;
  /** Word occurrences whose head lemma is banked. */
  coveredWords: number;
  /** coveredWords / all word occurrences in the Qur'an (0..1). */
  coverage: number;
  streak: number;
  /** Fewest further words, in frequency order, to reach the next 5% step. */
  nextStep: { target: number; words: number } | null;
  /** Attached prefixes/pronouns banked, of all of them (outside coverage). */
  attachedKnown: number;
  attachedTotal: number;
}

export function mastery(index: VocabIndex): Mastery {
  const store = vocabTrack.read();
  const roots = rootTrack.read();
  const now = Date.now();
  let known = 0,
    secure = 0,
    due = 0,
    covered = 0,
    attachedKnown = 0,
    attachedTotal = 0;
  for (const l of index.lemmas) {
    if (l.kind === 'initials') continue;
    const b = store[keyOf(l)];
    if (isAttached(l)) {
      // Studied like any entry, but each word already counts once for its
      // main word, so attached forms stay out of coverage.
      attachedTotal++;
      if (b && b.due <= now) due++;
      if (b) attachedKnown++;
      continue;
    }
    if (!b) continue;
    if (b.due <= now) due++;
    known++;
    covered += l.count;
    if (b.box >= KNOWN_BOX) secure++;
  }
  let rootsKnown = 0;
  for (const r of Object.values(roots)) {
    rootsKnown++;
    if (r.due <= now) due++;
  }
  const coverage = covered / index.totals.words;

  // Learning the most frequent unbanked words first, how many reach the next 5%?
  const target = Math.min(Math.floor(coverage * 20 + 1) * 5, 95) / 100;
  let nextStep: Mastery['nextStep'] = null;
  if (coverage < target) {
    let c = covered,
      n = 0;
    for (const l of index.lemmas) {
      if (isAttached(l) || store[keyOf(l)]) continue;
      c += l.count;
      n++;
      if (c / index.totals.words >= target) {
        nextStep = { target: target * 100, words: n };
        break;
      }
    }
  }
  return {
    known,
    secure,
    learning: known - secure,
    rootsKnown,
    due,
    coveredWords: covered,
    coverage,
    streak: streak(),
    nextStep,
    attachedKnown,
    attachedTotal,
  };
}

// ---- word list filter -----------------------------------------------------------

export type Pool = 'all' | 'content' | 'function';
export const inPool = (l: Lemma, pool: Pool) => pool === 'all' || (pool === 'content' ? l.content : !l.content);
