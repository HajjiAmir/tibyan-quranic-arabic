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
| `qac-lemmas.txt` | Short English gloss per lemma (1,595 lemmas) | Quranic Arabic Corpus v2, [kaisdukes/quranic-corpus-api](https://github.com/kaisdukes/quranic-corpus-api) `src/main/resources/data/lemmas.txt`, pinned at commit `17a9062` | Quranic Arabic Corpus (the repo has no licence file; QAC data is GNU GPL) |
| `qac-morphology.txt` | Per-word morphology (Buckwalter), used only to join lemma glosses to our words by position | same repo, `data/morphology.txt`, same commit | as above |
| `tajweed.hafs.uthmani-pause-sajdah.json` | Tajweed rule spans `{rule, start, end}` per verse (ḥafṣ ʿan ʿāṣim) | [cpfair/quran-tajweed](https://github.com/cpfair/quran-tajweed) (`output/`). Also mirrored by [semarketir/quranjson](https://github.com/semarketir/quranjson) `source/tajweed/` with identical offsets | CC BY 4.0 |
| `tajweed-quran-uthmani.txt` | The exact 2017 Tanzil Uthmani text the tajweed offsets index into | cpfair/quran-tajweed ([quran-uthmani.txt](https://github.com/cpfair/quran-tajweed/files/7281388/quran-uthmani.txt)) | Tanzil terms of use |

## How the sources are joined (and checked)

- **Per-segment English.** The Quranic Arabic Corpus has *no* English gloss for
  each segment of a word: corpus.quran.com and the QAC v2 API (`TokenResponse`)
  carry one `translation` per word, and segments carry none. What the QAC does
  provide, and what the app shows:
  - *Prefixes:* the QAC's own "usually translated as …" phrase, copied verbatim
    from its description generator (`nlg/SummaryGenerator.java`,
    `writePrefixDescription`), e.g. wa (conjunction) "and", bi "with / by",
    ka "like / as", la (emphatic) "surely / indeed". Prefixes it gives no
    translation for (purpose lām, future sa, the article al-) show nothing.
  - *Stems:* the QAC v2 lemma gloss, joined by word position and only when the
    lemma matches ours (consonants compared, since the two QAC releases spell
    some lemmas differently). 27,520 stems glossed; 62 dropped where the two
    releases disagree on the lemma. Many common lemmas (e.g. عَبْد, اسْم,
    رَبّ) have no gloss in this file yet, so their stems show nothing.
  - *Suffixed pronouns:* the QAC gives grammatical features only (e.g. "third
    person masculine singular"), no English, so they show nothing.

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

## Fonts

Self-hosted from npm (Fontsource), all SIL Open Font License 1.1: **Amiri Quran**
(Quran text), **Amiri** (Arabic titles), **Scheherazade New** (small Arabic
labels), **Inter** and **Lora** (Latin).
