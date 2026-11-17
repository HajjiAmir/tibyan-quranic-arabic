import type { Legend, Role, Surah, SurahContext, SurahMeta, TajweedGroup, TajweedLegend } from '../types';

const BASE = import.meta.env.BASE_URL;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}data/${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

let indexCache: SurahMeta[] | null = null;
const surahCache = new Map<number, Surah>();
let legendCache: Legend | null = null;
let tajweedLegendCache: TajweedLegend | null = null;

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

const contextCache = new Map<number, SurahContext>();
export async function loadContext(id: number): Promise<SurahContext> {
  const cached = contextCache.get(id);
  if (cached) return cached;
  const ctx = await getJson<SurahContext>(`context/${id}.json`);
  contextCache.set(id, ctx);
  return ctx;
}

export async function loadLegend(): Promise<Legend> {
  if (!legendCache) legendCache = await getJson<Legend>('legend.json');
  return legendCache;
}

export async function loadTajweedLegend(): Promise<TajweedLegend> {
  if (!tajweedLegendCache) tajweedLegendCache = await getJson<TajweedLegend>('tajweed-legend.json');
  return tajweedLegendCache;
}

export function tajweedVar(group: TajweedGroup): string {
  return `var(--tj-${group})`;
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
