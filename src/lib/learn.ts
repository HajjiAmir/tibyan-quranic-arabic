// The gated learning loop (brief 16): learn a batch -> get tested -> bank it ->
// refresh it later.
//
// Three tracks share the loop: whole words (frequency order), roots (frequency
// order) and attached forms (prefixes and pronoun endings). Each track is cut
// into batches of BATCH items. Only the first batch with an unbanked item is
// open; every later batch is locked until it is passed. A batch is passed when
// every item in it has been answered correctly in its test (a missed item is
// re-taught and asked again). Passing banks the items in the Leitner store
// (words and attached forms: tibyan.vocab.v1, roots: tibyan.roots.v1), and
// banked items come back as refreshers when they fall due: a few inside every
// new batch, the rest in a review session.
//
// Questions are built only from the sourced data: QAC parts of speech, forms
// and dictionary glosses, Quran.com in-context glosses, the reviewed pronoun
// table, and Saheeh International translations of the example verses.

import { KNOWN_BOX, normGloss, shuffle, type Track } from './practice';
import {
  displayMeaning,
  familySense,
  isAttached,
  keyOf,
  loadDetail,
  markToday,
  rootFamily,
  rootTrack,
  vocabTrack,
  type Detail,
  type Example,
  type Lemma,
  type Use,
  type VocabIndex,
} from './vocab';

export type TrackId = 'words' | 'roots' | 'attached';
export const BATCH = 8;
export const REFRESH_IN_BATCH = 3;
export const REVIEW_SIZE = 12;

export const TRACKS: Record<TrackId, { label: string; one: string; many: string }> = {
  words: { label: 'Words', one: 'word', many: 'words' },
  roots: { label: 'Roots', one: 'root', many: 'roots' },
  attached: { label: 'Attached forms', one: 'form', many: 'forms' },
};

export type LearnItem =
  | { track: 'words' | 'attached'; key: string; lemma: Lemma }
  | { track: 'roots'; key: string; root: string };

export const storeOf = (t: TrackId): Track => (t === 'roots' ? rootTrack : vocabTrack);

const cache = new WeakMap<VocabIndex, Record<TrackId, LearnItem[]>>();
export function trackItems(index: VocabIndex, t: TrackId): LearnItem[] {
  let c = cache.get(index);
  if (!c) {
    c = {
      // Quranic initials are read by their letter names and have no meaning to
      // test, so they stay in the word list but outside the learning loop.
      words: index.lemmas.filter((l) => !isAttached(l) && l.kind !== 'initials').map((l) => ({ track: 'words', key: keyOf(l), lemma: l })),
      attached: index.lemmas.filter(isAttached).map((l) => ({ track: 'attached', key: keyOf(l), lemma: l })),
      roots: Object.keys(index.roots).map((r) => ({ track: 'roots', key: r, root: r })),
    };
    cache.set(index, c);
  }
  return c[t];
}

export interface TrackState {
  track: TrackId;
  total: number;
  batches: number;
  /** Index of the open batch (0-based); equals `batches` when the track is complete. */
  current: number;
  /** All items of the open batch, and those of it not banked yet. */
  batchItems: LearnItem[];
  toLearn: LearnItem[];
  next: LearnItem[];
  banked: number;
  secure: number;
  due: LearnItem[];
}

export function trackState(index: VocabIndex, t: TrackId, now = Date.now()): TrackState {
  const items = trackItems(index, t);
  const store = storeOf(t).read();
  const batches = Math.ceil(items.length / BATCH);
  let current = batches;
  for (let b = 0; b < batches; b++) {
    if (items.slice(b * BATCH, (b + 1) * BATCH).some((i) => !store[i.key])) {
      current = b;
      break;
    }
  }
  const batchItems = items.slice(current * BATCH, (current + 1) * BATCH);
  let banked = 0,
    secure = 0;
  const due: LearnItem[] = [];
  for (const i of items) {
    const b = store[i.key];
    if (!b) continue;
    banked++;
    if (b.box >= KNOWN_BOX) secure++;
    if (b.due <= now) due.push(i);
  }
  due.sort((a, b) => store[a.key].due - store[b.key].due);
  return {
    track: t,
    total: items.length,
    batches,
    current,
    batchItems,
    toLearn: batchItems.filter((i) => !store[i.key]),
    next: items.slice((current + 1) * BATCH, (current + 2) * BATCH),
    banked,
    secure,
    due,
  };
}

export interface Session {
  track: TrackId;
  mode: 'batch' | 'review';
  batch: number;
  fresh: LearnItem[];
  refresh: LearnItem[];
}

