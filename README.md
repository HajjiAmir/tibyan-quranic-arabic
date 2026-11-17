# Tibyān — Quranic Arabic

A tool for learning and mastering Quranic Arabic. Tap any word in any verse to
see its English meaning, grammar, root, lemma and form — colour-coded by its
role in the sentence — alongside the Uthmani text (with optional tajweed
highlighting) and an English translation. A Practice mode drills word meanings
and grammar with spaced-repetition flashcards and quizzes.

Covers all **114 surahs / 6,236 verses**, built on authoritative open datasets
rather than hand-entered text.

## Data sources

Nothing about the Qur'an is authored by hand in this app. See
[`scripts/raw/SOURCES.md`](scripts/raw/SOURCES.md).

- **Arabic text (Uthmani)** — the Tanzil project
- **Grammar / morphology** — the Quranic Arabic Corpus (part of speech, root,
  lemma, case, mood and agreement for every word segment)
- **Translation** — Saheeh International
- **Word-by-word English** — Quranic Arabic Corpus glosses, via the Quran.com API
- **Per-segment English** — Quranic Arabic Corpus prefix glosses and lemma glosses
  (where the corpus has them; see SOURCES.md)
- **Tajweed** — cpfair/quran-tajweed (automated rule annotation, ḥafṣ ʿan ʿāṣim)
- **Vocabulary mastery** — a frequency index of every Quranic lemma, computed by
  `scripts/build-vocab.mjs` from the Quranic Arabic Corpus data above (head
  lemma per word; 4,769 lemmas, 1,651 roots over 77,429 words). Learn path,
  whole-Qur'an practice and a coverage dashboard at `#/learn`
- **Context & Virtues** (approved by the owner; no formal scholarly review) — virtue narrations
  from sunnah.com's *Special Virtues of the Qur'an's Chapters and Verses*, with
  wording and gradings from each narration's sunnah.com page, cross-checked with
  HadeethEnc; context quoted from Mawdūdī's *Tafhīm al-Qurʾān* via Quran.com, with
  revelation data from Tanzil. Audit sheet: `docs/context-review.md`

Typography: Amiri Quran for the Qur'an text, self-hosted (SIL OFL), no font CDN.

## Develop

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
```

The pre-generated data lives in `public/data/` and is committed, so the app
builds and runs without the raw datasets. To regenerate it (after editing the
pipeline or updating a source), download the raw files and rebuild:

```bash
npm run fetch:data   # raw datasets -> scripts/raw/ (see SOURCES.md)
npm run build:data   # scripts/raw/ -> public/data/
```

## Structure

```
scripts/fetch-raw.mjs    downloads the raw datasets
scripts/build-data.mjs   data pipeline (raw datasets -> public/data)
public/data/             generated per-surah JSON the app fetches
src/pages/               Home (surah library), Reader, Practice
src/components/          Verse, GrammarPanel, GrammarLegend, TajweedText, TajweedLegend
src/lib/                 data loading, theme, progress, practice (spaced repetition)
```

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via
`.github/workflows/deploy.yml`. Relative `base` + HashRouter mean the static
build works from any path.

## Roadmap

- Bookmarks, a cross-surah practice deck and a progress dashboard
