// Builds public/data/context/<id>.json (surah context and authentic virtue
// narrations) and docs/context-review.md (the sheet for the scholarly reviewer).
//
// Nothing here is typed by hand: hadith wording and grades are copied from the
// saved sunnah.com pages, context excerpts are quoted verbatim from the saved
// Quran.com chapter introductions, and revelation data comes from Tanzil.
// scripts/context-curation.json only says which narration belongs to which
// surah, and why anything from the backbone collection was left out.
//
// Every entry is written with verified: false. When the owner's reviewer signs
// off, set REVIEW below to 'approved' (and fill in who and when) and rebuild:
// the reader then drops the draft banner.

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'scripts/raw/context');
const OUT = join(ROOT, 'public/data/context');

const REVIEW = { status: 'pending', reviewer: null, date: null };

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const curation = read(join(ROOT, 'scripts/context-curation.json'));
const collection = read(join(RAW, 'sunnah-virtues-collection.json'));
const pages = read(join(RAW, 'sunnah-hadith-pages.json')).res;
const henc = read(join(RAW, 'hadeethenc-records.json'));
const index = read(join(ROOT, 'public/data/index.json'));

const fail = (msg) => {
  console.error(`build-context: ${msg}`);
  process.exit(1);
};

// ---------------------------------------------------------------- Tanzil
// quran-data.js: Sura[n] = [start, ayas, revelationOrder, rukus, name, tname, ename, type]
const tanzilJs = readFileSync(join(RAW, 'tanzil-quran-data.js'), 'utf8');
const suraBlock = tanzilJs.slice(tanzilJs.indexOf('QuranData.Sura'), tanzilJs.indexOf('QuranData.Juz'));
const tanzil = [...suraBlock.matchAll(/\[\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*'([^']*)',\s*"([^"]*)",\s*'([^']*)',\s*'(\w+)'\]/g)].map(
  (m) => ({ ayas: +m[2], order: +m[3], tname: m[6], type: m[8].toLowerCase() }),
);
if (tanzil.length !== 114) fail(`expected 114 suras in Tanzil metadata, got ${tanzil.length}`);
tanzil.forEach((t, i) => {
  const meta = index[i];
  if (meta.totalVerses !== t.ayas || meta.type !== t.type)
    fail(`Tanzil metadata disagrees with index.json for surah ${i + 1}`);
});

