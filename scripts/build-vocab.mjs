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
// Attached prefixes (wa-, fa-, bi-, li-, al-) and pronoun suffixes are not
// counted as separate words. Words with no lemma in the corpus (independent
// pronouns, the disjoined letters) stay in the total but have no entry.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
let noLemma = 0;

for (let s = 1; s <= 114; s++) {
  const surah = JSON.parse(readFileSync(join(DATA, 'surahs', `${s}.json`), 'utf8'));
  for (const v of surah.verses) {
    for (let wi = 0; wi < v.words.length; wi++) {
      const w = v.words[wi];
      totalWords++;
      const seg = head(w);
      if (!seg) {
        noLemma++;
        continue;
      }
      let e = lemmas.get(seg.lemma);
      if (!e) {
        e = {
          lemma: seg.lemma,
          roots: new Map(),
          roles: new Map(),
          pos: new Map(),
          forms: new Map(),
          meaning: new Map(),
          ctx: new Map(),
          ctxRaw: new Map(),
          desc: new Map(),
          occ: [],
        };
        lemmas.set(seg.lemma, e);
      }
      if (seg.root) count(e.roots, seg.root);
      count(e.roles, seg.role);
      count(e.pos, seg.pos);
      if (seg.verbForm) count(e.forms, seg.verbForm);
      if (seg.glossSource === 'qac-lemma' && seg.gloss) count(e.meaning, seg.gloss);
      if (w.gloss) {
        count(e.ctx, w.gloss.toLowerCase());
        count(e.ctxRaw, w.gloss);
      }
      count(e.desc, `${w.arabic}\u0000${seg.description}`);
      e.occ.push({ s, v: v.id, wi, len: v.words.length });
    }
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

const ranked = [...lemmas.values()].sort((a, b) => b.occ.length - a.occ.length || a.lemma.localeCompare(b.lemma));

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
  return {
    id,
    lemma: e.lemma,
    root,
    role,
    content: CONTENT_ROLES.has(role),
    pos: top(e.pos, 3),
    form: e.forms.size ? top(e.forms, 1)[0][0] : null,
    meaning: e.meaning.size ? top(e.meaning, 1)[0][0] : null,
    // Variants differing only in capitals are counted together (word-by-word
    // glosses capitalise sentence starts); each shows its most common spelling.
    inContext: top(e.ctx, 3).map(([g]) => top(new Map([...e.ctxRaw].filter(([r]) => r.toLowerCase() === g)), 1)[0][0]),
    sample: { arabic: sampleArabic, description: sampleDesc },
    count: e.occ.length,
    examples: pickExamples(e.occ),
  };
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
    'Frequency index of Quranic lemmas (head lemma per word occurrence). Lemmas, roots, parts of speech and dictionary glosses: Quranic Arabic Corpus. In-context glosses: Quran.com word-by-word. Built by scripts/build-vocab.mjs.',
  totals: {
    words: totalWords,
    withLemma: totalWords - noLemma,
    noLemma,
    lemmas: entries.length,
    roots: rootStats.size,
  },
  chunk: CHUNK,
  lemmas: entries.map(({ examples, ...e }) => ({ ...e, refs: examples.map((o) => `${o.s}:${o.v}`) })),
  roots: Object.fromEntries([...rootStats.entries()].sort((a, b) => b[1].count - a[1].count)),
};
writeFileSync(join(DATA, 'vocab.json'), JSON.stringify(out));

// Sanity output: coverage of the top-N lemmas.
const cov = (n) => entries.slice(0, n).reduce((t, e) => t + e.count, 0) / totalWords;
console.log(`vocab: ${entries.length} lemmas, ${rootStats.size} roots, ${totalWords} words (${noLemma} without a lemma)`);
console.log(
  [10, 20, 100, 300, 500, 1000].map((n) => `top ${n}: ${(cov(n) * 100).toFixed(1)}%`).join(' · '),
);
