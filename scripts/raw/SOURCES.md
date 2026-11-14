# Raw data sources

Every piece of Qur'anic content in Tibyān comes from one of the datasets below.
Nothing is typed in by hand. The raw files are not committed (they are large and
re-downloadable); fetch them all with:

```bash
npm run fetch:data   # downloads into scripts/raw/
npm run build:data   # regenerates public/data/
```

| File | What it is | Source | Licence / terms |
|---|---|---|---|
| `uthmani.json` | Uthmani Arabic text, per verse | [Tanzil](https://tanzil.net) via [risan/quran-json](https://github.com/risan/quran-json) (`data/tanzil/uthmani.json`) | Tanzil terms of use (verbatim copies, attribution, link to tanzil.net) |
| `english_saheeh.json` | Saheeh International translation + footnotes | [QuranEnc](https://quranenc.com) via risan/quran-json (`data/quranenc/english_saheeh.json`) | QuranEnc terms |
| `chapters.json` | Surah metadata (names, type, verse counts) | risan/quran-json (`data/tanzil/chapters.json`) | CC BY-SA 4.0 |
| `quran-morphology.txt` | Morphology for every word segment (POS, root, lemma, case, mood, agreement) | [Quranic Arabic Corpus](https://corpus.quran.com) via [mustafa0x/quran-morphology](https://github.com/mustafa0x/quran-morphology) | GNU GPL (Quranic Arabic Corpus) |
| `morphology-terms-ar.json` | Arabic grammar terms | mustafa0x/quran-morphology | as above |
| `wbw-en/<id>.json` | Word-by-word English gloss + transliteration, keyed `surah:verse:word` | [Quran.com API v4](https://api-docs.quran.foundation/) (`/verses/by_chapter/<id>?words=true`). The English gloss wording is the Quranic Arabic Corpus word-by-word translation (checked against corpus.quran.com, e.g. 2:4 matches word for word) | Quran.com / Quranic Arabic Corpus terms |
| `tajweed.hafs.uthmani-pause-sajdah.json` | Tajweed rule spans `{rule, start, end}` per verse (ḥafṣ ʿan ʿāṣim) | [cpfair/quran-tajweed](https://github.com/cpfair/quran-tajweed) (`output/`). Also mirrored by [semarketir/quranjson](https://github.com/semarketir/quranjson) `source/tajweed/` with identical offsets | CC BY 4.0 |
| `tajweed-quran-uthmani.txt` | The exact 2017 Tanzil Uthmani text the tajweed offsets index into | cpfair/quran-tajweed ([quran-uthmani.txt](https://github.com/cpfair/quran-tajweed/files/7281388/quran-uthmani.txt)) | Tanzil terms of use |

## How the sources are joined (and checked)

- **Basmala.** Tanzil prefixes the basmala to verse 1 of every surah except 1
  and 9. In the Ḥafṣ numbering it is not part of that verse (the morphology and
  the translation both start after it), so the pipeline splits it off into the
  surah's `bismillah` field, exactly as written (95 and 97 carry a shadda on the
  bā'). This also brought the display-text vs morphology word-count mismatches
  down from 116 verses to 4 (2:181, 8:6, 13:37, 37:130), which keep the
  reconstructed-from-segments fallback.
- **Glosses** are attached by `surah:verse:word` position, and only after the
  Quran.com word's own Arabic is compared (letters only) with the morphology
  word at that position. All 77,429 positions match; two (12:39:1, 12:41:1) are
  the same word in a different spelling and are accepted explicitly in
  `VERIFIED_SPELLING_VARIANTS` with a comment.
- **Tajweed** offsets refer to the 2017 Tanzil text; ours is a later Tanzil
  encoding (tatweel, hamza and small-yā differences in 309 verses). Each such
  verse is aligned character-by-character and every span is mapped through the
  alignment; spans that cannot be mapped are dropped. Currently 60,057 / 60,057
  spans map, and every re-mapped span covers the same letters as the original.
  The tajweed annotations come from an automated classifier (decision trees),
  not a hand-checked muṣḥaf. The app says so next to the colour key.
