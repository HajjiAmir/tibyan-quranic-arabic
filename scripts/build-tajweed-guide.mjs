// Builds public/data/tajweed-guide.json: the teaching legend for the tajweed colours.
//
//   node scripts/build-tajweed-guide.mjs        (npm run build:tajweed-guide)
//
// For each rule it stores
//   - a short beginner explanation, summarised from the cited references below
//     (each entry names its sources; nothing here is a ruling of our own), and
//   - a real example taken from the tajweed-coloured verse data already in
//     public/data/surahs (cpfair/quran-tajweed spans over the Tanzil text): the
//     word or words the rule's span covers, with the span offsets, so the app
//     colours exactly the letters the classifier marked. No Arabic is typed here.
//   - how many times the classifier marks the rule in the whole Qur'an.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'public', 'data');

const SRC = {
  tajwidEn: { title: 'Wikipedia, “Tajwid” (citing K. Nelson, The Art of Reciting the Qur’an, 2001)', url: 'https://en.wikipedia.org/wiki/Tajwid' },
  sunMoon: { title: 'Wikipedia, “Sun and moon letters”', url: 'https://en.wikipedia.org/wiki/Sun_and_moon_letters' },
  hamzaWasl: { title: 'Wikipedia (Arabic), “همزة الوصل”', url: 'https://ar.wikipedia.org/wiki/همزة_الوصل' },
  madd: { title: 'Wikipedia (Arabic), “أحكام المد” (citing Ghāyat al-Murīd; Nihāyat al-Qawl al-Mufīd; Qawāʿid al-Tajwīd)', url: 'https://ar.wikipedia.org/wiki/أحكام_المد' },
  idgham: { title: 'Wikipedia (Arabic), “إدغام” (citing Ghāyat al-Murīd; Nihāyat al-Qawl al-Mufīd)', url: 'https://ar.wikipedia.org/wiki/إدغام' },
  ghunnah: { title: 'Wikipedia (Arabic), “غنة” (citing Ghāyat al-Murīd)', url: 'https://ar.wikipedia.org/wiki/غنة' },
  hidayah: {
    title: 'al-Marṣafī, Hidāyat al-Qāri, on letters kept in the Uthmani script but not read (Islamweb library)',
    url: 'https://www.islamweb.net/ar/library/content/231/84/',
  },
  cpfair: { title: 'cpfair/quran-tajweed rule list (counts per madd type)', url: 'https://github.com/cpfair/quran-tajweed' },
};

// Beginner explanations: what the rule is, then what the reciter does.
const GUIDE = {
  hamzat_wasl: {
    what: 'A connecting hamza at the start of some words.',
    how: 'If you begin reading at this word, pronounce it. If you join the word to the one before, it drops out and the sound runs straight on.',
    sources: ['hamzaWasl', 'tajwidEn'],
  },
  lam_shamsiyyah: {
    what: 'The lām of “al-” before a “sun letter”.',
    how: 'The lām is written but not said: it blends into the next letter, which you pronounce doubled.',
    sources: ['sunMoon', 'tajwidEn'],
  },
  silent: {
    what: 'A letter kept in the written muṣḥaf that is not part of the recitation.',
    how: 'Read past it. It is not pronounced, whether you carry on or stop.',
    sources: ['hidayah'],
  },
  madd_2: {
    what: 'The natural lengthening of a long vowel (alif, wāw or yāʾ of madd) with no hamza or sukūn after it.',
    how: 'Hold the long vowel for 2 counts.',
    sources: ['madd', 'tajwidEn'],
  },
  madd_246: {
    what: 'A long vowel, or a wāw or yāʾ sākinah after a fatḥah (līn), followed by a letter that becomes silent only because you stop on the word, as at the end of an āyah.',
    how: 'When stopping, you may hold it for 2, 4 or 6 counts.',
    sources: ['madd', 'cpfair'],
  },
  madd_munfasil: {
    what: 'A long vowel ends one word and the next word begins with a hamza.',
    how: 'In Ḥafṣ it may be held 4 or 5 counts (shortening to 2 is also transmitted). The colouring here follows the 4–5 reading.',
    sources: ['madd', 'cpfair'],
  },
  madd_muttasil: {
    what: 'A long vowel followed by a hamza in the same word.',
    how: 'In Ḥafṣ, hold it for 4 or 5 counts.',
    sources: ['madd', 'cpfair'],
  },
  madd_6: {
    what: 'The necessary madd: a long vowel followed by a letter with a shaddah or a lasting sukūn.',
    how: 'Always hold it for 6 counts, whether you carry on or stop.',
    sources: ['madd', 'tajwidEn'],
  },
  ghunnah: {
    what: 'A nasal hum that resonates in the nose. This colour marks a doubled nūn or mīm (with shaddah).',
    how: 'Hold the doubled nūn or mīm with that nasal sound for 2 counts.',
    sources: ['ghunnah', 'tajwidEn'],
  },
  ikhfa: {
    what: 'A nūn sākinah or tanwīn before one of the fifteen letters not covered by the other nūn rules.',
    how: 'Do not fully pronounce the n. Hide it in a nasal hum (ghunnah, about 2 counts), then move to the next letter.',
    sources: ['tajwidEn', 'ghunnah'],
  },
  ikhfa_shafawi: {
    what: 'A mīm sākinah followed by bāʾ.',
    how: 'Do not close the lips fully on the mīm; carry it with ghunnah into the bāʾ.',
    sources: ['tajwidEn'],
  },
  idghaam_ghunnah: {
    what: 'A nūn sākinah or tanwīn followed by ي ن م or و.',
    how: 'Merge the n completely into that next letter, keeping the nasal hum (ghunnah) as you do.',
    sources: ['tajwidEn', 'ghunnah'],
  },
  idghaam_no_ghunnah: {
    what: 'A nūn sākinah or tanwīn followed by ل or ر.',
    how: 'Merge the n completely into the ل or ر, with no nasal hum.',
    sources: ['tajwidEn'],
  },
  idghaam_shafawi: {
    what: 'A mīm sākinah followed by another mīm.',
    how: 'The two become one doubled mīm, held with ghunnah.',
    sources: ['tajwidEn'],
  },
  idghaam_mutajanisayn: {
    what: 'Two letters made at the same point in the mouth but with different qualities (such as ت, ط and د).',
    how: 'When the first is sākin, merge it into the second.',
    sources: ['idgham'],
  },
  idghaam_mutaqaribayn: {
    what: 'Two letters made at nearby points in the mouth.',
    how: 'Merge the first into the second.',
    sources: ['idgham'],
  },
  iqlab: {
    what: 'A nūn sākinah or tanwīn followed by bāʾ.',
    how: 'Turn the n into a mīm sound, lips not fully closed, held with ghunnah, then say the bāʾ.',
    sources: ['tajwidEn', 'ghunnah'],
  },
  qalqalah: {
    what: 'One of the five letters ق ط ب ج د when it is sākin.',
    how: 'Release it with a slight bounce or echo so it is heard clearly, not swallowed.',
    sources: ['tajwidEn'],
  },
};