export function startSession(index: VocabIndex, t: TrackId, mode: 'batch' | 'review'): Session {
  const st = trackState(index, t);
  if (mode === 'review') return { track: t, mode, batch: st.current, fresh: [], refresh: st.due.slice(0, REVIEW_SIZE) };
  const fresh = st.toLearn;
  return { track: t, mode, batch: st.current, fresh, refresh: st.due.filter((d) => !fresh.includes(d)).slice(0, REFRESH_IN_BATCH) };
}

/**
 * Bank a passed session. New items go into the store (box 2, back in a day, if
 * right first time; box 1, back within the hour, if they needed a second go).
 * Refreshers move up a box if right first time and back to box 1 if missed.
 */
export function bankSession(s: Session, missed: Set<string>) {
  const track = storeOf(s.track);
  for (const i of s.fresh) track.set(i.key, missed.has(i.key) ? 1 : 2);
  for (const i of s.refresh) track.rate(i.key, !missed.has(i.key));
  markToday();
}

// ---- questions -----------------------------------------------------------------

export interface Question {
  item: LearnItem;
  kind: 'meaning' | 'word' | 'use' | 'form' | 'root' | 'part' | 'root-sense' | 'root-word' | 'word-root';
  prompt: string;
  /** Shown large: Arabic (cueArabic) or English. */
  cue: string | null;
  cueArabic: boolean;
  /** An example verse the question is about, with the target highlighted. */
  example?: Example;
  options: string[];
  optionsArabic: boolean;
  answer: string;
}

const spaced = (root: string) => root.split('').join(' ');

/** Detail for every lemma in the items (loaded in parallel, chunk files cached). */
export async function loadDetails(index: VocabIndex, items: LearnItem[]): Promise<Map<string, Detail>> {
  const out = new Map<string, Detail>();
  await Promise.all(
    items.map(async (i) => {
      if (i.track === 'roots') return;
      out.set(i.key, await loadDetail(i.lemma.id, index.chunk));
    }),
  );
  return out;
}

/** Pick 3 distractors whose label is not the answer's (or any other right answer). */
function distract(cands: string[], exclude: string[], n = 3): string[] {
  const bad = new Set(exclude.map(normGloss));
  const out: string[] = [];
  for (const c of shuffle(cands)) {
    if (out.length >= n) break;
    const k = normGloss(c);
    if (!c || bad.has(k)) continue;
    bad.add(k);
    out.push(c);
  }
  return out;
}

export const useLabel = (u: Use) =>
  u.form ? `${u.form === 'possessive' ? 'Possessive' : u.form === 'object' ? 'Object' : 'After a particle'} · on a ${u.host}` : (u.label ?? '');

/**
 * One question for an item. `avoid` lists kinds already asked for it in this
 * session, so a retest asks it a different way where it can.
 */
