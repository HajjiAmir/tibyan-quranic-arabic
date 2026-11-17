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
  - *The article and attached pronouns* use a small **reviewed table** of
    standard grammatical equivalents, signed off by the project owner (brief 3):
    al- = "the"; attached pronouns by person/number/gender (1S my/me, 1P our/us,
    2nd person your/you, 3MS his/him, 3FS her, 3rd dual/plural their/them).
    Only suffixes the QAC v2 morphology lists as an explicit `PRON:` token are
    glossed, so verb subject markers (e.g. the وا of كَفَرُوا) never are; each
    one's features must agree in both QAC releases and its spelling must fit
    the pronoun. Form by host: noun = possessive; verb, preposition, or a host the
    QAC tags as a place/time adverb (LOC/T: مَعَ, عِندَ, حَوْلَ…) = object
    (brief 4); particles (إِنَّ etc.) and pronoun hosts = both forms. The QAC
    tags adverbs as plain nouns after a preposition (مِن قَبْلِكَ), so a
    signed-off whitelist (brief 5) also gives the object form when the host's
    lemma is exactly one of: قَبْل، بَعْد، دُون، تَحْت، فَوْق، خَلْف، وَراء، بَيْن،
    حَوْل، عِند، لَدُن، قِبَل. Current counts: 8,377 articles; 4,799
    possessive, 6,310 object, 1,131 both; 4 left blank where the two releases disagree. Stems without a QAC
    gloss stay blank.

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

## Audio recitation (streamed, not stored here)

Nothing is downloaded by the pipeline; the reader streams one MP3 per āyah.

- **Host:** Islamic Network audio CDN, `https://cdn.islamic.network/quran/audio/128/<edition>/<n>.mp3`,
  where `<n>` is the global āyah number (1–6236), computed from the verse counts in
  `public/data/index.json`. Editions used: `ar.husary` (default), `ar.alafasy`, `ar.minshawi`.
