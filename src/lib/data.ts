import type { Legend, Role, Surah, SurahMeta } from '../types';

const BASE = import.meta.env.BASE_URL;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}data/${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

let indexCache: SurahMeta[] | null = null;
const surahCache = new Map<number, Surah>();
let legendCache: Legend | null = null;

export async function loadIndex(): Promise<SurahMeta[]> {
  if (!indexCache) indexCache = await getJson<SurahMeta[]>('index.json');
  return indexCache;
}

export async function loadSurah(id: number): Promise<Surah> {
  const cached = surahCache.get(id);
  if (cached) return cached;
  const surah = await getJson<Surah>(`surahs/${id}.json`);
  surahCache.set(id, surah);
  return surah;
}

export async function loadLegend(): Promise<Legend> {
  if (!legendCache) legendCache = await getJson<Legend>('legend.json');
  return legendCache;
}

export const ROLE_ORDER: Role[] = [
  'verb', 'noun', 'proper', 'pronoun', 'adjective',
  'preposition', 'conjunction', 'determiner', 'negation', 'particle',
];

export function roleVar(role: Role): string {
  return `var(--role-${role})`;
}
export function roleBgVar(role: Role): string {
  return `var(--role-${role}-bg)`;
}