export function makeQuestion(index: VocabIndex, item: LearnItem, detail: Detail | undefined, avoid: string[] = []): Question {
  const kinds: Question['kind'][] = [];
  const builders: Partial<Record<Question['kind'], () => Question | null>> = {};

  if (item.track === 'roots') {
    const root = item.root;
    const fam = rootFamily(index, root);
    const rank = Object.keys(index.roots).indexOf(root);
    const nearRoots = Object.keys(index.roots)
      .slice(Math.max(0, rank - 40), rank + 40)
      .filter((r) => r !== root);
    const sense = familySense(fam);
    builders['root-sense'] = () => {
      if (!sense.length) return null;
      const wrong = distract(
        nearRoots.map((r) => familySense(rootFamily(index, r), 1)[0]).filter(Boolean),
        sense,
      );
      if (wrong.length < 3) return null;
      return { item, kind: 'root-sense', prompt: 'What is the core sense of this root?', cue: spaced(root), cueArabic: true, options: shuffle([sense[0], ...wrong]), optionsArabic: false, answer: sense[0] };
    };
    builders['root-word'] = () => {
      const w = fam[0];
      if (!w) return null;
      const famLemmas = fam.map((f) => f.lemma);
      const wrong = distract(
        nearRoots.map((r) => rootFamily(index, r)[0]?.lemma).filter((x): x is string => !!x),
        famLemmas,
      );
      if (wrong.length < 3) return null;
      return { item, kind: 'root-word', prompt: 'Which word is built from this root?', cue: spaced(root), cueArabic: true, options: shuffle([w.lemma, ...wrong]), optionsArabic: true, answer: w.lemma };
    };
    builders['word-root'] = () => {
      const w = fam[Math.min(fam.length - 1, Math.floor(Math.random() * Math.min(3, fam.length)))];
      if (!w) return null;
      const wrong = shuffle(nearRoots).slice(0, 3).map(spaced);
      return { item, kind: 'word-root', prompt: 'Which root is this word built from?', cue: w.lemma, cueArabic: true, options: shuffle([spaced(root), ...wrong]), optionsArabic: true, answer: spaced(root) };
    };
    kinds.push('root-sense', 'root-word', 'word-root');
  } else {
    const l = item.lemma;
    const all = index.lemmas;
    const attached = isAttached(l);
    const peers = attached ? all.filter((x) => isAttached(x) && x.id !== l.id) : all.slice(Math.max(0, l.id - 80), l.id + 80).filter((x) => x.id !== l.id && !isAttached(x) && x.kind !== 'initials');
    const uses = detail?.uses ?? [];
    const forms = detail?.forms ?? [];
    const ownGlosses = [displayMeaning(l), ...uses.map((u) => u.gloss ?? ''), ...l.inContext].filter(Boolean);

    if (attached) {
      // What does the highlighted prefix / ending mean in this verse?
      builders.part = () => {
        const u = shuffle(uses.filter((x) => x.gloss && x.ex.part))[0];
        if (!u || !u.gloss) return null;
        const cands = peers.flatMap((p) => [...(p.meaning ?? '').split(' / '), ...(p.senses ?? []).map((s) => s[1] ?? '')]);
        // Every reading of this form's own glosses counts as right, so none may be a distractor.
        const own = [...ownGlosses, ...ownGlosses.flatMap((g) => g.split(' / '))];
        const wrong = distract(cands, own);
        if (wrong.length < 3) return null;
        return { item, kind: 'part', prompt: `What does the highlighted ${l.kind === 'prefix' ? 'prefix' : 'ending'} mean here?`, cue: null, cueArabic: false, example: u.ex, options: shuffle([u.gloss, ...wrong]), optionsArabic: false, answer: u.gloss };
      };
      kinds.push('part', 'part', 'meaning');
    } else {
      if (uses.length >= 2) {
        builders.use = () => {
          const u = uses[Math.floor(Math.random() * uses.length)];
          const opts = [...new Set(uses.map((x) => `${x.label} — ${x.gloss ?? '…'}`))].slice(0, 4);
          const answer = `${u.label} — ${u.gloss ?? '…'}`;
          if (!opts.includes(answer)) opts[opts.length - 1] = answer;
          return { item, kind: 'use', prompt: `How is ${l.lemma} used in this verse?`, cue: null, cueArabic: false, example: u.ex, options: shuffle(opts), optionsArabic: false, answer };
        };
        kinds.push('use', 'use');
      }
      if (forms.length >= 3) {
        builders.form = () => {
          const f = forms[Math.floor(Math.random() * forms.length)];
          const wrong = distract(forms.filter((x) => x.label !== f.label).map((x) => x.label), [f.label]);
          if (wrong.length < 2) return null;
          return { item, kind: 'form', prompt: 'Which form is the highlighted word?', cue: null, cueArabic: false, example: f.ex, options: shuffle([f.label, ...wrong]), optionsArabic: false, answer: f.label };
        };
        kinds.push('form');
      }
      if (l.root) {
        builders.root = () => {
          const roots = distract(peers.map((x) => x.root ?? ''), [l.root ?? '']);
          if (roots.length < 3) return null;
          return { item, kind: 'root', prompt: 'What is its root?', cue: l.lemma, cueArabic: true, options: shuffle([l.root!, ...roots]).map(spaced), optionsArabic: true, answer: spaced(l.root!) };
        };
        kinds.push('root');
      }
      if (uses.length < 2) kinds.push('meaning', 'word');
    }
    const m = displayMeaning(l);
    builders.meaning = () => {
      const wrong = distract(peers.map(displayMeaning), ownGlosses);
      if (wrong.length < 3) return null;
      return { item, kind: 'meaning', prompt: 'What does it mean?', cue: l.lemma, cueArabic: true, options: shuffle([m, ...wrong]), optionsArabic: false, answer: m };
    };
    builders.word = () => {
      const ds = peers.filter((p) => p.lemma !== l.lemma && !ownGlosses.map(normGloss).includes(normGloss(displayMeaning(p))));
      const wrong = distract(ds.map((d) => d.lemma), [l.lemma]);
      if (wrong.length < 3) return null;
      return { item, kind: 'word', prompt: 'Which word has this meaning?', cue: m, cueArabic: false, options: shuffle([l.lemma, ...wrong]), optionsArabic: true, answer: l.lemma };
    };
  }

  const order = [...shuffle(kinds.filter((k) => !avoid.includes(k))), ...shuffle(kinds), 'meaning' as const, 'root-sense' as const, 'word-root' as const];
  for (const k of order) {
    const q = builders[k]?.();
    if (q) return q;
  }
  // Last resort (should not happen): recognise the item among its peers.
  const label = item.track === 'roots' ? spaced(item.root) : item.lemma.lemma;
  return { item, kind: 'meaning', prompt: 'Recall this item', cue: label, cueArabic: true, options: [label], optionsArabic: true, answer: label };
}
