// Builds public/data/glossary.json (brief 17): the plain-language grammar glossary.
// Wording and sources come from scripts/glossary-text.mjs. Each entry's example is a
// real word of the Qur'an found in the app's own data (public/data/surahs), shown with
// its Quranic Arabic Corpus word-by-word English, so nothing is hand-written Qur'an text.
// Examples come from the surahs a learner meets first: Al-Fatiha, then the short surahs
// of the last part (114 down to 78), then the rest in order. Within a surah the simplest
// word (fewest parts) that carries the term wins.

import fs from 'node:fs';
import path from 'node:path';
import { SOURCES, TERMS } from './glossary-text.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SURAHS = path.join(ROOT, 'public/data/surahs');
const OUT = path.join(ROOT, 'public/data/glossary.json');

const order = [1, ...Array.from({ length: 114 - 78 + 1 }, (_, i) => 114 - i), ...Array.from({ length: 77 - 2 + 1 }, (_, i) => i + 2)];
const surahs = order.map((n) => JSON.parse(fs.readFileSync(path.join(SURAHS, `${n}.json`), 'utf8')));

const featuresOf = (seg) => {
  const [pos, rest] = (seg.description ?? '').split(' — ');
  return { pos, feats: new Set(rest ? rest.split(', ') : []) };
};

function matches(m, seg) {
  const { pos, feats } = featuresOf(seg);
  if (m.pos) return pos === m.pos;
  if (m.feature) return feats.has(m.feature);
  if (m.form) return seg.verbForm === String(m.form);
  if (m.role) return seg.role === m.role && !seg.prefix && !(seg.flags ?? []).includes('SUFF');
  if (m.flag) return (seg.flags ?? []).includes(m.flag);
  return false;
}

function inVerse(m, ref) {
  const [sn, vn] = ref.split(':').map(Number);
  const s = surahs.find((x) => x.id === sn);
  const v = s?.verses.find((x) => x.id === vn);
  const w = v?.words.find((x) => x.gloss && (x.segments ?? []).some((seg) => matches(m, seg)));
  if (!w) throw new Error(`preferred example ${ref} has no word matching ${JSON.stringify(m)}`);
  return { ref, arabic: w.arabic, gloss: w.gloss };
}

function exampleFor(m, prefer) {
  if (!m) return undefined;
  if (prefer) return inVerse(m, prefer);
  for (const s of surahs) {
    let best = null;
    for (const v of s.verses) {
      for (const w of v.words) {
        if (!w.gloss || !(w.segments ?? []).some((seg) => matches(m, seg))) continue;
        const parts = w.segments.length;
        if (!best || parts < best.parts) best = { parts, ex: { ref: `${s.id}:${v.id}`, arabic: w.arabic, gloss: w.gloss } };
      }
    }
    if (best) return best.ex;
  }
  return undefined;
}

const terms = {};
const aliases = {};
const key = (l) => l.trim().toLowerCase();
const missing = [];

for (const t of TERMS) {
  const example = exampleFor(t.match, t.prefer);
  if (t.match && !example) missing.push(t.label);
  terms[t.id] = {
    id: t.id,
    label: t.label,
    ...(t.arabic ? { arabic: t.arabic } : {}),
    plain: t.plain,
    short: t.short,
    ...(example ? { example } : {}),
    sources: t.sources.map((s) => {
      if (!SOURCES[s]) throw new Error(`unknown source ${s} in ${t.id}`);
      return SOURCES[s];
    }),
  };
  for (const l of [t.label, ...(t.aliases ?? [])]) {
    if (aliases[key(l)] && aliases[key(l)] !== t.id) throw new Error(`alias ${l} used twice`);
    aliases[key(l)] = t.id;
  }
}

// Every term the data shows must have an entry.
const shown = new Set();
for (const s of surahs) for (const v of s.verses) for (const w of v.words) for (const seg of w.segments ?? []) {
  const { pos, feats } = featuresOf(seg);
  shown.add(pos);
  feats.forEach((f) => shown.add(f));
  if (seg.verbForm) shown.add(`form ${seg.verbForm}`);
}
const unexplained = [...shown].filter((l) => l && !aliases[key(l)]);
if (unexplained.length) throw new Error(`no glossary entry for: ${unexplained.join(', ')}`);

fs.writeFileSync(OUT, JSON.stringify({ terms, aliases }));
console.log(`glossary: ${Object.keys(terms).length} terms, ${Object.keys(aliases).length} labels -> ${path.relative(ROOT, OUT)}`);
if (missing.length) console.log(`no example found for: ${missing.join(', ')}`);
