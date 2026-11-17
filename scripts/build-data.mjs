// Data pipeline for the Quranic Arabic learning app.
//
// Reads authoritative open datasets and produces clean, per-surah JSON that the
// app consumes. Nothing about the Quran is authored by hand here — the Arabic
// text, the grammar/morphology, and the translation all come from established
// sources, so the app stays trustworthy.
//
// Sources (see scripts/raw/SOURCES.md):
//   - uthmani.json          Uthmani Arabic text per verse        (Tanzil, via risan/quran-json)
//   - english_saheeh.json   Saheeh International translation      (QuranEnc, via risan/quran-json)
//   - chapters.json         Surah metadata                       (risan/quran-json)
//   - quran-morphology.txt  Quranic Arabic Corpus morphology      (mustafa0x/quran-morphology)
//   - wbw-en/<id>.json      word-by-word English gloss           (Quranic Arabic Corpus wording, via Quran.com API v4)
//   - tajweed.hafs.uthmani-pause-sajdah.json + tajweed-quran-uthmani.txt
//                           tajweed rule spans + the text they index (cpfair/quran-tajweed)
//
// Fetch them all with `npm run fetch:data`.
//
// Output:
//   public/data/index.json          list of all 114 surahs (metadata)
//   public/data/surahs/<id>.json    full surah: verses -> words -> grammar segments
//   public/data/legend.json         grammatical roles + descriptions used for colour-coding
//   public/data/tajweed-legend.json tajweed rules, colour groups and descriptions

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ARTICLE_GLOSS, REVIEWED_PRONOUNS, pronounKey } from './reviewed-pronouns.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = join(__dirname, 'raw');
const OUT = join(__dirname, '..', 'public', 'data');
const OUT_SURAHS = join(OUT, 'surahs');

// ---------------------------------------------------------------------------
// Grammatical vocabulary: map the corpus feature codes to readable English.
// ---------------------------------------------------------------------------

const POS_LABEL = {
  N: 'Noun', PN: 'Proper noun', PRON: 'Pronoun', DEM: 'Demonstrative',
  REL: 'Relative noun', T: 'Time adverb', LOC: 'Place adverb',
  V: 'Verb', NV: 'Verbal noun',
  ADJ: 'Adjective', ACT_PCPL: 'Active participle', PASS_PCPL: 'Passive participle',
  VN: 'Verbal noun (masdar)', DET: 'Determiner (the)',
  P: 'Preposition', CONJ: 'Conjunction', SUB: 'Subordinating conjunction',
  ACC: 'Accusative particle', NEG: 'Negative particle', EMPH: 'Emphasis (lām)',
  COND: 'Conditional particle', INTG: 'Interrogative particle', RES: 'Restriction particle',
  CERT: 'Particle of certainty', FUT: 'Future particle', VOC: 'Vocative particle',
  PRO: 'Prohibition particle', ANS: 'Answer particle', INC: 'Inceptive particle',
  REM: 'Resumption particle', CIRC: 'Circumstantial particle', CAUS: 'Causal particle',
  PRP: 'Purpose particle (lām)', AMD: 'Retraction particle', AVR: 'Aversion particle',
  EXP: 'Exceptive particle', EXH: 'Exhortation particle', SUP: 'Supplemental particle',
  INL: 'Quranic initials', ATT: 'Attention particle', RSLT: 'Result particle',
  RET: 'Retraction particle', SUR: 'Surprise particle', EQ: 'Equalization particle',
  COM: 'Comitative (wāw)', DIST: 'Distance particle', ADDR: 'Address particle',
  PREV: 'Preventive particle', INT: 'Explanatory particle', EXL: 'Detail particle',
};

const CASE_LABEL = { NOM: 'nominative', ACC: 'accusative', GEN: 'genitive' };
const MOOD_LABEL = { IND: 'indicative', SUBJ: 'subjunctive', JUS: 'jussive' };
const TENSE_LABEL = { PERF: 'perfect', IMPF: 'imperfect', IMPV: 'imperative' };
const PERSON_LABEL = { 1: '1st person', 2: '2nd person', 3: '3rd person' };
const GENDER_LABEL = { M: 'masculine', F: 'feminine' };
const NUMBER_LABEL = { S: 'singular', D: 'dual', P: 'plural' };

// Role drives the colour-coding. Keep the set small and meaningful.
function roleOf(type, flags) {
  if (flags.has('PN')) return 'proper';
  if (flags.has('PRON') || flags.has('DEM') || flags.has('REL')) return 'pronoun';
  if (flags.has('DET')) return 'determiner';
  if (type === 'V') return 'verb';
  if (flags.has('ADJ')) return 'adjective';
  if (type === 'N') return 'noun';
  if (flags.has('CONJ') || flags.has('COM')) return 'conjunction';
  if (flags.has('P') || flags.has('PRP')) return 'preposition';
  if (flags.has('NEG') || flags.has('PRO') || flags.has('AVR')) return 'negation';
  return 'particle';
}

