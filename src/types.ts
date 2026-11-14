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
}

export interface Word {
  position: number;
  arabic: string;
  root: string | null;
  lemma: string | null;
  role: Role;
  segments: Segment[];
}

export interface Verse {
  id: number;
  arabic: string;
  translation: string;
  footnotes: string;
  words: Word[];
}

export interface SurahMeta {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
  type: 'meccan' | 'medinan';
  totalVerses: number;
}

export interface Surah extends SurahMeta {
  verses: Verse[];
}

export interface RoleInfo {
  label: string;
  arabic: string;
  desc: string;
}

export type Legend = Record<Role, RoleInfo>;
