// Builds the frequency-ranked vocabulary index from the generated surah data:
//   public/data/vocab.json            every lemma, most frequent first
//   public/data/vocab/ex-<n>.json     example verses, 250 lemmas per file
//
// Run after build-data.mjs. Nothing is hand-written: lemmas, roots, parts of
// speech and the dictionary glosses come from the Quranic Arabic Corpus; the
// in-context glosses are the Quran.com word-by-word English; verse
// translations are Saheeh International.
//
// Counting unit: one word occurrence (77,429 in the Qur'an) counts once, for
// its head lemma:
//   1. the segment that carries the root; else
//   2. the first segment with a lemma that is neither a prefix nor a suffix
//      (so وَلَا counts for لا, not for the conjunction و); else
//   3. the first segment with a lemma (e.g. a lone prefixed preposition).
// Words with no lemma in the corpus get entries of their own (brief 10):
//   - separate pronouns (هُوَ، هُمْ، نَحْنُ …), one per person/gender/number,
//     meaning from the reviewed pronoun table's subject forms;
//   - the Quranic initials (الٓمٓ، حمٓ …), one per letter group, no meaning
//     (read by their letter names, as the word-by-word gloss gives them).
// Attached prefixes (wa-, fa-, bi-, li-, al- …) and attached object/possessive
// pronouns (-hu, -hum, -kum …) are study entries too, counted per attachment.
// They are marked `kind: 'prefix' | 'suffix'` and are NOT part of the word
// count: every word is already counted once, for its head, so coverage stays a
// share of the Qur'an's words.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTICLE_GLOSS, REVIEWED_PRONOUNS, SUBJECT_FORMS, pronounKey } from './reviewed-pronouns.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'public/data');
const CHUNK = 250;

const CONTENT_ROLES = new Set(['noun', 'verb', 'adjective', 'proper']);

function head(word) {
  const segs = word.segments;
  return (
    segs.find((s) => s.root) ??
    segs.find((s) => s.lemma && !s.prefix && !(s.flags ?? []).includes('SUFF')) ??
    segs.find((s) => s.lemma) ??
    null
  );
}

const count = (map, k, by = 1) => map.set(k, (map.get(k) ?? 0) + by);
const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, n);
const cleanTranslation = (t) => t.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();

const lemmas = new Map();
let totalWords = 0;
let noEntry = 0;
const attachedTotals = { prefix: 0, suffix: 0 };
const flagsOf = (s) => s.flags ?? [];
const feats = (s) => `${s.person ?? ''}${s.gender ?? ''}${s.number ?? ''}`;
const letters = (s) => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');
// Dual pronouns share one spelling (هُمَا، كُمَا) whatever the gender.
const pronFeat = (f) => f.replace(/^([123])[MF]D$/, '$1D');

function entry(key, kind, lemma) {
  let e = lemmas.get(key);
  if (!e) {
    e = {
      key,
      kind,
      lemma,
      spellings: new Map(),
      roots: new Map(),
      roles: new Map(),
      pos: new Map(),
      forms: new Map(),
      meaning: new Map(),
      senses: new Map(),
      ctx: new Map(),
      ctxRaw: new Map(),
      desc: new Map(),
      occ: [],
    };
    lemmas.set(key, e);
  }
  return e;
}