const ROLE_INFO = {
  verb:        { label: 'Verb', arabic: 'فِعْل', desc: 'An action or state (past, present or command).' },
  noun:        { label: 'Noun', arabic: 'اِسْم', desc: 'A person, place, thing or idea.' },
  proper:      { label: 'Proper noun', arabic: 'عَلَم', desc: 'A specific name, such as Allah or a person or place.' },
  pronoun:     { label: 'Pronoun', arabic: 'ضَمِير', desc: 'Stands in for a noun (he, you, it, this, who).' },
  adjective:   { label: 'Adjective', arabic: 'صِفَة', desc: 'Describes a noun.' },
  preposition: { label: 'Preposition', arabic: 'حَرْف جَرّ', desc: 'Relates words, and puts the following noun in the genitive.' },
  conjunction: { label: 'Conjunction', arabic: 'حَرْف عَطْف', desc: 'Joins words or clauses (and, or, then).' },
  determiner:  { label: 'Determiner', arabic: 'أَل', desc: 'The definite article "the" (al-).' },
  negation:    { label: 'Negation', arabic: 'نَفْي', desc: 'Negates or prohibits.' },
  particle:    { label: 'Particle', arabic: 'حَرْف', desc: 'A function word carrying grammatical meaning.' },
};

// ---------------------------------------------------------------------------
// Parse one morphology segment's feature string into structured data.
// Example feature strings:
//   "P|PREF|LEM:ب"
//   "ROOT:سمو|LEM:اسْم|M|GEN"
//   "IMPF|VF:1|ROOT:عبد|LEM:عَبَدَ|1P|MOOD:IND"
//   "PRON|LEM:إِيّا|2MS"
// ---------------------------------------------------------------------------

function parseAgreement(token) {
  // token like "MS", "MP", "1P", "2MS", "3FP", "D", "F"
  if (!/^[123]?[MF]?[SDP]?$/.test(token) || token === '') return null;
  const out = {};
  for (const ch of token) {
    if ('123'.includes(ch)) out.person = Number(ch);
    else if ('MF'.includes(ch)) out.gender = ch;
    else if ('SDP'.includes(ch)) out.number = ch;
  }
  return Object.keys(out).length ? out : null;
}

function parseSegment(arabic, type, features) {
  const parts = features.split('|');
  const flags = new Set();
  const seg = { arabic, type, flags: [] };

  for (const p of parts) {
    if (p.startsWith('ROOT:')) seg.root = p.slice(5);
    else if (p.startsWith('LEM:')) seg.lemma = p.slice(4);
    else if (p.startsWith('VF:')) seg.verbForm = p.slice(3);
    else if (p.startsWith('MOOD:')) seg.mood = p.slice(5);
    else flags.add(p);
  }

  // Case (NOM/ACC/GEN) — but for particles ACC means an accusative particle,
  // not a case. Only treat as case on nouns.
  if (type === 'N') {
    for (const c of ['NOM', 'ACC', 'GEN']) if (flags.has(c)) { seg.case = c; flags.delete(c); }
  }
  // Tense for verbs
  for (const t of ['PERF', 'IMPF', 'IMPV']) if (flags.has(t)) { seg.tense = t; flags.delete(t); }
  // Verb mood may also appear as bare JUS/SUBJ/IND flag
  for (const m of ['IND', 'SUBJ', 'JUS']) if (flags.has(m)) { seg.mood = m; flags.delete(m); }

  // Agreement tokens (person/gender/number) — only on nouns/pronouns/verbs
  if (type === 'N' || type === 'V') {
    for (const f of [...flags]) {
      const agr = parseAgreement(f);
      if (agr) { Object.assign(seg, agr); flags.delete(f); }
    }
  }

  seg.flags = [...flags];
  seg.role = roleOf(type, flags);

  // Human-readable part of speech
  let posCode = seg.flags.find((f) => POS_LABEL[f] && f !== 'PREF' && f !== 'SUFFIX');
  if (!posCode) posCode = type;
  seg.pos = POS_LABEL[posCode] || POS_LABEL[type] || type;
  seg.prefix = flags.has('PREF');

  // Build an English grammar description
  const bits = [];
  if (seg.tense) bits.push(TENSE_LABEL[seg.tense]);
  if (seg.case) bits.push(CASE_LABEL[seg.case]);
  if (seg.mood && type === 'V') bits.push(MOOD_LABEL[seg.mood]);
  if (seg.person) bits.push(PERSON_LABEL[seg.person]);
  if (seg.gender) bits.push(GENDER_LABEL[seg.gender]);
  if (seg.number) bits.push(NUMBER_LABEL[seg.number]);
  if (flags.has('INDEF')) bits.push('indefinite');
  if (flags.has('PASS')) bits.push('passive');
  seg.description = bits.length ? `${seg.pos} — ${bits.join(', ')}` : seg.pos;

  return seg;
}

