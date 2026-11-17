// Reviewed table (signed off by the project owner, brief 3): standard
// grammatical English equivalents for the definite article and for attached
// object/possessive pronoun suffixes. Used by build-data.mjs (segment glosses)
// and build-vocab.mjs (study entries). See the notes in build-data.mjs.

export const ARTICLE_GLOSS = 'the';

// key: person + number (+ gender for 3rd singular) -> [possessive, object, expected letters]
export const REVIEWED_PRONOUNS = {
  // 1S also appears with its yā' dropped in the Uthmani spelling (an empty
  // segment, ـنِ, or a small ۦ), 1P with its nūn merged into a preceding nūn
  // (إِنَّا -> segment ا / آ). Both QAC releases agree on the features there.
  '1S': ['my', 'me', /^$|[يىۦ]|^ن$/],
  '1P': ['our', 'us', /نا|^[اآ]/],
  '2S': ['your', 'you', /ك/],
  '2D': ['your', 'you', /كما/],
  '2P': ['your', 'you', /ك[من]/],
  '3MS': ['his', 'him', /ه/],
  '3FS': ['her', 'her', /ها/],
  '3D': ['their', 'them', /هما/],
  '3P': ['their', 'them', /ه[من]/],
};

export function pronounKey(feat) {
  const m = feat.match(/^([123])([MF]?)([SDP])$/);
  if (!m) return null;
  const [, p, g, n] = m;
  if (p === '3' && n === 'S') return `3${g}S`;
  return `${p}${n}`;
}

// Subject forms for the separate (independent) pronouns هُوَ، هُمْ، نَحْنُ …
// (brief 10; confirmed by the project owner 2026-11-16, brief 11). The same
// person/number/gender equivalents as the table above, in the subject case. build-vocab.mjs checks each one against the Quran.com
// word-by-word glosses of that pronoun and fails if any is never used there.
export const SUBJECT_FORMS = {
  '1S': 'I',
  '1P': 'we',
  '2S': 'you',
  '2D': 'you',
  '2P': 'you',
  '3MS': 'he',
  '3FS': 'she',
  '3D': 'they',
  '3P': 'they',
};