// In-context glosses (Quran.com word-by-word) translate the whole word, so a
// word with an attached prefix often reads "and mercy" or "for the people".
// For the lemma's meaning the leading words that translate those prefixes are
// removed, and nothing else: a leading word is removed only when the word has
// that prefix and the word is one the Quranic Arabic Corpus itself gives as the
// prefix's translation (its "usually translated as" phrases, in build-data.mjs),
// plus "the" for the article. Other renderings ("but", "in", "o" …) are left as
// they are. The example verses keep the full gloss ("here: …").
const CONNECTIVE = ['and', 'then', 'so', 'while', 'with']; // wa- / fa- uses: CONJ, REM, SUP, RSLT, CAUS, CIRC, COM
const PREP_BY_LETTER = { 'ب': ['with', 'by'], 'ل': ['for'], 'ك': ['like', 'as'], 'ت': ['by'], 'و': ['by'] };
function prefixWords(g) {
  const f = flagsOf(g);
  if (f.includes('DET')) return [ARTICLE_GLOSS];
  if (f.includes('EMPH')) return ['surely', 'indeed'];
  if (['CONJ', 'REM', 'SUP', 'RSLT', 'CAUS', 'CIRC', 'COM'].some((x) => f.includes(x))) return CONNECTIVE;
  if (f.includes('P')) return PREP_BY_LETTER[letters(g.lemma ?? g.arabic)[0]] ?? [];
  return [];
}
const stripStats = { glosses: 0, changed: 0 };
function contextGloss(w, headSeg) {
  stripStats.glosses++;
  let words = w.gloss.trim().split(/\s+/);
  for (const g of w.segments) {
    if (g === headSeg || !g.prefix) continue;
    const allowed = prefixWords(g);
    // "and", "And", "[and]", "surely," all match "and" / "surely".
    const first = (words[0] ?? '').toLowerCase().replace(/^\[(.*)\]$/, '$1').replace(/[,;:]$/, '');
    if (words.length > 1 && allowed.includes(first)) words = words.slice(1);
  }
  const out = words.join(' ');
  if (out !== w.gloss.trim()) stripStats.changed++;
  return out;
}

function note(e, w, seg, s, v, wi) {
  if (seg.root) count(e.roots, seg.root);
  count(e.roles, seg.role);
  count(e.pos, seg.pos);
  if (seg.verbForm) count(e.forms, seg.verbForm);
  if (w.gloss && (e.kind === 'word' || e.kind === 'pronoun' || e.kind === 'initials')) {
    const g = contextGloss(w, seg);
    count(e.ctx, g.toLowerCase());
    count(e.ctxRaw, g);
  }
  count(e.desc, `${w.arabic}\u0000${seg.description}`);
  e.occ.push({ s, v: v.id, wi, len: v.words.length });
}

for (let s = 1; s <= 114; s++) {
  const surah = JSON.parse(readFileSync(join(DATA, 'surahs', `${s}.json`), 'utf8'));
  for (const v of surah.verses) {
    for (let wi = 0; wi < v.words.length; wi++) {
      const w = v.words[wi];
      totalWords++;
      const seg = head(w);
      let headSeg = seg;
      if (seg) {
        const e = entry(seg.lemma, 'word', seg.lemma);
        if (seg.glossSource === 'qac-lemma' && seg.gloss) count(e.meaning, seg.gloss);
        note(e, w, seg, s, v, wi);
      } else {
        const pron = w.segments.find((x) => flagsOf(x).includes('PRON'));
        const inl = w.segments.find((x) => flagsOf(x).includes('INL'));
        if (pron) {
          const f = pronFeat(feats(pron));
          const e = entry(`pron:${f}`, 'pronoun', null);
          e.feat = f;
          count(e.spellings, w.arabic);
          note(e, w, pron, s, v, wi);
          headSeg = pron;
        } else if (inl) {
          const e = entry(`init:${letters(w.arabic)}`, 'initials', w.arabic);
          note(e, w, inl, s, v, wi);
          headSeg = inl;
        } else {
          noEntry++;
        }
      }

      // Attached parts of this word (never its head).
      for (const g of w.segments) {
        if (g === headSeg) continue;
        if (g.prefix && g.lemma) {
          const e = entry(`pre:${g.lemma}`, 'prefix', null);
          count(e.spellings, g.arabic);
          count(e.senses, `${g.pos}\u0000${g.gloss ?? ''}`);
          if (g.gloss) count(e.meaning, g.gloss);
          note(e, w, g, s, v, wi);
          attachedTotals.prefix++;
        } else if (flagsOf(g).includes('SUFF') && flagsOf(g).includes('PRON') && g.glossSource === 'reviewed-table') {
          // Only suffixes the reviewed table glosses: object/possessive
          // pronouns, never verb subject markers.
          const f = pronFeat(feats(g));
          const e = entry(`suf:${f}`, 'suffix', null);
          e.feat = f;
          count(e.spellings, g.arabic);
          count(e.senses, g.pronounForm);
          note(e, w, g, s, v, wi);
          attachedTotals.suffix++;
        }
      }
    }
  }
}

