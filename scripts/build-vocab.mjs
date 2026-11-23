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
  let here = null;
  if (w.gloss && (e.kind === 'word' || e.kind === 'pronoun' || e.kind === 'initials')) {
    here = contextGloss(w, seg);
    count(e.ctx, here.toLowerCase());
    count(e.ctxRaw, here);
  }
  count(e.desc, `${w.arabic}\u0000${seg.description}`);
  e.occ.push({ s, v: v.id, wi, len: v.words.length, ...teachFacts(e, w, seg, here) });
}

// ---- teaching facts per occurrence (brief 16) ---------------------------------
// Everything here is read off the corpus data of that one occurrence, so the
// sense, form and example shown together on a card always belong together:
//   use   - how the word is used there: the QAC part of speech of its head
//           segment (ما: relative noun / negative particle / interrogative …);
//           for an attached pronoun, its reviewed-table form (object,
//           possessive) on the kind of word it is attached to; for a prefix,
//           its QAC part of speech.
//   usex  - the English for that use there: the Quran.com in-context gloss
//           (whole words), the reviewed-table gloss (attached pronouns) or
//           the QAC prefix gloss (prefixes).
//   form  - verbs: tense + person/gender/number (+ passive) of the QAC tags;
//           nouns and adjectives: number (singular / dual / plural).
//   flabel- that form in the QAC's own description wording.
//   spell - the word as written without attached prefixes or object/possessive
//           endings (a verb keeps its subject ending: قَالُوا).
//   part  - [start, end) of the attached segment inside the written word
//           (UTF-16 offsets), when the segments spell the word exactly.
const MOOD = /,? (indicative|subjunctive|jussive)/g;
const NUMBER_LABEL = { S: 'singular', D: 'dual', P: 'plural' };
function segOffsets(w, seg) {
  const joined = w.segments.map((x) => x.arabic).join('');
  if (joined !== w.arabic) return null;
  let at = 0;
  for (const x of w.segments) {
    if (x === seg) return [at, at + x.arabic.length];
    at += x.arabic.length;
  }
  return null;
}
function hostOf(w, seg) {
  const i = w.segments.indexOf(seg);
  let h = i - 1;
  while (h >= 0 && flagsOf(w.segments[h]).includes('SUFF')) h--;
  return h >= 0 ? w.segments[h] : null;
}
function teachFacts(e, w, seg, here) {
  if (e.kind === 'suffix') {
    const host = hostOf(w, seg);
    return { use: `${seg.pronounForm}|${host?.role ?? '-'}`, usex: seg.gloss ?? null, spell: seg.arabic, part: segOffsets(w, seg) };
  }
  if (e.kind === 'prefix') return { use: seg.pos, usex: seg.gloss ?? null, spell: seg.arabic, part: segOffsets(w, seg) };
  const out = { use: seg.pos, usex: here };
  if (w.segments.length > 1) out.part = segOffsets(w, seg);
  if (seg.type === 'V' && seg.tense) {
    const pass = flagsOf(seg).includes('PASS');
    out.form = `${seg.tense}|${seg.person ?? ''}${seg.gender ?? ''}${seg.number ?? ''}${pass ? '|PASS' : ''}`;
    out.flabel = seg.description.replace(/^Verb — /, '').replace(MOOD, '');
    out.spell = w.segments
      .filter((x) => !x.prefix && (x === seg || (flagsOf(x).includes('SUFF') && flagsOf(x).includes('PRON') && x.glossSource !== 'reviewed-table')))
      .map((x) => x.arabic)
      .join('');
  } else if ((seg.role === 'noun' || seg.role === 'adjective') && seg.number) {
    out.form = seg.number;
    out.flabel = NUMBER_LABEL[seg.number];
    out.spell = seg.arabic;
  }
  return out;
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

// The examples shown under a word's headline meaning use that meaning: they are
// taken from occurrences whose in-context English is the headline one (the
// commonest), so the card never pairs "from" with a verse glossed "among".
// Attached forms and words with several uses get one example per use instead
// (usesOf, below); these stay as a fallback.
function headlineExamples(e) {
  if (e.kind === 'word' || e.kind === 'pronoun') {
    const head = e.ctx.size ? top(e.ctx, 1)[0][0] : null;
    const same = head ? e.occ.filter((o) => (o.usex ?? '').toLowerCase() === head) : [];
    if (same.length) return pickExamples(same);
  }
  return pickExamples(e.occ);
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
    examples: headlineExamples(e),
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
function exampleOf(o) {
  const verse = surahOf(o.s).verses.find((v) => v.id === o.v);
  const ex = {
    ref: `${o.s}:${o.v}`,
    words: verse.words.map((w) => w.arabic),
    hit: o.wi,
    gloss: verse.words[o.wi].gloss ?? null,
    translation: cleanTranslation(verse.translation),
  };
  if (o.part) ex.part = o.part;
  return ex;
}
const groupBy = (occ, k) => {
  const m = new Map();
  for (const o of occ) {
    if (o[k] == null) continue;
    if (!m.has(o[k])) m.set(o[k], []);
    m.get(o[k]).push(o);
  }
  return m;
};
const topOf = (list, k) => {
  const m = new Map();
  for (const o of list) if (o[k]) count(m, o[k]);
  return m.size ? top(m, 1)[0][0] : null;
};
const MIN_USE = 3;
const TENSE_ORDER = { PERF: 0, IMPF: 1, IMPV: 2 };
const HOST_LABEL = { verb: 'verb', noun: 'noun', preposition: 'preposition', particle: 'particle', adjective: 'adjective', pronoun: 'pronoun' };

// Uses: each distinct use with its own English and an example of exactly that use.
function usesOf(e) {
  const groups = [...groupBy(e.occ, 'use')].filter(([, g]) => g.length >= MIN_USE).sort((a, b) => b[1].length - a[1].length);
  if (e.kind === 'suffix') {
    return groups.slice(0, 5).map(([k, g]) => {
      const [form, host] = k.split('|');
      // the example must carry the gloss the use is shown with
      const gloss = topOf(g, 'usex');
      const ex = pickExamples(g.filter((o) => o.usex === gloss))[0];
      const sp = new Map();
      for (const o of g) if (letters(o.spell)) count(sp, `ـ${o.spell}`);
      return { form, host: HOST_LABEL[host] ?? host, gloss, count: g.length, spellings: top(sp, 3), ex: exampleOf(ex) };
    });
  }
  if (groups.length < 2 && e.kind !== 'prefix') return null;
  return groups.slice(0, 6).map(([k, g]) => {
    const gloss = topOf(g, 'usex');
    const ex = pickExamples(gloss ? g.filter((o) => o.usex === gloss) : g)[0];
    return { label: k, gloss, count: g.length, ex: exampleOf(ex) };
  });
}

// Forms: verbs by tense and person/gender/number, nouns by number; each with a real example.
function formsOf(e) {
  const groups = [...groupBy(e.occ, 'form')];
  if (groups.length < 2) return null;
  const isVerb = groups.some(([k]) => k.includes('|'));
  const rows = groups.map(([k, g]) => {
    const spell = topOf(g, 'spell');
    const same = g.filter((o) => o.spell === spell);
    const here = topOf(same, 'usex');
    const ex = pickExamples(here ? same.filter((o) => o.usex === here) : same)[0];
    return { key: k, tense: isVerb ? k.split('|')[0] : null, label: g[0].flabel, spell, count: g.length, here: ex.usex ?? null, ex: exampleOf(ex) };
  });
  if (!isVerb) return rows.sort((a, b) => b.count - a.count).slice(0, 3);
  // up to three forms per tense, tenses in the order perfect, imperfect, imperative
  const out = [];
  for (const t of ['PERF', 'IMPF', 'IMPV']) out.push(...rows.filter((r) => r.tense === t).sort((a, b) => b.count - a.count).slice(0, 3));
  return out.sort((a, b) => TENSE_ORDER[a.tense] - TENSE_ORDER[b.tense] || b.count - a.count);
}

const detailStats = { uses: 0, forms: 0 };
rmSync(join(DATA, 'vocab'), { recursive: true, force: true });
mkdirSync(join(DATA, 'vocab'), { recursive: true });
for (let c = 0; c * CHUNK < entries.length; c++) {
  const chunk = {};
  for (const e of entries.slice(c * CHUNK, (c + 1) * CHUNK)) {
    const src = ranked[e.id - 1];
    const d = { ex: e.examples.map(exampleOf) };
    if (e.kind !== 'initials') {
      const uses = usesOf(src);
      if (uses) {
        d.uses = uses;
        detailStats.uses++;
      }
      const forms = formsOf(src);
      if (forms) {
        d.forms = forms;
        detailStats.forms++;
      }
    }
    chunk[e.id] = d;
  }
  writeFileSync(join(DATA, 'vocab', `ex-${c}.json`), JSON.stringify(chunk));
}

// Root families for root cards: the most frequent words of each root, each with
// its first example verse. 100 roots per file, in frequency order.
const ROOT_CHUNK = 100;
const rootOrder = [...rootStats.entries()].sort((a, b) => b[1].count - a[1].count);
for (let c = 0; c * ROOT_CHUNK < rootOrder.length; c++) {
  const chunk = {};
  for (const [r, st] of rootOrder.slice(c * ROOT_CHUNK, (c + 1) * ROOT_CHUNK)) {
    chunk[r] = st.lemmas.slice(0, 6).map((id) => ({ id, ex: entries[id - 1].examples[0] ? exampleOf(entries[id - 1].examples[0]) : null }));
  }
  writeFileSync(join(DATA, 'vocab', `roots-${c}.json`), JSON.stringify(chunk));
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
  rootChunk: ROOT_CHUNK,
  lemmas: entries.map(({ examples, ...e }) => ({ ...e, refs: examples.map((o) => `${o.s}:${o.v}`) })),
  roots: Object.fromEntries([...rootStats.entries()].sort((a, b) => b[1].count - a[1].count)),
};
writeFileSync(join(DATA, 'vocab.json'), JSON.stringify(out));

// Sanity output: coverage of the top-N whole-word entries.
const words = entries.filter((e) => e.kind !== 'prefix' && e.kind !== 'suffix');
const cov = (n) => words.slice(0, n).reduce((t, e) => t + e.count, 0) / totalWords;
console.log(`vocab: ${entries.length} entries (${JSON.stringify(out.totals.kinds)}), ${rootStats.size} roots, ${totalWords} words (${noEntry} without an entry)`);
console.log(`teaching detail: ${detailStats.uses} entries with uses, ${detailStats.forms} with forms`);
console.log(`attached: ${attachedTotals.prefix} prefixes, ${attachedTotals.suffix} pronoun suffixes`);
console.log(`in-context glosses: ${stripStats.changed} of ${stripStats.glosses} had leading prefix words removed`);
console.log(
  [10, 20, 100, 300, 500, 1000].map((n) => `top ${n}: ${(cov(n) * 100).toFixed(1)}%`).join(' · ') + ` · all: ${(cov(words.length) * 100).toFixed(2)}%`,
);