// Rules whose example needs the following word (the cause is in the next word),
// or the previous word (the hamza drops when joined to it).
const WITH_NEXT = new Set(['madd_munfasil', 'ikhfa', 'ikhfa_shafawi', 'iqlab', 'idghaam_ghunnah', 'idghaam_no_ghunnah', 'idghaam_shafawi', 'idghaam_mutajanisayn', 'idghaam_mutaqaribayn']);
const WITH_PREV = new Set(['hamzat_wasl']);
// Rules that only apply on a stop: take the example from the āyah's last word.
const AT_END = new Set(['madd_246']);

// Prefer the surahs most readers know: Al-Fātiḥa, then Juzʾ ʿAmma from the end, then the rest.
const ORDER = [1, ...Array.from({ length: 37 }, (_, i) => 114 - i), ...Array.from({ length: 76 }, (_, i) => 2 + i)];

const legend = JSON.parse(readFileSync(join(DATA, 'tajweed-legend.json'), 'utf8'));
const surahs = new Map(ORDER.map((id) => [id, JSON.parse(readFileSync(join(DATA, 'surahs', `${id}.json`), 'utf8'))]));

// Word boundaries in code points (the tajweed offsets are code-point offsets).
function words(chars) {
  const out = [];
  let s = -1;
  for (let i = 0; i <= chars.length; i++) {
    const sp = i === chars.length || chars[i] === ' ';
    if (!sp && s < 0) s = i;
    if (sp && s >= 0) { out.push([s, i]); s = -1; }
  }
  return out;
}

const counts = {};
for (const s of surahs.values()) for (const v of s.verses) for (const [, , r] of v.tajweed ?? []) counts[r] = (counts[r] ?? 0) + 1;

function exampleFor(rule) {
  let best = null;
  for (const id of ORDER) {
    for (const v of surahs.get(id).verses) {
      const spans = (v.tajweed ?? []).filter((x) => x[2] === rule);
      if (!spans.length) continue;
      const chars = Array.from(v.arabic);
      const ws = words(chars);
      for (const [s, e] of spans) {
        let a = ws.findIndex(([ws0, we]) => s >= ws0 && s < we);
        let b = ws.findIndex(([ws0, we]) => e - 1 >= ws0 && e - 1 < we);
        if (a < 0 || b < 0) continue;
        if (AT_END.has(rule) && b !== ws.length - 1) continue;
        if (WITH_NEXT.has(rule) && b + 1 < ws.length && e >= ws[b][1] - 2) b++;
        if (WITH_PREV.has(rule) && a > 0) a--;
        const from = ws[a][0];
        const to = ws[b][1];
        const nWords = b - a + 1;
        // Shortest snippet wins within the preferred surah order: stop at the first good one.
        if (to - from > 28) continue;
        const marks = spans.filter(([x, y]) => x >= from && y <= to).map(([x, y]) => [x - from, y - from]);
        best = { surah: id, verse: v.id, text: chars.slice(from, to).join(''), marks, words: nWords };
        return best;
      }
    }
  }
  return best;
}

const out = { note: 'Explanations summarise the cited references for beginners; examples and counts come from the cpfair/quran-tajweed spans on the Tanzil text.', sources: SRC, rules: {} };
for (const [rule, g] of Object.entries(GUIDE)) {
  const info = legend[rule];
  if (!info) throw new Error(`No legend entry for ${rule}`);
  const ex = exampleFor(rule);
  if (!ex) console.warn(`No example found for ${rule}`);
  out.rules[rule] = { ...g, label: info.label, arabic: info.arabic, group: info.group, count: counts[rule] ?? 0, example: ex };
}
writeFileSync(join(DATA, 'tajweed-guide.json'), JSON.stringify(out, null, 1));
for (const [r, x] of Object.entries(out.rules)) console.log(r.padEnd(22), String(x.count).padStart(6), x.example ? `${x.example.surah}:${x.example.verse}  ${x.example.text}  ${JSON.stringify(x.example.marks)}` : '—');