- **Recordings:** EveryAyah.com (https://everyayah.com/). alquran.cloud credits Every Ayah
  for its ayah-by-ayah audio (https://alquran.cloud/contributors), and spot checks
  (Alafasy 2:1 and 114:6, Minshawi 3:10) are byte-identical to the EveryAyah files.
- **Reciters (all Ḥafṣ ʿan ʿĀṣim, murattal):** Mahmoud Khalil Al-Husary,
  Mishary Rashid Alafasy, Muhammad Siddiq Al-Minshawi.
- **Terms:** alquran.cloud's terms (https://alquran.cloud/terms-and-conditions, read
  2026-11-14) say recitations remain the reciters' copyright and may be streamed,
  embedded and downloaded for personal and educational use, and that a commercial product
  may be asked to remove them. They ask heavy users to cache audio. EveryAyah.com
  itself publishes no terms of use, which is why the app streams from the CDN that does.
  The app is free and educational; a paid version would need fresh permission.
- **Credit:** the reader shows the current reciter's name (English and Arabic) and
  the source under every surah.
- **Basmala (before āyah 1 of surahs 2–114, never 9; al-Fātiḥah's basmala is its
  āyah 1):** the CDN has no separate basmala file, so the app plays each reciter's
  own al-Fātiḥah 1:1 file from the same CDN, which is the basmala recited on its own.
  Checks (2026-11-14): every 1:1 file lasts 5.0–6.1 s, too short to also hold the
  taʿawwudh (about 7 s on its own); and for Husary, EveryAyah's own `bismillah.mp3` is
  byte-identical to its `001001.mp3`. Alafasy has a separate `bismillah.mp3` on
  EveryAyah, but that file is not on the licensed CDN, so it is not used. Minshawi has
  no separate file. A reciter added without a `basmala` source plays none.
- **Not used:** Quran.com / Quran Foundation audio. It has word-level timings, but they
  belong to Quran.com's own recordings and their developer terms tie use to API
  credentials, so word-by-word highlighting was left out.
- **Your own recitations:** add a `Reciter` in `src/lib/audio.ts` with `covers` set
  to the surahs you recorded and `url` pointing at your files (e.g.
  `public/audio/own/<surah>/<ayah>.mp3`). It then appears in the selector for those surahs only.

## Surah context and virtue narrations (`scripts/raw/context/`)

Built into `public/data/context/<id>.json` by `scripts/build-context.mjs`; the
reviewer's checklist is `docs/context-review.md`. **Status: draft, pending
scholarly review.** Every entry carries `verified: false` and the reader shows a
draft banner until `REVIEW` in the build script is set to approved.

| File | What | Source (fetched 2026-11-16) | Terms |
|---|---|---|---|
| `sunnah-virtues-collection.json` | All 93 narrations, headings and references of the backbone collection | [sunnah.com/virtues](https://sunnah.com/virtues), *Special Virtues of the Qur'an's Chapters and Verses* (al-Jāmiʿ al-Mukhtaṣar li-Faḍāʾil al-Āyāt wa-s-Suwar), compiled by Shaykh Suleiman Hani, reproduced on sunnah.com with his permission | sunnah.com content; translations belong to their publishers |
| `sunnah-hadith-pages.json` | For each narration used: the collection's English and Arabic text, the grade field and the references | Each narration's own sunnah.com page, e.g. [sunnah.com/tirmidhi:2891](https://sunnah.com/tirmidhi:2891). English: the translations sunnah.com shows (e.g. Muhsin Khan for al-Bukhārī; Abdul Hamid Siddiqui for Muslim; Darussalam for the Sunan). Grades: sunnah.com's grade field (Darussalam, or al-Albānī for Abū Dāwūd) | As above |
| `hadeethenc-records.json` | The HadeethEnc records that match narrations used here (16 records, 18 narrations), with their grade | [HadeethEnc](https://hadeethenc.com) public API, `api/v1/hadeeths/one/?language=en&id=…` | HadeethEnc terms |
| `quran-com-info/<id>.json` | Introduction to each surah | Quran.com API `api/v4/chapters/<id>/info?language=en`: Sayyid Abul Aʿlā Mawdūdī, *Tafhīm al-Qurʾān* (English) | Copyrighted translation; only short verbatim excerpts are shown, with attribution and a link |
| `tanzil-quran-data.js` | Meccan/Medinan classification and revelation order | [Tanzil Quran metadata](https://tanzil.net/docs/quran_metadata) (`tanzil.net/res/text/metadata/quran-data.js`) | Tanzil terms (verbatim, attributed) |

How the data was made, and checked:

- **Capture.** sunnah.com sits behind a browser check, so its pages were read in a
  browser and saved without retyping. Each file's SHA-256 was compared with the
  page's own hash: `virtues.json` 2c31a2e4…, hadith pages 3ec93904… and be8328ea…
  (the al-Kahf variant, Muslim 809b).
- **Inclusion rule.** A narration is shown only if it is in Ṣaḥīḥ al-Bukhārī or
  Ṣaḥīḥ Muslim, or sunnah.com grades it Ṣaḥīḥ or Ḥasan and names the grader, with
  no conflicting weak grade. The build stops if any included narration fails this.
- **Cross-check.** Where HadeethEnc has the same hadith (matched by Arabic wording,
  then confirmed by reading both), its grade is shown too. All 18 such cross-checks
  agree with sunnah.com.
- **Assignment.** `scripts/context-curation.json` maps each narration to its surahs
  by its own text, not by the collection's headings. Two references in the
  collection sit under the wrong heading (al-Bukhārī 5012 and 5034 are about
  al-Fatḥ, not az-Zumar). One is wrong outright: Muslim 854b is about Friday, not
  Sūrat al-Jumuʿah. The build fails if any of the 93 collection items is neither
  used nor listed as held back with a reason.
- **Owner's seed list.** Every seed reference was found, and each matches its
  description, except one. For al-Falaq and an-Nās, Muslim 814's wording is
  "verses the like of which have never been seen". The "best thing with which to
  seek refuge" wording is an-Nasāʾī 5432 (Ḥasan, Darussalam). Both are shown. For
  al-Fātiḥah the seed's al-Bukhārī 5006 is used; the collection cites the same
  narration as al-Bukhārī 4474.
- **Context** is quoted, never paraphrased:
  - Whole sentences from the start of the first usable paragraph (about 200–420
    characters), marked "…" when cut.
  - A paragraph is skipped if it is a lead-in ending in a colon, or if the excerpt
    relays a narration (quoted speech, "X reported that…", or a citation of a
    collection). Narrations must not appear here ungraded.
  - Surahs whose introduction gives no usable passage are listed in the review sheet.
  - Meccan/Medinan and revelation order come from Tanzil, and must agree with
    `index.json` or the build fails.

## Fonts

Self-hosted from npm (Fontsource), all SIL Open Font License 1.1: **Amiri Quran**
(Quran text), **Amiri** (Arabic titles), **Scheherazade New** (small Arabic
labels), **Inter** and **Lora** (Latin).
