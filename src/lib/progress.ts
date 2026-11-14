// Per-viewer study progress, stored locally. Best-effort: every access is
// guarded so the app works even when storage is unavailable.

const KEY = 'tibyan.progress.v1';

type Progress = Record<number, number[]>; // surahId -> studied verse ids

function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

function write(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function studiedVerses(surahId: number): Set<number> {
  return new Set(read()[surahId] ?? []);
}

export function toggleVerse(surahId: number, verseId: number): Set<number> {
  const p = read();
  const set = new Set(p[surahId] ?? []);
  if (set.has(verseId)) set.delete(verseId);
  else set.add(verseId);
  p[surahId] = [...set].sort((a, b) => a - b);
  write(p);
  return set;
}

export function surahStudiedCount(surahId: number): number {
  return (read()[surahId] ?? []).length;
}

export function totalStudied(): number {
  const p = read();
  return Object.values(p).reduce((n, v) => n + v.length, 0);
}