// ---------------------------------------------------------------------------
// Load raw files
// ---------------------------------------------------------------------------

// The basmala prefix, built from the source's own 1:1 text so the match is
// exact to the code point. 95 and 97 carry an extra shadda on the bā' in
// Tanzil, which is allowed for and kept exactly as written.
function basmalaPattern(fatiha1) {
  const esc = fatiha1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^(${esc.replace(/^ب/, 'ب\u0651?')}) `);
}

function loadJson(name) { return JSON.parse(readFileSync(join(RAW, name), 'utf8')); }

// ---------------------------------------------------------------------------
// Word-by-word English (Quranic Arabic Corpus glosses, via the Quran.com API).
// Words are keyed "sura:verse:word" — the same numbering as the morphology.
// Before a gloss is attached, the source's own Arabic for that position is
// compared with the morphology word (letters only), so a gloss can never land
// on the wrong word. Any mismatch drops the gloss rather than guessing.
// ---------------------------------------------------------------------------

function skeleton(s) {
  return s
    .normalize('NFC')
    .replace(/[ً-ٰٟۖ-ۭـࣰ-ࣿ‏۞۩]/g, '') // marks, tatweel, signs
    .replace(/[ءٔ]/g, '') // hamza spelling varies (ء vs ـٔ)
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/[ىي]/g, 'ا') // alif maqsura / ya spellings (e.g. ٱفْتَرَىٰهُ vs افْتَرَاهُ)
    .replace(/\s/g, '');
}

// ---------------------------------------------------------------------------
// Per-segment English (Quranic Arabic Corpus only; nothing is authored here).
//
// The QAC has no English gloss for each segment of a word. What it does have:
//  1. Prefixes: its word pages describe each prefixed particle with a fixed
//     "usually translated as …" phrase. These are copied verbatim from the QAC
//     description generator (kaisdukes/quranic-corpus-api,
//     nlg/SummaryGenerator.java, writePrefixDescription). Prefixes it gives no
//     translation for (purpose lām, future sa, the article al-) get none.
//  2. Stems: a short English gloss per lemma (lemmas.txt, ~1,600 lemmas). It is
//     a dictionary sense of the lemma, not a contextual translation.
// Suffixed pronouns have no English in the QAC; see REVIEWED_PRONOUNS below.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Reviewed table (signed off by the project owner, brief 3): standard
// grammatical English equivalents for the definite article and for attached
// object/possessive pronoun suffixes ONLY. These are not interpretation; they
// follow from person, gender and number.
//
// - Which suffixes: only those the QAC v2 morphology lists as an explicit
//   PRON:<features> token on the word. Verb subject markers (e.g. the وا of
//   كَفَرُوا) have no such token and are never glossed.
// - Possessive vs object form, by the host (the segment the suffix attaches to):
//     noun                          -> possessive ("his")
//     verb or preposition           -> object     ("him")
//     place/time adverb (QAC LOC/T tags: مَعَ, عِندَ, قَبْلَ, بَعْدَ …) -> object,
//       since English treats them as prepositions ("with you", "before him")
//       (owner decision, brief 4). The QAC tags these as plain nouns after a
//       preposition (مِن قَبْلِكَ), so a signed-off whitelist of twelve adverb
//       lemmas (brief 5) also routes to object when matched exactly.
//     anything else (inna & sisters, other particles, pronoun hosts)
//                                   -> both       ("his / him")
// ---------------------------------------------------------------------------

// The table itself lives in reviewed-pronouns.mjs, shared with build-vocab.mjs.

// Signed off by the owner (brief 5): exact lemma match, nothing broader, so
// genuine possessives on other nouns (وَجْهَهُۥ "his face") are untouched.
const ADVERB_LEMMAS = new Set([
  'قَبْل', 'بَعْد', 'دُون', 'تَحْت', 'فَوْق', 'خَلْف', 'وَراء', 'بَيْن', 'حَوْل', 'عِند', 'لَدُن', 'قِبَل',
]);

function hostForm(host) {
  if (!host) return 'both';
  if (host.type === 'V') return 'object';
  if (host.type === 'P' && host.flags.includes('P')) return 'object';
  if (host.type === 'N') {
    if (host.flags.some((f) => ['LOC', 'T'].includes(f))) return 'object';
    if (host.lemma && ADVERB_LEMMAS.has(host.lemma)) return 'object';
    if (host.flags.some((f) => ['PRON', 'DEM', 'REL'].includes(f))) return 'both';
    return 'possessive';
  }
  return 'both';
}

const letters = (s) => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');

// [part-of-speech flag, first letter of the prefix lemma or '*'] -> QAC phrase
const QAC_PREFIX_GLOSS = [
  ['INTG', '*', 'is / are / do'],
  ['EQ', '*', 'whether'],
  ['EMPH', '*', 'surely / indeed'],
  ['IMPV', '*', 'let'],
  ['CONJ', '*', 'and'],
  ['REM', '*', 'then / so'],
  ['SUP', '*', 'then / so'],
  ['RSLT', '*', 'then / so'],
  ['CIRC', '*', 'while'],
  ['COM', '*', 'with'],
  ['CAUS', '*', 'then / so'],
  ['P', 'ب', 'with / by'],
  ['P', 'ك', 'like / as'],
  ['P', 'ت', 'by (oath)'],
  ['P', 'و', 'by (oath)'],
  ['P', 'ل', 'for'],
];

function prefixGloss(seg) {
  const first = (seg.lemma || seg.arabic).replace(/[\u064B-\u0652\u0670]/g, '')[0];
  for (const [flag, letter, gloss] of QAC_PREFIX_GLOSS) {
    if (seg.flags.includes(flag) && (letter === '*' || letter === first)) return gloss;
  }
  return null;
}

// Buckwalter (QAC extended) -> Arabic, for matching lemmas between datasets.
const BW = {
  "'": 'ء', '|': 'آ', '>': 'أ', '&': 'ؤ', '<': 'إ', '}': 'ئ', A: 'ا', b: 'ب', p: 'ة', t: 'ت', v: 'ث',
  j: 'ج', H: 'ح', x: 'خ', d: 'د', '*': 'ذ', r: 'ر', z: 'ز', s: 'س', $: 'ش', S: 'ص', D: 'ض', T: 'ط',
  Z: 'ظ', E: 'ع', g: 'غ', _: 'ـ', f: 'ف', q: 'ق', k: 'ك', l: 'ل', m: 'م', n: 'ن', h: 'ه', w: 'و',
  Y: 'ى', y: 'ي', F: 'ً', N: 'ٌ', K: 'ٍ', a: 'َ', u: 'ُ', i: 'ِ', '~': 'ّ', o: 'ْ', '`': 'ٰ', '{': 'ٱ',
  '^': 'ٓ', '#': 'ٔ', ':': 'ۜ', '@': '۟', '"': '۠', '[': 'ۢ', ';': 'ۣ', ',': 'ۥ', '.': 'ۦ', '!': 'ۨ', '-': '۪', '+': '۫', '%': '۬', ']': 'ۭ',
};
const fromBuckwalter = (s) => [...s].map((c) => BW[c] ?? c).join('');

// Consonants only: the two QAC releases spell some lemmas differently (dagger
// vs full alif, hamza seat), which must not block a match; a different lemma
// (e.g. أَم vs مَن) still fails.
const lemmaKey = (s) => skeleton(s).replace(/[اوۥۦ@#\[]/g, '');

function loadLemmaGlosses() {
  const lemFile = join(RAW, 'qac-lemmas.txt');
  const morFile = join(RAW, 'qac-morphology.txt');
  if (!existsSync(lemFile) || !existsSync(morFile)) return null;
  const gloss = new Map();
  for (const line of readFileSync(lemFile, 'utf8').split(/\r?\n/)) {
    const [lem, en] = line.split('\t');
    if (lem && en) gloss.set(lem, en.trim());
  }
  // one line per word, in Quran order: "<prefixes> POS:X LEM:<bw> ... PRON:3MS"
  const lines = readFileSync(morFile, 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const stemLemma = lines.map((l) => l.match(/LEM:(\S+)/)?.[1] ?? null);
  // attached object/possessive pronouns (subject markers have no PRON: token)
  const attachedPron = lines.map((l) => [...l.matchAll(/PRON:(\S+)/g)].map((m) => m[1]));
  return { gloss, stemLemma, attachedPron };
}

// Positions where the two sources spell the same word differently in a way the
// letter skeleton cannot reconcile; each was checked by hand against both texts
// (same position, same word, same gloss) and is accepted explicitly.
//   12:39:1, 12:41:1  يَٰصَىٰحِبَىِ (Tanzil/QAC) vs يَـٰصَـٰحِبَىِ (Quran.com) — "O my two companions"
const VERIFIED_SPELLING_VARIANTS = new Set(['12:39:1', '12:41:1']);

function loadGlosses() {
  const dir = join(RAW, 'wbw-en');
  const byLoc = new Map();
  if (!existsSync(dir)) return byLoc;
  for (let id = 1; id <= 114; id++) {
    const f = join(dir, `${id}.json`);
    if (!existsSync(f)) continue;
    for (const w of JSON.parse(readFileSync(f, 'utf8'))) byLoc.set(w.location, w);
  }
  return byLoc;
}

// ---------------------------------------------------------------------------
// Tajweed (cpfair/quran-tajweed). Annotation offsets refer to a 2017 copy of
// the Tanzil Uthmani text; ours is a later Tanzil encoding that differs only in
// a few code points (tatweel, hamza and small-ya spelling). Each verse is
// aligned character-by-character (LCS) and every span is mapped through that
// alignment. Spans that cannot be mapped cleanly are dropped, never guessed.
// ---------------------------------------------------------------------------

function loadTajweed() {
  const textFile = join(RAW, 'tajweed-quran-uthmani.txt');
  const annFile = join(RAW, 'tajweed.hafs.uthmani-pause-sajdah.json');
  if (!existsSync(textFile) || !existsSync(annFile)) return null;
  const text = new Map();
  for (const line of readFileSync(textFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^(\d+)\|(\d+)\|(.*)$/);
    if (m) text.set(`${m[1]}:${m[2]}`, m[3]);
  }
  const ann = new Map();
  for (const a of JSON.parse(readFileSync(annFile, 'utf8'))) ann.set(`${a.surah}:${a.ayah}`, a.annotations);
  return { text, ann };
}

// For each index in `a`, the matching index in `b` (or -1), via LCS.
function alignChars(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const map = new Int32Array(n).fill(-1);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { map[i] = j; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return map;
}

function mapTajweed(src, ours, spans, stats) {
  if (!spans?.length) return [];
  const a = [...src], b = [...ours];
  const identical = src === ours;
  const map = identical ? null : alignChars(a, b);
  const at = (i) => (identical ? i : map[i]);
  const out = [];
  for (const { start, end, rule } of spans) {
    stats.total++;
    let s, e;
    if (identical) { s = start; e = end; }
    else {
      // start: first char of the span, or (if it was re-encoded) just after
      // the previous matched char; end likewise from the right.
      let k = start;
      while (k < end && at(k) < 0) k++;
      if (k === start) s = at(start);
      else { let p = start - 1; while (p >= 0 && at(p) < 0) p--; s = p >= 0 ? at(p) + 1 : 0; }
      k = end - 1;
      while (k >= start && at(k) < 0) k--;
      if (k === end - 1) e = at(end - 1) + 1;
      else { let q = end; while (q < a.length && at(q) < 0) q++; e = q < a.length ? at(q) : b.length; }
    }
    // Sanity: a non-empty span of about the same length as the original.
    if (!(e > s) || e - s > end - start + 3) { stats.dropped++; continue; }
    out.push([s, e, rule]);
  }
  return out.sort((x, y) => x[0] - y[0] || y[1] - x[1]);
}

const TAJWEED_INFO = {
  hamzat_wasl:          { label: 'Hamzat al-waṣl', arabic: 'همزة الوصل', group: 'silent', desc: 'Connecting hamza: pronounced only when starting from this word, silent when joined to what comes before.' },
  lam_shamsiyyah:       { label: 'Lām shamsiyyah', arabic: 'اللام الشمسية', group: 'silent', desc: 'The lām of "al-" is not pronounced; it merges into the following "sun letter", which is doubled.' },
  silent:               { label: 'Silent letter', arabic: 'حرف لا يُنطق', group: 'silent', desc: 'Written but not pronounced in recitation.' },
  madd_2:               { label: 'Natural madd (2)', arabic: 'مد طبيعي', group: 'madd2', desc: 'Natural prolongation of 2 counts (ḥarakāt).' },
  madd_246:             { label: 'Madd ʿāriḍ / līn (2, 4, 6)', arabic: 'مد عارض / لين', group: 'madd246', desc: 'Prolongation of 2, 4 or 6 counts when stopping on the word.' },
  madd_munfasil:        { label: 'Madd munfaṣil (4–5)', arabic: 'مد منفصل', group: 'madd45', desc: 'Separated madd: a madd letter at the end of a word followed by a hamza at the start of the next; 4–5 counts.' },
  madd_muttasil:        { label: 'Madd muttaṣil (4–5)', arabic: 'مد متصل', group: 'madd45', desc: 'Connected madd: a madd letter followed by a hamza in the same word; 4–5 counts.' },
  madd_6:               { label: 'Madd lāzim (6)', arabic: 'مد لازم', group: 'madd6', desc: 'Necessary madd: prolonged 6 counts.' },
  ghunnah:              { label: 'Ghunnah', arabic: 'غنة', group: 'ghunnah', desc: 'Nasalisation held for about 2 counts, typically on a doubled nūn or mīm.' },
  ikhfa:                { label: 'Ikhfāʾ', arabic: 'إخفاء', group: 'ikhfa', desc: 'Nūn sākinah or tanwīn is partially hidden, with ghunnah, before one of the 15 ikhfāʾ letters.' },
  ikhfa_shafawi:        { label: 'Ikhfāʾ shafawī', arabic: 'إخفاء شفوي', group: 'ikhfa', desc: 'Mīm sākinah is hidden, with ghunnah, before bāʾ.' },
  idghaam_ghunnah:      { label: 'Idghām with ghunnah', arabic: 'إدغام بغنة', group: 'idgham', desc: 'Nūn sākinah or tanwīn merges into the next letter (ي ن م و) with ghunnah.' },
  idghaam_no_ghunnah:   { label: 'Idghām without ghunnah', arabic: 'إدغام بلا غنة', group: 'idghamNo', desc: 'Nūn sākinah or tanwīn merges into the next letter (ل ر) without ghunnah.' },
  idghaam_shafawi:      { label: 'Idghām shafawī', arabic: 'إدغام شفوي', group: 'idgham', desc: 'Mīm sākinah merges into a following mīm, with ghunnah.' },
  idghaam_mutajanisayn: { label: 'Idghām mutajānisayn', arabic: 'إدغام متجانسين', group: 'idghamNo', desc: 'Merging of two letters that share a point of articulation but differ in qualities.' },
  idghaam_mutaqaribayn: { label: 'Idghām mutaqāribayn', arabic: 'إدغام متقاربين', group: 'idghamNo', desc: 'Merging of two letters that are close in articulation and qualities.' },
  iqlab:                { label: 'Iqlāb', arabic: 'إقلاب', group: 'iqlab', desc: 'Nūn sākinah or tanwīn becomes a hidden mīm, with ghunnah, before bāʾ.' },
  qalqalah:             { label: 'Qalqalah', arabic: 'قلقلة', group: 'qalqalah', desc: 'An echoing bounce on a sākin ق ط ب ج د.' },
};

function loadMorphology() {
  const text = readFileSync(join(RAW, 'quran-morphology.txt'), 'utf8');
  // key: "sura:verse" -> ordered list of words, each word = list of segments
  const byVerse = new Map();
  let wordIndex = -1;
  let lastWord = '';
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const [loc, arabic, type, features = ''] = line.split('\t');
    const [s, v, w] = loc.split(':').map(Number);
    const vk = `${s}:${v}`;
    if (!byVerse.has(vk)) byVerse.set(vk, new Map());
    const words = byVerse.get(vk);
    if (!words.has(w)) words.set(w, []);
    if (`${vk}:${w}` !== lastWord) { wordIndex++; lastWord = `${vk}:${w}`; }
    const seg = parseSegment(arabic, type, features);
    Object.defineProperty(seg, '_word', { value: wordIndex, enumerable: false });
    words.get(w).push(seg);
  }
  return byVerse;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function run() {
  if (!existsSync(join(RAW, 'quran-morphology.txt'))) {
    console.error('Raw datasets not found in scripts/raw/. See scripts/raw/SOURCES.md');
    process.exit(1);
  }
  mkdirSync(OUT_SURAHS, { recursive: true });

  const chapters = loadJson('chapters.json').chapters;
  const uthmani = loadJson('uthmani.json');      // { "1": [ {chapter,verse,text}, ... ] }
  const saheeh = loadJson('english_saheeh.json'); // { "1": [ {chapter,verse,text,footnotes}, ... ] }
  const morph = loadMorphology();
  const glosses = loadGlosses();
  const tajweed = loadTajweed();
  const lemmaGlosses = loadLemmaGlosses();
  if (!lemmaGlosses) console.warn('No QAC v2 lemma data in scripts/raw/ — segment stem glosses skipped.');
  const segStats = { prefix: 0, prefixNone: 0, stem: 0, stemNone: 0, stemMismatch: 0, suffix: 0, mismatchSamples: [] };
  if (!glosses.size) console.warn('No word-by-word gloss data (scripts/raw/wbw-en/) — glosses skipped.');
  if (!tajweed) console.warn('No tajweed data in scripts/raw/ — tajweed skipped.');

  const index = [];
  let totalWords = 0;
  let alignWarnings = 0;
  const glossStats = { attached: 0, missing: 0, mismatched: [] };
  const tajStats = { total: 0, dropped: 0, verses: 0 };
  let basmalaCount = 0;
  const pronStats = { possessive: 0, object: 0, both: 0, article: 0, unmatched: [] };

  for (const ch of chapters) {
    const id = ch.id;
    const arVerses = uthmani[String(id)];
    const enVerses = saheeh[String(id)];
    const verses = [];
    let bismillah = null;

    for (const av of arVerses) {
      const vno = av.verse;
      const en = enVerses.find((x) => x.verse === vno) || {};
      const words = morph.get(`${id}:${vno}`) || new Map();
      // Tanzil prefixes the basmala to verse 1 of every surah except 1 and 9.
      // In the Ḥafṣ numbering it is not part of that verse (the morphology and
      // the translation both start after it), so it is split off and shown as
      // the surah's opening line instead.
      let text = av.text;
      let cut = 0;
      if (vno === 1 && id !== 1) {
        const m = text.match(basmalaPattern(uthmani['1'][0].text));
        if (m) {
          bismillah = m[1];
          cut = [...m[0]].length;
          text = text.slice(m[0].length);
        }
      }
      const displayWords = text.trim().split(/\s+/);

      const wordList = [];
      const positions = [...words.keys()].sort((a, b) => a - b);
      // When the Uthmani display text splits into the same number of words as
      // the morphology, show the exact Uthmani word; otherwise fall back to the
      // word reconstructed from its own segments, so each chip always matches
      // its own grammar.
      const aligned = positions.length > 0 && displayWords.length === positions.length;
      for (const pos of positions) {
        const segs = words.get(pos);
        const reconstructed = segs.map((s) => s.arabic).join('');
        const display = aligned ? (displayWords[pos - 1] || reconstructed) : reconstructed;
        // Stem segment: the one carrying the root/lemma, else the last.
        const stem = segs.find((s) => s.root) || segs.find((s) => s.lemma) || segs[segs.length - 1];
        const word = {
          position: pos,
          arabic: display,
          root: stem?.root || null,
          lemma: stem?.lemma || null,
          role: stem?.role || segs[0]?.role || 'particle',
          segments: segs,
        };
        // Attached pronouns: the last N PRON suffixes, N = QAC v2 PRON: tokens.
        if (lemmaGlosses) {
          const v2 = lemmaGlosses.attachedPron[segs[0]._word] || [];
          const sufIdx = segs.map((sg, i) => (sg.flags.includes('PRON') && sg.flags.includes('SUFF') ? i : -1)).filter((i) => i >= 0);
          if (v2.length > sufIdx.length) pronStats.unmatched.push(`${id}:${vno}:${pos}`);
          else {
            const take = sufIdx.slice(sufIdx.length - v2.length);
            take.forEach((si, k) => {
              const seg = segs[si];
              const ours = pronounKey(`${seg.person ?? ''}${seg.gender ?? ''}${seg.number ?? ''}`);
              const theirs = pronounKey(v2[k].replace(/^([123])[MF]([DP])$/, '$1$2'));
              const entry = ours && REVIEWED_PRONOUNS[ours];
              if (!entry || ours !== theirs || !entry[2].test(letters(seg.arabic))) {
                pronStats.unmatched.push(`${id}:${vno}:${pos} ${seg.arabic} ${ours}/${v2[k]}`);
                return;
              }
              let h = si - 1;
              while (h >= 0 && segs[h].flags.includes('SUFF')) h--;
              const form = hostForm(segs[h]);
              seg.gloss = form === 'possessive' ? entry[0] : form === 'object' ? entry[1] : entry[0] === entry[1] ? entry[0] : `${entry[0]} / ${entry[1]}`;
              seg.glossSource = 'reviewed-table';
              seg.pronounForm = form;
              pronStats[form]++;
            });
          }
        }

        // Per-segment English from the QAC (see QAC_PREFIX_GLOSS / loadLemmaGlosses).
        for (const seg of segs) {
          if (seg.gloss) continue;
          if (seg.prefix && seg.flags.includes('DET')) {
            seg.gloss = ARTICLE_GLOSS;
            seg.glossSource = 'reviewed-table';
            pronStats.article++;
          } else if (seg.prefix) {
            const pg = prefixGloss(seg);
            if (pg) { seg.gloss = pg; seg.glossSource = 'qac-prefix'; segStats.prefix++; } else segStats.prefixNone++;
          } else if (seg.flags.includes('SUFF')) {
            segStats.suffix++;
          } else if (lemmaGlosses && seg.lemma) {
            const bw = lemmaGlosses.stemLemma[seg._word];
            const en = bw && lemmaGlosses.gloss.get(bw);
            if (!en) segStats.stemNone++;
            else if (lemmaKey(fromBuckwalter(bw)) !== lemmaKey(seg.lemma)) { segStats.stemMismatch++; segStats.mismatchSamples.push(`${id}:${vno}:${pos} ${fromBuckwalter(bw)}≠${seg.lemma}`); }
            else { seg.gloss = en; seg.glossSource = 'qac-lemma'; segStats.stem++; }
          }
        }
        const g = glosses.get(`${id}:${vno}:${pos}`);
        if (!g?.gloss) glossStats.missing++;
        else if (skeleton(g.text) !== skeleton(reconstructed) && !VERIFIED_SPELLING_VARIANTS.has(`${id}:${vno}:${pos}`)) glossStats.mismatched.push(`${id}:${vno}:${pos}`);
        else {
          word.gloss = g.gloss.trim();
          if (g.translit) word.translit = g.translit.trim();
          glossStats.attached++;
        }
        wordList.push(word);
      }
      if (positions.length && displayWords.length !== positions.length) alignWarnings++;
      totalWords += wordList.length;

      const verse = {
        id: vno,
        arabic: text,
        translation: (en.text || '').replace(/^\(\d+\)\s*/, ''),
        footnotes: en.footnotes || '',
        words: wordList,
      };
      if (tajweed) {
        const src = tajweed.text.get(`${id}:${vno}`);
        if (src != null) {
          // [start, end, rule] in code-point offsets into `arabic`
          const spans = mapTajweed(src, av.text, tajweed.ann.get(`${id}:${vno}`), tajStats);
          verse.tajweed = cut
            ? spans.filter(([s]) => s >= cut).map(([s, e, r]) => [s - cut, e - cut, r])
            : spans;
          if (src !== av.text) tajStats.verses++;
        }
      }
      verses.push(verse);
    }

    const meta = {
      id,
      name: ch.name,
      transliteration: ch.transliteration,
      translation: ch.translation,
      type: ch.type,
      totalVerses: ch.total_verses,
    };
    index.push(meta);
    if (bismillah) basmalaCount++;
    writeFileSync(
      join(OUT_SURAHS, `${id}.json`),
      JSON.stringify({ ...meta, ...(bismillah ? { bismillah } : {}), verses }),
    );
  }

  writeFileSync(join(OUT, 'index.json'), JSON.stringify(index));
  writeFileSync(join(OUT, 'legend.json'), JSON.stringify(ROLE_INFO, null, 2));
  if (tajweed) writeFileSync(join(OUT, 'tajweed-legend.json'), JSON.stringify(TAJWEED_INFO, null, 2));

  console.log(`Built ${index.length} surahs, ${totalWords} words.`);
  console.log(`Basmala split from verse 1 in ${basmalaCount} surahs.`);
  console.log(`Word/segment alignment warnings: ${alignWarnings} verses (display-split vs morphology grouping).`);
  console.log(
    `Glosses: ${glossStats.attached} attached, ${glossStats.missing} missing, ` +
      `${glossStats.mismatched.length} dropped (Arabic mismatch)` +
      (glossStats.mismatched.length ? `: ${glossStats.mismatched.slice(0, 10).join(', ')}` : ''),
  );
  console.log(
    `Segment glosses: prefixes ${segStats.prefix} (none in QAC: ${segStats.prefixNone}); ` +
      `stems ${segStats.stem} (no QAC lemma gloss: ${segStats.stemNone}, lemma mismatch: ${segStats.stemMismatch}); ` +
      `suffixes ${segStats.suffix} (QAC gives none).` +
      (segStats.mismatchSamples.length ? ` Dropped e.g.: ${segStats.mismatchSamples.slice(0, 8).join(', ')}` : ''),
  );
  console.log(
    `Reviewed table: article ${pronStats.article}; attached pronouns ${pronStats.possessive} possessive, ` +
      `${pronStats.object} object, ${pronStats.both} both; ${pronStats.unmatched.length} left blank` +
      (pronStats.unmatched.length ? `: ${pronStats.unmatched.slice(0, 8).join(', ')}` : ''),
  );
  if (tajweed)
    console.log(
      `Tajweed: ${tajStats.total - tajStats.dropped}/${tajStats.total} spans kept ` +
        `(${tajStats.dropped} dropped; ${tajStats.verses} verses re-aligned to this text encoding).`,
    );
}

run();