// ---------------------------------------------------------------- Quran.com chapter info (Mawdudi)
const ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, n) => ENTITIES[n] ?? m);
const plain = (html) => decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function sections(html) {
  const parts = html.split(/<h2>(.*?)<\/h2>/);
  const out = [];
  for (let i = 1; i < parts.length; i += 2) {
    const paras = [...parts[i + 1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => plain(m[1])).filter(Boolean);
    out.push({ heading: plain(parts[i]), paras });
  }
  return out;
}

// Whole sentences from the start of a paragraph, verbatim, up to ~420 chars.
const ABBREV = /\b(?:vv?|e\.g|i\.e|cf|ch|no|nos|p|pp|vol|st|mr|dr|viz|A\.H|C\.E|B\.C|Hadrat)\.$/i;
function excerpt(para, min = 200, max = 420) {
  const sentences = [];
  let start = 0;
  const re = /[.!?]["”’)]?(?=\s+["“(‘]?[A-Z0-9])/g;
  for (let m; (m = re.exec(para)); ) {
    const end = m.index + m[0].length;
    const s = para.slice(start, end);
    if (ABBREV.test(s.slice(-8))) continue;
    sentences.push(s.trim());
    start = end;
  }
  if (start < para.length) sentences.push(para.slice(start).trim());
  let text = '';
  let used = 0;
  for (const s of sentences) {
    if (text && (text.length >= min || text.length + s.length + 1 > max)) break;
    text = text ? `${text} ${s}` : s;
    used++;
  }
  return { text, truncated: used < sentences.length };
}

// A narration relayed inside an introduction: quoted speech, "X reported /
// stated that ...", or a citation of a hadith or tafsir collection. Context
// never shows one, since its grading is not established here.
const REPORTS = new RegExp(
  [
    String.raw`\b(?:said|says|asked|replied|answered|declared|exclaimed)\b[^."“]{0,40}[:,]?\s*["“]`,
    String.raw`\b(?:report(?:s|ed)?|narrat(?:es|ed)|relat(?:es|ed)|ha(?:s|ve) (?:stated|stated that|said)|states that|transmitted)\b`,
    String.raw`\((?:[^)]*\b(?:Bukhari|Muslim|Tirmidhi|Tabarani|Ahmad|Abu Da'?w?ud|Nasa'?i|Ibn Majah|Hakim|Baihaqi|Bayhaqi|Ibn Jarir|Ibn Abi Hatim|Ibn Mardu?y?ah|Musnad|Mustadrak)\b[^)]*)\)`,
  ].join('|'),
  'i',
);
const PERIOD_HEADINGS = [/period of revelation|time of revelation|when and why|periods? of revelation/i, /historical background|^background$|occasion of revelation/i];
const THEME_HEADINGS = [/theme|subject|topics|central/i];
const pick = (secs, patterns) => {
  for (const p of patterns) {
    const s = secs.find((x) => p.test(x.heading) && x.paras.length);
    if (s) return s;
  }
  return null;
};

function contextFor(id) {
  const info = read(join(RAW, 'quran-com-info', `${id}.json`)).chapter_info;
  if (info.chapter_id !== id || !/Maududi/.test(info.source)) fail(`unexpected chapter info for ${id}`);
  const secs = sections(info.text);
  const url = `https://quran.com/${id}/info`;
  const source = { name: "Sayyid Abul A'la Mawdudi, Tafhim al-Qur'an (introduction to the surah)", via: 'Quran.com', url };
  // The first paragraph that stands on its own: not a lead-in ending in a
  // colon, and whose quoted excerpt relays no narration.
  const flags = [];
  const quote = (s, label) => {
    if (!s) {
      flags.push(`No ${label} section in this introduction.`);
      return null;
    }
    let skipped = false;
    for (const p of s.paras) {
      if (p.length < 60 || /[:;]\s*-?\s*$/.test(p)) continue;
      const ex = excerpt(p);
      if (REPORTS.test(ex.text)) {
        skipped = true;
        continue;
      }
      return { heading: s.heading, ...ex, source };
    }
    flags.push(
      skipped
        ? `The ${label} section relays narrations, so no excerpt is quoted.`
        : `No quotable ${label} paragraph in this introduction.`,
    );
    return null;
  };
  const period = quote(pick(secs, PERIOD_HEADINGS), 'period-of-revelation');
  const theme = quote(pick(secs, THEME_HEADINGS), 'theme');

  const t = tanzil[id - 1];
  if (period) {
    const all = secs.filter((s) => PERIOD_HEADINGS.some((p) => p.test(s.heading))).flatMap((s) => s.paras).join(' ');
    const mecca = /\bMakk(?:ah|an)\b|\bMecca/i.test(all);
    const medina = /\bMadin(?:ah|an)\b|\bMedin/i.test(all);
    if (t.type === 'meccan' && medina && !mecca)
      flags.push('For the reviewer: the period section mentions Madinah but not Makkah; Tanzil lists this surah as Meccan.');
    if (t.type === 'medinan' && mecca && !medina)
      flags.push('For the reviewer: the period section mentions Makkah but not Madinah; Tanzil lists this surah as Medinan.');
  }
  return {
    revelation: {
      type: t.type,
      order: t.order,
      source: { name: 'Tanzil Quran metadata (classification and revelation order)', url: 'https://tanzil.net/docs/quran_metadata' },
    },
    period,
    theme,
    flags,
    verified: false,
  };
}

// ---------------------------------------------------------------- hadith
const COLLECTIONS = {
  bukhari: 'Sahih al-Bukhari',
  muslim: 'Sahih Muslim',
  tirmidhi: "Jami' at-Tirmidhi",
  nasai: "Sunan an-Nasa'i",
  abudawud: 'Sunan Abi Dawud',
  ibnmajah: 'Sunan Ibn Majah',
};
const SAHIHAYN = new Set(['bukhari', 'muslim']);
const ws = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

// sunnah.com's virtues collection, section name -> surah ids.
const SECTION_SURAHS = {
  'Sūrat Al-Fātihah': [1], 'Sūrat al-Baqarah': [2], 'Sūrat Āl-‘Imrān': [3], 'Sūrat Al-Nisā': [4],
  'Sūrat Al-An’ām': [6], 'Sūrat Al-Isrā': [17], 'Sūrat Al-Kahf': [18], 'Sūrat Tāha': [20],
  'Sūrat As-Sajdah': [32], 'Sūrat Yāsīn': [36], 'Sūrat Az-Zumar': [39], 'Sūrat Al-Fatḥ': [48],
  'Sūrat Qāf': [50], 'Sūrat Al-Qamar': [54], 'Sūrat Ar-Raḥmān': [55],
  'Sūrahs Al-Jumu’ah and Al Munāfiqūn': [62, 63], 'Sūrat Al-Mulk': [67], 'Sūrat Al-Insān': [76],
  'Sūrahs At-Takwīr, Al-Infitār, al-Inshiqāq': [81, 82, 84], 'Sūrat Al-A’lā': [87],
  'Sūrat Al-Ghāshiyah': [88], 'Sūrat Az-Zalzalah': [99], 'Sūrat Al-‘Asr': [103],
  'Sūrat Al-Kāfirūn': [109], 'Sūrat Al-Ikhlāṣ': [112],
  'Sūrahs Al-Falaq and Al-Nās (al-Mu’awwidhatān)': [113, 114],
};
const items = collection.hadith.map((h, i) => {
  const surahs = SECTION_SURAHS[h.surah];
  if (!surahs) fail(`unknown collection section "${h.surah}"`);
  return { ...h, n: i + 1, surahs };
});
if (items.length !== 93) fail(`expected 93 collection items, got ${items.length}`);

const REF_PATTERNS = [
  [/Sahih al-Bukhari (\d+\w?)/g, 'bukhari'], [/Sahih Muslim (\d+\w?)/g, 'muslim'],
  [/Jami` at-Tirmidhi (\d+\w?)/g, 'tirmidhi'], [/Sunan an-Nasa'i (\d+\w?)/g, 'nasai'],
  [/Sunan Abi Dawud (\d+\w?)/g, 'abudawud'], [/Sunan [Ii]bn Majah (\d+\w?)/g, 'ibnmajah'],
];
const ALIAS = { 'muslim:804': 'muslim:804a' };
const refsOf = (s) =>
  REF_PATTERNS.flatMap(([re, c]) => [...(s ?? '').matchAll(re)].map((m) => ALIAS[`${c}:${m[1]}`] ?? `${c}:${m[1]}`));

// Every collection item must be either used or explicitly held back.
const includedRefs = new Set(curation.include.map((e) => e.ref));
const heldItems = new Set(curation.heldBack.flatMap((h) => h.items));
for (const it of items) {
  const used = refsOf(it.ref).some((r) => includedRefs.has(r));
  if (!used && !heldItems.has(it.n)) fail(`collection item ${it.n} (${it.ref}) is neither included nor held back`);
}

function gradeOf(ref, item) {
  const col = ref.split(':')[0];
  if (SAHIHAYN.has(col)) {
    return { label: 'Sahih', by: `Included in ${COLLECTIONS[col]}`, source: 'collection' };
  }
  const row = item.grades.find((r) => /^Grade/.test(r[0]));
  const m = row && row[1].match(/^(Sahih|Hasan|Hasan Sahih|Da'if|Daif|Maudu)[^(]*\(([^)]+)\)/i);
  if (!m) fail(`${ref}: no named grade on sunnah.com`);
  const label = m[1];
  if (!/^(Sahih|Hasan|Hasan Sahih)$/i.test(label)) fail(`${ref}: graded ${label}; only sahih/hasan may be shown`);
  return { label, by: m[2], source: 'sunnah.com' };
}

function hadithEntry(e, surahId) {
  const page = pages[e.ref];
  if (!page || page.status !== 200 || page.items?.length !== 1) fail(`${e.ref}: page missing`);
  const it = page.items[0];
  const col = e.ref.split(':')[0];
  if (!COLLECTIONS[col]) fail(`${e.ref}: unknown collection`);
  const reference = ws(it.refs.find((r) => r.startsWith('Reference'))?.split(' : ')[1]);
  const inBook = ws(it.refs.find((r) => r.startsWith('In-book reference'))?.split(' : ')[1]) || null;
  const en = [ws(it.narrated), ws(it.en)].filter(Boolean).join(' ');
  if (!en || !it.arFull) fail(`${e.ref}: text missing`);
  const matn = ws(it.arText.join(' ')).replace(/^[\s"\u200f\u200e]+|[\s"\u200f\u200e]+$/g, '');

  // The collection's heading for this narration under this surah.
  let heading = null;
  if (!e.noHeading) {
    const own =
      items.find((x) => x.surahs.includes(surahId) && refsOf(x.ref).includes(e.ref)) ??
      items.find((x) => x.n === e.item);
    if (own) heading = { en: own.chap, ar: own.chapAr, item: own.n };
  }
  const hid = curation.hadeethenc[e.ref];
  const h = hid ? henc[hid] : null;
  if (hid && !h) fail(`${e.ref}: HadeethEnc record ${hid} not saved`);
  const grade = gradeOf(e.ref, it);
  return {
    id: e.ref,
    kind: e.kind,
    heading,
    collection: COLLECTIONS[col],
    reference,
    inBook,
    en,
    ar: ws(it.arFull),
    arMatn: matn.length > 12 ? matn : null,
    grade,
    crossCheck: h
      ? {
          name: 'HadeethEnc (Hadith Encyclopedia)',
          grade: h.grade,
          gradeAr: h.grade_ar,
          attribution: h.attribution,
          url: `https://hadeethenc.com/en/browse/hadith/${hid}`,
        }
      : null,
    sources: [
      { name: `sunnah.com — ${reference}`, url: `https://sunnah.com/${e.ref}` },
      ...(heading
        ? [{ name: `sunnah.com — Special Virtues of the Qur'an's Chapters and Verses ${heading.item}`, url: `https://sunnah.com/virtues:${heading.item}` }]
        : []),
    ],
    note: e.note ?? null,
    verified: false,
  };
}

