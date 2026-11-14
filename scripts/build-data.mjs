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
//
// Output:
//   public/data/index.json          list of all 114 surahs (metadata)
//   public/data/surahs/<id>.json    full surah: verses -> words -> grammar segments
//   public/data/legend.json         grammatical roles + descriptions used for colour-coding

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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

function loadJson(name) { return JSON.parse(readFileSync(join(RAW, name), 'utf8')); }

function loadMorphology() {
  const text = readFileSync(join(RAW, 'quran-morphology.txt'), 'utf8');
  // key: "sura:verse" -> ordered list of words, each word = list of segments
  const byVerse = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const [loc, arabic, type, features = ''] = line.split('\t');
    const [s, v, w] = loc.split(':').map(Number);
    const vk = `${s}:${v}`;
    if (!byVerse.has(vk)) byVerse.set(vk, new Map());
    const words = byVerse.get(vk);
    if (!words.has(w)) words.set(w, []);
    words.get(w).push(parseSegment(arabic, type, features));
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

  const index = [];
  let totalWords = 0;
  let alignWarnings = 0;

  for (const ch of chapters) {
    const id = ch.id;
    const arVerses = uthmani[String(id)];
    const enVerses = saheeh[String(id)];
    const verses = [];

    for (const av of arVerses) {
      const vno = av.verse;
      const en = enVerses.find((x) => x.verse === vno) || {};
      const words = morph.get(`${id}:${vno}`) || new Map();
      const displayWords = av.text.trim().split(/\s+/);

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
        wordList.push({
          position: pos,
          arabic: display,
          root: stem?.root || null,
          lemma: stem?.lemma || null,
          role: stem?.role || segs[0]?.role || 'particle',
          segments: segs,
        });
      }
      if (positions.length && displayWords.length !== positions.length) alignWarnings++;
      totalWords += wordList.length;

      verses.push({
        id: vno,
        arabic: av.text,
        translation: (en.text || '').replace(/^\(\d+\)\s*/, ''),
        footnotes: en.footnotes || '',
        words: wordList,
      });
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
    writeFileSync(join(OUT_SURAHS, `${id}.json`), JSON.stringify({ ...meta, verses }));
  }

  writeFileSync(join(OUT, 'index.json'), JSON.stringify(index));
  writeFileSync(join(OUT, 'legend.json'), JSON.stringify(ROLE_INFO, null, 2));

  console.log(`Built ${index.length} surahs, ${totalWords} words.`);
  console.log(`Word/segment alignment warnings: ${alignWarnings} verses (display-split vs morphology grouping).`);
}

run();