// Meanings for the entries built here, from the reviewed table only.
const FORM_LABEL = { possessive: 'Possessive', object: 'Object', both: 'After a particle or pronoun' };
for (const e of lemmas.values()) {
  if (e.kind === 'pronoun' || e.kind === 'suffix') {
    const k = pronounKey(e.feat);
    if (!k || !REVIEWED_PRONOUNS[k]) throw new Error(`No reviewed-table entry for ${e.key}`);
    const [poss, obj] = REVIEWED_PRONOUNS[k];
    if (e.kind === 'pronoun') {
      const subj = SUBJECT_FORMS[k];
      // Cross-check: the subject form must occur in the Quran.com glosses.
      const re = new RegExp(`\\b${subj}\\b`, 'i');
      if (![...e.ctxRaw.keys()].some((g) => re.test(g)))
        throw new Error(`Subject form "${subj}" for ${e.key} never appears in its word-by-word glosses`);
      e.fixedMeaning = subj;
    } else {
      e.fixedMeaning = poss === obj ? poss : `${poss} / ${obj}`;
      e.senseList = top(e.senses, 3).map(([f, n]) => [FORM_LABEL[f], f === 'possessive' ? poss : f === 'object' ? obj : poss === obj ? poss : `${poss} / ${obj}`, n]);
    }
  }
  if (e.kind === 'prefix') {
    e.senseList = top(e.senses, 8).map(([k, n]) => {
      const [pos, gloss] = k.split('\u0000');
      return [pos, gloss || null, n];
    });
    if (e.key === 'pre:ال' && top(e.meaning, 1)[0]?.[0] !== ARTICLE_GLOSS) throw new Error('article gloss mismatch');
  }
  if (e.spellings.size) {
    // Spellings that keep at least one letter (the 1S yā' is sometimes dropped).
    const sp = top(new Map([...e.spellings].filter(([x]) => letters(x))), 4).map(([x]) => x);
    const tat = (x) => (e.kind === 'prefix' ? `${x}ـ` : e.kind === 'suffix' ? `ـ${x}` : x);
    e.lemma = tat(sp[0]);
    e.spellingList = sp.map(tat);
  }
}

// Two examples per lemma: short verses (3–14 words where possible), from
// different surahs, earliest first.
function pickExamples(occ) {
  const sorted = [...occ].sort((a, b) => {
    const ga = a.len >= 3 && a.len <= 14 ? 0 : 1;
    const gb = b.len >= 3 && b.len <= 14 ? 0 : 1;
    return ga - gb || a.len - b.len || a.s - b.s || a.v - b.v;
  });
  const out = [];
  for (const o of sorted) {
    if (out.length >= 2) break;
    if (out.some((x) => x.s === o.s && x.v === o.v)) continue;
    if (out.length === 1 && out[0].s === o.s && sorted.some((x) => x.s !== o.s)) continue;
    out.push(o);
  }
  return out;
}

const ranked = [...lemmas.values()].sort((a, b) => b.occ.length - a.occ.length || a.key.localeCompare(b.key));

const rootStats = new Map();
const entries = ranked.map((e, i) => {
  const role = top(e.roles, 1)[0][0];
  const root = e.roots.size ? top(e.roots, 1)[0][0] : null;
  const [sampleKey] = top(e.desc, 1)[0];
  const [sampleArabic, sampleDesc] = sampleKey.split('\u0000');
  const id = i + 1;
  if (root) {
    const r = rootStats.get(root) ?? { count: 0, lemmas: [] };
    r.count += e.occ.length;
    r.lemmas.push(id);
    rootStats.set(root, r);
  }
  const out = {
    id,
    lemma: e.lemma,
    root,
    role,
    content: e.kind === 'word' && CONTENT_ROLES.has(role),
    pos: top(e.pos, 3),
    form: e.forms.size ? top(e.forms, 1)[0][0] : null,
    meaning: e.fixedMeaning ?? (e.meaning.size ? top(e.meaning, 1)[0][0] : null),
    // Variants differing only in capitals are counted together (word-by-word
    // glosses capitalise sentence starts); each shows its most common spelling.
    inContext: top(e.ctx, 3).map(([g]) => top(new Map([...e.ctxRaw].filter(([r]) => r.toLowerCase() === g)), 1)[0][0]),
    sample: { arabic: sampleArabic, description: sampleDesc },
    count: e.occ.length,
    examples: pickExamples(e.occ),
  };
  if (e.kind !== 'word') {
    out.kind = e.kind;
    out.key = e.key;
  }
  if (e.senseList) out.senses = e.senseList;
  if (e.spellingList && e.spellingList.length > 1) out.spellings = e.spellingList;
  return out;
});