// ---------------------------------------------------------------- write
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const KIND_ORDER = { virtue: 0, practice: 1 };
const summary = [];
for (let id = 1; id <= 114; id++) {
  const virtues = curation.include
    .filter((e) => e.surahs.includes(id))
    .map((e) => hadithEntry(e, id))
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  const doc = {
    surah: id,
    review: { ...REVIEW, note: 'Draft pending scholarly review. Every entry is unverified until the reviewer signs off.' },
    context: contextFor(id),
    virtues,
  };
  writeFileSync(join(OUT, `${id}.json`), `${JSON.stringify(doc, null, 1)}\n`);
  summary.push({ id, name: index[id - 1].transliteration, virtues, context: doc.context });
}

// ---------------------------------------------------------------- reviewer sheet
const md = [];
md.push('# Context & Virtues — review sheet', '');
md.push(`Generated by \`scripts/build-context.mjs\`. Status: **${REVIEW.status}**. Every entry below is unverified until the reviewer signs off.`, '');
md.push('Inclusion rule: a narration is shown only if it is in Sahih al-Bukhari or Sahih Muslim, or sunnah.com grades it Sahih or Hasan and names the grader, with no conflicting weak grade. Where HadeethEnc has the same hadith, its grade is recorded as a cross-check.', '');
md.push('## Surahs with narrations', '');
for (const s of summary.filter((x) => x.virtues.length)) {
  md.push(`### ${s.id}. ${s.name}`, '');
  for (const v of s.virtues) {
    const cc = v.crossCheck ? `; HadeethEnc: ${v.crossCheck.grade} ([record](${v.crossCheck.url}))` : '';
    md.push(`- [ ] **${v.reference}** (${v.kind}) — ${v.grade.label}, ${v.grade.by}${cc}. [sunnah.com](https://sunnah.com/${v.id})${v.heading ? ` · collection heading: “${v.heading.en}”` : ''}${v.note ? `  \n  _Note:_ ${v.note}` : ''}`);
  }
  md.push('');
}
md.push('## Held back from the backbone collection', '');
for (const h of curation.heldBack) md.push(`- Items ${h.items.join(', ')} — ${h.ref}: ${h.reason}`);
md.push('', '## Context flags', '');
const flagged = summary.filter((s) => s.context.flags.length);
for (const s of flagged) md.push(`- ${s.id}. ${s.name}: ${s.context.flags.join(' ')}`);
md.push('');
mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(join(ROOT, 'docs/context-review.md'), md.join('\n'));

const withV = summary.filter((s) => s.virtues.length);
console.log(`context: 114 surahs written; ${withV.length} with narrations (${withV.map((s) => s.id).join(', ')}).`);
console.log(`narrations: ${curation.include.length} distinct; held back groups: ${curation.heldBack.length}; context flags: ${flagged.length}`);
console.log(readdirSync(OUT).length, 'files in public/data/context');
