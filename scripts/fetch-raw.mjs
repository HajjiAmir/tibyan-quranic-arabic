// Downloads every raw dataset the pipeline needs into scripts/raw/.
// Run once (or whenever a source should be refreshed), then `npm run build:data`.
// See scripts/raw/SOURCES.md for what each file is and where it comes from.
//
//   node scripts/fetch-raw.mjs            fetch anything missing
//   node scripts/fetch-raw.mjs --force    re-fetch everything

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = join(__dirname, 'raw');
const FORCE = process.argv.includes('--force');

const QAC_V2 = '17a9062416eccc332111ef3e84f74072d709e187';

const FILES = [
  // Tanzil Uthmani text, Saheeh International translation, surah metadata
  ['uthmani.json', 'https://raw.githubusercontent.com/risan/quran-json/main/data/tanzil/uthmani.json'],
  ['english_saheeh.json', 'https://raw.githubusercontent.com/risan/quran-json/main/data/quranenc/english_saheeh.json'],
  ['chapters.json', 'https://raw.githubusercontent.com/risan/quran-json/main/data/tanzil/chapters.json'],
  // Quranic Arabic Corpus morphology
  ['quran-morphology.txt', 'https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt'],
  ['morphology-terms-ar.json', 'https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/morphology-terms-ar.json'],
  // Tajweed annotations (cpfair/quran-tajweed, CC BY 4.0) and the exact Tanzil
  // text file their character offsets refer to.
  ['tajweed.hafs.uthmani-pause-sajdah.json', 'https://raw.githubusercontent.com/cpfair/quran-tajweed/master/output/tajweed.hafs.uthmani-pause-sajdah.json'],
  ['tajweed-quran-uthmani.txt', 'https://github.com/cpfair/quran-tajweed/files/7281388/quran-uthmani.txt'],
  // Quranic Arabic Corpus v2 (kaisdukes/quranic-corpus-api), pinned commit:
  // per-lemma English glosses and the per-word morphology (Buckwalter) used to
  // join them to our words.
  ['qac-lemmas.txt', `https://raw.githubusercontent.com/kaisdukes/quranic-corpus-api/${QAC_V2}/src/main/resources/data/lemmas.txt`],
  ['qac-morphology.txt', `https://raw.githubusercontent.com/kaisdukes/quranic-corpus-api/${QAC_V2}/src/main/resources/data/morphology.txt`],
];

async function get(url, as = 'text') {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'tibyan-data-pipeline' } });
    if (res.ok) return as === 'json' ? res.json() : res.text();
    if (attempt >= 4) throw new Error(`${res.status} ${url}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
}

async function fetchFiles() {
  for (const [name, url] of FILES) {
    const dest = join(RAW, name);
    if (existsSync(dest) && !FORCE) continue;
    process.stdout.write(`fetch ${name} ... `);
    writeFileSync(dest, await get(url));
    console.log('ok');
  }
}

// Word-by-word English (Quran.com API v4). Saved per surah, keeping only the
// fields the pipeline uses: location, Uthmani text, gloss, transliteration.
async function fetchWbw() {
  const dir = join(RAW, 'wbw-en');
  mkdirSync(dir, { recursive: true });
  for (let id = 1; id <= 114; id++) {
    const dest = join(dir, `${id}.json`);
    if (existsSync(dest) && !FORCE) continue;
    const words = [];
    for (let page = 1; ; page++) {
      const url =
        `https://api.quran.com/api/v4/verses/by_chapter/${id}` +
        `?language=en&words=true&word_fields=text_uthmani,location&per_page=50&page=${page}`;
      const data = await get(url, 'json');
      for (const v of data.verses) {
        for (const w of v.words) {
          if (w.char_type_name !== 'word') continue; // skip verse-end markers
          words.push({
            location: w.location,
            text: w.text_uthmani,
            gloss: w.translation?.text ?? null,
            translit: w.transliteration?.text ?? null,
          });
        }
      }
      if (!data.pagination?.next_page) break;
    }
    writeFileSync(dest, JSON.stringify(words));
    process.stdout.write(`wbw ${id} `);
  }
  console.log();
}

mkdirSync(RAW, { recursive: true });
await fetchFiles();
await fetchWbw();
console.log('Raw datasets ready in scripts/raw/.');
