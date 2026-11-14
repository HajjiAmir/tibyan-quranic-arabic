export type Role =
  | 'verb' | 'noun' | 'proper' | 'pronoun' | 'adjective'
  | 'preposition' | 'conjunction' | 'determiner' | 'negation' | 'particle';

export interface Segment {
  arabic: string;
  type: 'N' | 'V' | 'P';
  role: Role;
  pos: string;
  description: string;
  root?: string;
  lemma?: string;
  case?: 'NOM' | 'ACC' | 'GEN';
  mood?: 'IND' | 'SUBJ' | 'JUS';
  tense?: 'PERF' | 'IMPF' | 'IMPV';
  person?: 1 | 2 | 3;
  gender?: 'M' | 'F';
  number?: 'S' | 'D' | 'P';
  verbForm?: string;
  prefix?: boolean;
  flags: string[];
  /**
   * English for this segment, from the Quranic Arabic Corpus only:
   * 'qac-prefix' = the QAC's "usually translated as" phrase for a prefixed particle;
   * 'qac-lemma'  = the QAC's short gloss for the stem's lemma (a dictionary sense).
   * 'reviewed-table' = the owner-reviewed grammatical equivalent for the
   *   article al- ("the") or an attached object/possessive pronoun.
   * Absent where no source has English (e.g. verb subject markers, many stems).
   */
  gloss?: string;
  glossSource?: 'qac-prefix' | 'qac-lemma' | 'reviewed-table';
  /** For attached pronouns: the form chosen from the host's part of speech. */
  pronounForm?: 'possessive' | 'object' | 'both';
}

export interface Word {
  position: number;
  arabic: string;
  root: string | null;
  lemma: string | null;
  role: Role;
  segments: Segment[];
  /** Word-by-word English gloss (Quranic Arabic Corpus wording, via Quran.com). */
  gloss?: string;
  /** Romanised pronunciation of the word (Quran.com). */
  translit?: string;
}

export interface Verse {
  id: number;
  arabic: string;
  translation: string;
  footnotes: string;
  words: Word[];
  /** Tajweed spans: [start, end, rule], code-point offsets into `arabic`. */
  tajweed?: TajweedSpan[];
}

export type TajweedRule =
  | 'hamzat_wasl' | 'lam_shamsiyyah' | 'silent'
  | 'madd_2' | 'madd_246' | 'madd_munfasil' | 'madd_muttasil' | 'madd_6'
  | 'ghunnah' | 'ikhfa' | 'ikhfa_shafawi' | 'iqlab' | 'qalqalah'
  | 'idghaam_ghunnah' | 'idghaam_no_ghunnah' | 'idghaam_shafawi'
  | 'idghaam_mutajanisayn' | 'idghaam_mutaqaribayn';

export type TajweedSpan = [number, number, TajweedRule];

/** Colour group shared by closely related rules. */
export type TajweedGroup =
  | 'silent' | 'madd2' | 'madd246' | 'madd45' | 'madd6'
  | 'ghunnah' | 'ikhfa' | 'idgham' | 'idghamNo' | 'iqlab' | 'qalqalah';

export interface TajweedInfo {
  label: string;
  arabic: string;
  group: TajweedGroup;
  desc: string;
}

export type TajweedLegend = Record<TajweedRule, TajweedInfo>;

export interface SurahMeta {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
  type: 'meccan' | 'medinan';
  totalVerses: number;
}

export interface Surah extends SurahMeta {
  /** Basmala as written in the source, shown before verse 1 (absent for 1 and 9). */
  bismillah?: string;
  verses: Verse[];
}

export interface RoleInfo {
  label: string;
  arabic: string;
  desc: string;
}

export type Legend = Record<Role, RoleInfo>;
