// Practice: spaced-repetition flashcards and quizzes built from a surah's words.
// Retention is tracked per word-occurrence in localStorage using a simple
// Leitner box system, so missed words come back sooner and known words later.
//
// Two decks share one store: "grammar" (role, root, form) keyed by word
// occurrence, and "meaning" (English gloss) keyed with an "m:" prefix and
// de-duplicated so a word that repeats in a surah is one card, not dozens.

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
  gloss: string | null;
  translit: string | null;
}

export type Deck = 'grammar' | 'meaning';

/** Storage key for an item in a given deck. */
export function deckKey(item: Item, deck: Deck): string {
  return deck === 'meaning' ? `m:${item.key}` : item.key;
}

// ---- spaced repetition (shared) ------------------------------------------
// A Leitner box per card: a right answer moves it up a box (seen again later),
// a miss sends it back to box 1. Boxes 4–5 count as "known". Each track is its
// own localStorage store, so per-surah practice and lemma-level vocabulary
// mastery never overwrite each other.

export interface Box {
  box: number; // 1..5
  due: number; // epoch ms
}
export type Store = Record<string, Box>;

export const DAY = 86_400_000;
export const INTERVALS = [0, 0.02, 1, 3, 7, 16]; // days, indexed by box (box 1..5)
export const KNOWN_BOX = 4;

export interface Track {
  read(): Store;
  rate(key: string, good: boolean): void;
  /** Put a card straight into a box (e.g. "I already know this"); 0 forgets it. */
  set(key: string, box: number): void;
}

export function createTrack(storageKey: string, onRate?: () => void): Track {
  const read = (): Store => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Store) : {};
    } catch {
      return {};
    }
  };
  const write = (s: Store) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(s));
    } catch {
      /* storage unavailable: progress is just not kept */
    }
  };
  const set = (key: string, box: number) => {
    const s = read();
    if (box <= 0) delete s[key];
    else s[key] = { box, due: Date.now() + INTERVALS[box] * DAY };
    write(s);
  };
  return {
    read,
    set,
    rate(key, good) {
      const cur = read()[key]?.box ?? 0;
      set(key, good ? Math.min(cur + 1, 5) : 1);
      onRate?.();
    },
  };
}

/**
 * A study session: due cards first (most overdue first), then unseen ones,
 * capped at `size`. Unseen cards are shuffled, or kept in the given order
 * (e.g. most frequent first).
 */
export function sessionFrom<T>(
  items: T[],
  keyOf: (t: T) => string,
  track: Track,
  { size = 15, order = 'shuffle', maxNew = size }: { size?: number; order?: 'shuffle' | 'given'; maxNew?: number } = {},
): T[] {
  const store = track.read();
  const now = Date.now();
  const due = items
    .filter((i) => store[keyOf(i)] && store[keyOf(i)].due <= now)
    .sort((a, b) => store[keyOf(a)].due - store[keyOf(b)].due);
  const unseen = items.filter((i) => !store[keyOf(i)]);
  const fresh = (order === 'shuffle' ? shuffle(unseen) : unseen).slice(0, maxNew);
  return [...due, ...fresh].slice(0, size);
}

export function statsFrom<T>(items: T[], keyOf: (t: T) => string, track: Track) {
  const store = track.read();
  let learning = 0,
    known = 0,
    unseen = 0;
  for (const i of items) {
    const b = store[keyOf(i)]?.box;
    if (!b) unseen++;
    else if (b >= KNOWN_BOX) known++;
    else learning++;
  }
  return { learning, known, unseen };
}

// Per-surah practice (word occurrences), unchanged storage key.
const surahTrack = createTrack('tibyan.srs.v1');

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
        gloss: w.gloss ?? null,
        translit: w.translit ?? null,
      });
    }
  }
  return items;
}

