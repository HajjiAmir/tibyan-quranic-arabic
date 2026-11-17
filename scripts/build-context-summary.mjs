// Builds public/data/context-summary.json from the built context files, so the
// surah list can show what each surah's Context & Tafsir / Virtues & Hadith holds
// without loading all 114 files. Counts only; nothing new is written.
//   node scripts/build-context-summary.mjs   (also run at the end of build:context)
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');
const out = {};
for (let id = 1; id <= 114; id++) {
  const c = JSON.parse(readFileSync(join(DATA, 'context', `${id}.json`), 'utf8'));
  out[id] = {
    tafsir: Boolean(c.context.period || c.context.theme),
    virtues: c.virtues.filter((v) => v.kind === 'virtue').length,
    practice: c.virtues.filter((v) => v.kind === 'practice').length,
  };
}
writeFileSync(join(DATA, 'context-summary.json'), JSON.stringify(out));
console.log('context-summary.json:', Object.values(out).filter((x) => x.virtues + x.practice).length, 'surahs with narrations');
