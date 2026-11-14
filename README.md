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
- **Tajweed** — cpfair/quran-tajweed (automated rule annotation, ḥafṣ ʿan ʿāṣim)

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

- Per-surah context and authentic hadith on virtues (sourced and cited only)
- Per-verse audio recitation
- Bookmarks, a cross-surah practice deck and a progress dashboard
