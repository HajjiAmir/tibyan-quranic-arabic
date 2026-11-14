// Practice: spaced-repetition flashcards and quizzes built from a surah's words.
// Retention is tracked per word-occurrence in localStorage using a simple
// Leitner box system, so missed words come back sooner and known words later.

import type { Role, Surah, Word } from '../types';

export interface Item {
  key: string; // `${surah}:${verse}:${pos}`
  surah: number;
  verse: number;
  pos: number;
  arabic: string;
  role: Role;
  roleDescription: string; // the stem segment's full description
  root: string | null;
  lemma: string | null;
  word: Word;
  verseTranslation: string;
}

interface Box {
  box: number; // 1..5
  due: number; // epoch ms
}
type Store = Record<string, Box>;

const KEY = 'tibyan.srs.v1';
const DAY = 86_400_000;
const INTERVALS = [0, 0.02, 1, 3, 7, 16]; // days, indexed by box (box 1..5)

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}
function write(s: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function buildItems(surah: Surah): Item[] {
  const items: Item[] = [];
  for (const v of surah.verses) {
    for (const w of v.words) {
      const stem = w.segments.find((s) => s.root) ?? w.segments[w.segments.length - 1];
      items.push({
        key: `${surah.id}:${v.id}:${w.position}`,
        surah: surah.id,
        verse: v.id,
        pos: w.position,
        arabic: w.arabic,
        role: w.role,
        roleDescription: stem?.description ?? '',
        root: w.root,
        lemma: w.lemma,
        word: w,
        verseTranslation: v.translation,
      });
    }
  }
  return items;
}

// A session: unseen items first, then items that are due, capped at `size`.
export function buildSession(items: Item[], size = 15): Item[] {
  const store = read();
  const now = Date.now();
  const unseen = items.filter((i) => !store[i.key]);
  const due = items
    .filter((i) => store[i.key] && store[i.key].due <= now)
    .sort((a, b) => store[a.key].due - store[b.key].due);
  const pool = [...due, ...shuffle(unseen)];
  return pool.slice(0, size);
}

export function rate(key: string, good: boolean): void {
  const store = read();
  const cur = store[key]?.box ?? 0;
  const box = good ? Math.min(cur + 1, 5) : 1;
  store[key] = { box, due: Date.now() + INTERVALS[box] * DAY };
  write(store);
}

export function stats(items: Item[]): { learning: number; known: number; unseen: number } {
  const store = read();
  let learning = 0,
    known = 0,
    unseen = 0;
  for (const i of items) {
    const b = store[i.key]?.box;
    if (!b) unseen++;
    else if (b >= 4) known++;
    else learning++;
  }
  return { learning, known, unseen };
}

// ---- quiz question generation -------------------------------------------

export type Question =
  | { kind: 'role'; item: Item; prompt: string; options: string[]; answer: string }
  | { kind: 'root'; item: Item; prompt: string; options: string[]; answer: string };

const ROLE_LABEL: Record<Role, string> = {
  verb: 'Verb',
  noun: 'Noun',
  proper: 'Proper noun',
  pronoun: 'Pronoun',
  adjective: 'Adjective',
  preposition: 'Preposition',
  conjunction: 'Conjunction',
  determiner: 'Determiner',
  negation: 'Negation',
  particle: 'Particle',
};

export function buildQuiz(items: Item[], count = 10): Question[] {
  const withRoot = items.filter((i) => i.root);
  const rolePool = [...new Set(items.map((i) => i.role))];
  const rootPool = [...new Set(withRoot.map((i) => i.root as string))];
  const chosen = shuffle(items).slice(0, count);
  const qs: Question[] = [];

  for (const item of chosen) {
    const canRoot = item.root && rootPool.length >= 4;
    const kind: 'role' | 'root' = canRoot && Math.random() < 0.5 ? 'root' : 'role';

    if (kind === 'root' && item.root) {
      const distract = shuffle(rootPool.filter((r) => r !== item.root)).slice(0, 3);
      qs.push({
        kind: 'root',
        item,
        prompt: 'What is the root of this word?',
        options: shuffle([item.root, ...distract]),
        answer: item.root,
      });
    } else {
      const answer = ROLE_LABEL[item.role];
      const distract = shuffle(rolePool.filter((r) => r !== item.role))
        .slice(0, 3)
        .map((r) => ROLE_LABEL[r]);
      // ensure 4 options even in tiny surahs
      const extra = shuffle(Object.values(ROLE_LABEL).filter((l) => l !== answer));
      const opts = new Set<string>([answer, ...distract]);
      for (const e of extra) {
        if (opts.size >= 4) break;
        opts.add(e);
      }
      qs.push({
        kind: 'role',
        item,
        prompt: 'What role does this word play?',
        options: shuffle([...opts]),
        answer,
      });
    }
  }
  return qs;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