// Letters-and-marks form of a word without Quranic annotation signs, used to
// spot repeats of the same word.
function wordForm(arabic: string): string {
  return arabic.replace(/[\u06D6-\u06ED\u0640]/g, '');
}
export function normGloss(g: string): string {
  return g.toLowerCase().replace(/[()[\],.;:!?"'-]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Items for a deck. The meaning deck keeps one card per distinct word + gloss. */
export function deckItems(items: Item[], deck: Deck): Item[] {
  if (deck === 'grammar') return items;
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const i of items) {
    if (!i.gloss) continue;
    const k = `${wordForm(i.arabic)}|${normGloss(i.gloss)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(i);
  }
  return out;
}

// A session: due items first, then unseen ones (shuffled), capped at `size`.
export function buildSession(items: Item[], deck: Deck = 'grammar', size = 15): Item[] {
  return sessionFrom(items, (i) => deckKey(i, deck), surahTrack, { size });
}

export function rate(key: string, good: boolean): void {
  surahTrack.rate(key, good);
}

export function stats(items: Item[], deck: Deck = 'grammar'): { learning: number; known: number; unseen: number } {
  return statsFrom(items, (i) => deckKey(i, deck), surahTrack);
}

// ---- quiz question generation -------------------------------------------

export type QuestionKind = 'role' | 'root' | 'meaning' | 'word';
export interface Question {
  kind: QuestionKind;
  item: Item;
  prompt: string;
  /** Shown large above the options: the Arabic word, or the gloss for 'word'. */
  cue: string;
  options: string[];
  answer: string;
  /** Deck whose retention this question updates. */
  deck: Deck;
  /** An orienting line under the prompt. */
  hint?: string;
  /** Grammar options shown meaning-first: the plain explanation leads, the term follows. */
  views?: Record<string, { lead?: string; terms: string[] }>;
}

export type QuizFocus = 'mixed' | 'meaning' | 'grammar';

export const ROLE_LABEL: Record<Role, string> = {
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

export function buildQuiz(items: Item[], focus: QuizFocus = 'mixed', count = 10): Question[] {
  const withRoot = items.filter((i) => i.root);
  const rolePool = [...new Set(items.map((i) => i.role))];
  const rootPool = [...new Set(withRoot.map((i) => i.root as string))];
  const glossed = deckItems(items, 'meaning');
  const canMeaning = glossed.length >= 4;

  const source = focus === 'meaning' ? glossed : items;
  const chosen = shuffle(source).slice(0, count);
  const qs: Question[] = [];

  for (const item of chosen) {
    const kinds: QuestionKind[] = [];
    if (focus !== 'meaning') {
      kinds.push('role');
      if (item.root && rootPool.length >= 4) kinds.push('root');
    }
    if (focus !== 'grammar' && canMeaning && item.gloss) kinds.push('meaning', 'word');
    const kind = kinds.length ? kinds[Math.floor(Math.random() * kinds.length)] : 'role';

    if (kind === 'meaning' || kind === 'word') {
      const q = meaningQuestion(item, glossed, kind);
      if (q) {
        qs.push(q);
        continue;
      }
    }

    if (kind === 'root' && item.root) {
      const distract = shuffle(rootPool.filter((r) => r !== item.root)).slice(0, 3);
      qs.push({
        kind: 'root',
        item,
        prompt: 'What is the root of this word?',
        cue: item.arabic,
        options: shuffle([item.root, ...distract]),
        answer: item.root,
        deck: 'grammar',
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
        prompt: 'What job does this word do?',
        hint: item.gloss ? `Here it means “${item.gloss}”.` : undefined,
        cue: item.arabic,
        options: shuffle([...opts]),
        answer,
        deck: 'grammar',
        views: Object.fromEntries([...opts].map((o) => [o, { terms: [o] }])),
      });
    }
  }
  return qs;
}

// "What does this word mean?" (Arabic -> gloss) or "Which word means …?"
// (gloss -> Arabic). Distractors never share the answer's gloss, lemma or
// written form, so there is exactly one right option.
function meaningQuestion(item: Item, pool: Item[], kind: 'meaning' | 'word'): Question | null {
  if (!item.gloss) return null;
  const g = normGloss(item.gloss);
  const form = wordForm(item.arabic);
  const usedGloss = new Set([g]);
  const usedForm = new Set([form]);
  const distract: Item[] = [];
  for (const d of shuffle(pool)) {
    if (distract.length >= 3) break;
    if (!d.gloss) continue;
    const dg = normGloss(d.gloss);
    const df = wordForm(d.arabic);
    if (usedGloss.has(dg) || usedForm.has(df)) continue;
    if (item.lemma && d.lemma === item.lemma) continue;
    usedGloss.add(dg);
    usedForm.add(df);
    distract.push(d);
  }
  if (distract.length < 3) return null;
  const all = shuffle([item, ...distract]);
  return kind === 'meaning'
    ? {
        kind,
        item,
        prompt: 'What does this word mean here?',
        cue: item.arabic,
        options: all.map((i) => i.gloss as string),
        answer: item.gloss,
        deck: 'meaning',
      }
    : {
        kind,
        item,
        prompt: 'Which word has this meaning?',
        cue: item.gloss,
        options: all.map((i) => i.arabic),
        answer: item.arabic,
        deck: 'meaning',
      };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