// Example verse text, chunked by rank.
const surahCache = new Map();
const surahOf = (s) => {
  if (!surahCache.has(s)) surahCache.set(s, JSON.parse(readFileSync(join(DATA, 'surahs', `${s}.json`), 'utf8')));
  return surahCache.get(s);
};
rmSync(join(DATA, 'vocab'), { recursive: true, force: true });
mkdirSync(join(DATA, 'vocab'), { recursive: true });
for (let c = 0; c * CHUNK < entries.length; c++) {
  const chunk = {};
  for (const e of entries.slice(c * CHUNK, (c + 1) * CHUNK)) {
    chunk[e.id] = e.examples.map((o) => {
      const verse = surahOf(o.s).verses.find((v) => v.id === o.v);
      return {
        ref: `${o.s}:${o.v}`,
        words: verse.words.map((w) => w.arabic),
        hit: o.wi,
        gloss: verse.words[o.wi].gloss ?? null,
        translation: cleanTranslation(verse.translation),
      };
    });
  }
  writeFileSync(join(DATA, 'vocab', `ex-${c}.json`), JSON.stringify(chunk));
}

const out = {
  about:
    'Frequency index of Quranic lemmas (head lemma per word occurrence), plus separate pronouns, Quranic initials and attached prefixes/pronouns (kind: prefix|suffix, counted per attachment, not in the word total). Lemmas, roots, parts of speech, dictionary and prefix glosses: Quranic Arabic Corpus. Pronoun and article meanings: the reviewed table (scripts/reviewed-pronouns.mjs). In-context glosses: Quran.com word-by-word. Built by scripts/build-vocab.mjs.',
  totals: {
    words: totalWords,
    // Words with an entry (a lemma, a separate pronoun or Quranic initials).
    withLemma: totalWords - noEntry,
    noLemma: noEntry,
    lemmas: entries.length,
    roots: rootStats.size,
    kinds: Object.fromEntries(['word', 'pronoun', 'initials', 'prefix', 'suffix'].map((k) => [k, entries.filter((e) => (e.kind ?? 'word') === k).length])),
    attached: attachedTotals,
  },
  chunk: CHUNK,
  lemmas: entries.map(({ examples, ...e }) => ({ ...e, refs: examples.map((o) => `${o.s}:${o.v}`) })),
  roots: Object.fromEntries([...rootStats.entries()].sort((a, b) => b[1].count - a[1].count)),
};
writeFileSync(join(DATA, 'vocab.json'), JSON.stringify(out));

// Sanity output: coverage of the top-N whole-word entries.
const words = entries.filter((e) => e.kind !== 'prefix' && e.kind !== 'suffix');
const cov = (n) => words.slice(0, n).reduce((t, e) => t + e.count, 0) / totalWords;
console.log(`vocab: ${entries.length} entries (${JSON.stringify(out.totals.kinds)}), ${rootStats.size} roots, ${totalWords} words (${noEntry} without an entry)`);
console.log(`attached: ${attachedTotals.prefix} prefixes, ${attachedTotals.suffix} pronoun suffixes`);
console.log(`in-context glosses: ${stripStats.changed} of ${stripStats.glosses} had leading prefix words removed`);
console.log(
  [10, 20, 100, 300, 500, 1000].map((n) => `top ${n}: ${(cov(n) * 100).toFixed(1)}%`).join(' · ') + ` · all: ${(cov(words.length) * 100).toFixed(2)}%`,
);
