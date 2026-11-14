# Tibyān — Quranic Arabic

A tool for learning and mastering Quranic Arabic. Tap any word in any verse to
see its grammar, root, lemma and form — colour-coded by its role in the
sentence — alongside the Uthmani text and an English translation.

Covers all **114 surahs / 6,236 verses**, built on authoritative open datasets
rather than hand-entered text.

## Data sources

Nothing about the Qur'an is authored by hand in this app. See
[`scripts/raw/SOURCES.md`](scripts/raw/SOURCES.md).

- **Arabic text (Uthmani)** — the Tanzil project
- **Grammar / morphology** — the Quranic Arabic Corpus (part of speech, root,
  lemma, case, mood and agreement for every word segment)
- **Translation** — Saheeh International

## Develop

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
```

The pre-generated data lives in `public/data/` and is committed, so the app
builds and runs without the raw datasets. To regenerate it (after editing the
pipeline or updating a source), restore the raw files per
`scripts/raw/SOURCES.md` and run:

```bash
npm run build:data
```

## Structure

```
scripts/build-data.mjs   data pipeline (raw datasets -> public/data)
public/data/             generated per-surah JSON the app fetches
src/pages/               Home (surah library) and Reader
src/components/          Verse, GrammarPanel, GrammarLegend
src/lib/                 data loading, theme, progress
```

## Roadmap

- Tajweed rule highlighting
- Per-surah context, wisdom and authentic hadith on virtues
- Word-by-word English gloss
- Self-test / quiz mode
