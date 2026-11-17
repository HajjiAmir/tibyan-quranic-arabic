// Vocabulary mastery: the whole Qur'an's lemmas in frequency order
// (public/data/vocab.json, built by scripts/build-vocab.mjs), studied with the
// same Leitner boxes as surah practice but tracked per lemma, so knowing a
// lemma counts everywhere it occurs.

import type { Role } from '../types';
import { createTrack, KNOWN_BOX, ROLE_LABEL, normGloss, sessionFrom, shuffle, statsFrom } from './practice';

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
}

export interface VocabIndex {
  totals: { words: number; withLemma: number; noLemma: number; lemmas: number; roots: number };
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
}

const BASE = import.meta.env.BASE_URL;
let indexPromise: Promise<VocabIndex> | null = null;
const chunkCache = new Map<number, Promise<Record<string, Example[]>>>();

export function loadVocab(): Promise<VocabIndex> {
  indexPromise ??= fetch(`${BASE}data/vocab.json`).then((r) => {
    if (!r.ok) throw new Error(`Failed to load vocab.json (${r.status})`);
    return r.json();
  });
  indexPromise.catch(() => (indexPromise = null));
  return indexPromise;
}

export async function loadExamples(id: number, chunk: number): Promise<Example[]> {
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
  return (await p)[id] ?? [];
}

/** Meaning shown on cards and quizzes: the dictionary gloss, else the commonest in-context one. */
export const displayMeaning = (l: Lemma) => l.meaning ?? l.inContext[0] ?? '—';

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
function markToday() {
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
export const keyOf = (l: Lemma) => l.lemma;

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

export function markKnown(l: Lemma) {
  vocabTrack.set(keyOf(l), KNOWN_BOX);
  markToday();
}
export function forget(l: Lemma) {
  vocabTrack.set(keyOf(l), 0);
}

// ---- progress ----------------------------------------------------------------

export interface Mastery {
  known: number;
  learning: number;
  rootsKnown: number;
  due: number;
  /** Word occurrences whose head lemma is known. */
  coveredWords: number;
  /** coveredWords / all word occurrences in the Qur'an (0..1). */
  coverage: number;
  streak: number;
  /** Fewest further words, in frequency order, to reach the next 5% step. */
  nextStep: { target: number; words: number } | null;
}

export function mastery(index: VocabIndex): Mastery {
  const store = vocabTrack.read();
  const now = Date.now();
  let known = 0,
    learning = 0,
    due = 0,
    covered = 0;
  const roots = new Set<string>();
  for (const l of index.lemmas) {
    const b = store[keyOf(l)];
    if (!b) continue;
    if (b.due <= now) due++;
    if (b.box >= KNOWN_BOX) {
      known++;
      covered += l.count;
      if (l.root) roots.add(l.root);
    } else learning++;
  }
  const coverage = covered / index.totals.words;

  // Learning the most frequent unknown words first, how many reach the next 5%?
  const target = Math.min(Math.floor(coverage * 20 + 1) * 5, 95) / 100;
  let nextStep: Mastery['nextStep'] = null;
  if (coverage < target) {
    let c = covered,
      n = 0;
    for (const l of index.lemmas) {
      if ((store[keyOf(l)]?.box ?? 0) >= KNOWN_BOX) continue;
      c += l.count;
      n++;
      if (c / index.totals.words >= target) {
        nextStep = { target: target * 100, words: n };
        break;
      }
    }
  }
  return { known, learning, rootsKnown: roots.size, due, coveredWords: covered, coverage, streak: streak(), nextStep };
}

// ---- global practice -----------------------------------------------------------

export type Pool = 'all' | 'content' | 'function';
export const inPool = (l: Lemma, pool: Pool) => pool === 'all' || (pool === 'content' ? l.content : !l.content);

/** Due lemmas first, then new ones in frequency order. */
export function vocabSession(index: VocabIndex, pool: Pool, size = 15, maxNew = 10): Lemma[] {
  const items = index.lemmas.filter((l) => inPool(l, pool));
  return sessionFrom(items, keyOf, vocabTrack, { size, order: 'given', maxNew });
}

export function poolStats(index: VocabIndex, pool: Pool) {
  return statsFrom(
    index.lemmas.filter((l) => inPool(l, pool)),
    keyOf,
    vocabTrack,
  );
}

export type VocabQuestionKind = 'meaning' | 'word' | 'root' | 'grammar';
export interface VocabQuestion {
  kind: VocabQuestionKind;
  lemma: Lemma;
  prompt: string;
  cue: string;
  cueArabic: boolean;
  options: string[];
  optionsArabic: boolean;
  answer: string;
}

const posLabel = (l: Lemma) => l.pos[0]?.[0] ?? ROLE_LABEL[l.role];

/**
 * Quiz questions over the session's lemmas (due and new ones first).
 * Distractors come from lemmas of similar frequency and never share the
 * answer's meaning, form or root, so exactly one option is right.
 */
export function vocabQuiz(index: VocabIndex, pool: Pool, count = 10): VocabQuestion[] {
  let chosen = vocabSession(index, pool, count, count);
  if (chosen.length < count) {
    // Everything is known and nothing is due: revisit known words, most frequent first.
    const extra = index.lemmas.filter((l) => inPool(l, pool) && !chosen.includes(l)).slice(0, 200);
    chosen = [...chosen, ...shuffle(extra).slice(0, count - chosen.length)];
  }
  const all = index.lemmas;
  const near = (l: Lemma) => all.slice(Math.max(0, l.id - 80), l.id + 80).filter((x) => x.id !== l.id);
  const posPool = [...new Set(all.slice(0, 600).map(posLabel))];

  return shuffle(chosen).map((l): VocabQuestion => {
    const kinds: VocabQuestionKind[] = ['meaning', 'word', 'grammar'];
    if (l.root) kinds.push('root');
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const neighbours = shuffle(near(l));

    if (kind === 'root' && l.root) {
      const roots = [...new Set(neighbours.map((x) => x.root).filter((r): r is string => !!r && r !== l.root))].slice(0, 3);
      if (roots.length === 3)
        return { kind, lemma: l, prompt: 'What is its root?', cue: l.lemma, cueArabic: true, options: shuffle([l.root, ...roots]), optionsArabic: true, answer: l.root };
    }
    if (kind === 'grammar') {
      const answer = posLabel(l);
      const wrong = shuffle(posPool.filter((p) => p !== answer && !l.pos.some(([q]) => q === p))).slice(0, 3);
      if (wrong.length === 3)
        return { kind, lemma: l, prompt: 'What part of speech is it, most often?', cue: l.lemma, cueArabic: true, options: shuffle([answer, ...wrong]), optionsArabic: false, answer };
    }
    // meaning / word (also the fallback)
    const m = displayMeaning(l);
    const used = new Set([normGloss(m)]);
    const ds: Lemma[] = [];
    for (const d of neighbours) {
      if (ds.length >= 3) break;
      const dm = normGloss(displayMeaning(d));
      if (used.has(dm) || d.lemma === l.lemma) continue;
      used.add(dm);
      ds.push(d);
    }
    const opts = shuffle([l, ...ds]);
    return kind === 'word'
      ? { kind: 'word', lemma: l, prompt: 'Which word has this meaning?', cue: m, cueArabic: false, options: opts.map((o) => o.lemma), optionsArabic: true, answer: l.lemma }
      : { kind: 'meaning', lemma: l, prompt: 'What does it mean?', cue: l.lemma, cueArabic: true, options: opts.map(displayMeaning), optionsArabic: false, answer: m };
  });
}
