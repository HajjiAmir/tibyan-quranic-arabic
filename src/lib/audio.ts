// Recitation sources. Audio is streamed, never bundled.
//
// Default source: the Islamic Network audio CDN (cdn.islamic.network, the CDN
// behind alquran.cloud). Its per-āyah files are the EveryAyah.com recordings
// (byte-identical; see scripts/raw/SOURCES.md), and its published terms allow
// streaming and embedding the recitations for personal and educational use.
// Files are addressed by the global āyah number (1–6236).
//
// To add your own recitation for particular surahs, add a Reciter whose
// `covers` lists those surahs and whose `url` points at your files, e.g. MP3s
// placed in public/audio/own/<surah>/<ayah>.mp3:
//
//   {
//     id: 'own', name: 'My recitation', arabic: '', style: 'Personal',
//     covers: (s) => [1, 112, 113, 114].includes(s),
//     url: ({ surah, ayah }) => `${import.meta.env.BASE_URL}audio/own/${surah}/${ayah}.mp3`,
//     credit: 'Recited by …',
//   }
//
// The selector only offers a reciter for the surahs it covers.

export interface AyahRef {
  surah: number;
  ayah: number;
  /** 1-based position of the āyah in the whole Quran. */
  global: number;
}

export interface Reciter {
  id: string;
  name: string;
  arabic: string;
  style: string;
  covers: (surah: number) => boolean;
  url: (ref: AyahRef) => string;
  credit: string;
}

const islamicNetwork = (edition: string) => (ref: AyahRef) =>
  `https://cdn.islamic.network/quran/audio/128/${edition}/${ref.global}.mp3`;

const CDN_CREDIT = 'Audio: Islamic Network CDN (alquran.cloud), recordings from EveryAyah.com';

export const RECITERS: Reciter[] = [
  {
    id: 'husary',
    name: 'Mahmoud Khalil Al-Husary',
    arabic: 'محمود خليل الحصري',
    style: 'Murattal',
    covers: () => true,
    url: islamicNetwork('ar.husary'),
    credit: CDN_CREDIT,
  },
  {
    id: 'alafasy',
    name: 'Mishary Rashid Alafasy',
    arabic: 'مشاري راشد العفاسي',
    style: 'Murattal',
    covers: () => true,
    url: islamicNetwork('ar.alafasy'),
    credit: CDN_CREDIT,
  },
  {
    id: 'minshawi',
    name: 'Muhammad Siddiq Al-Minshawi',
    arabic: 'محمد صديق المنشاوي',
    style: 'Murattal',
    covers: () => true,
    url: islamicNetwork('ar.minshawi'),
    credit: CDN_CREDIT,
  },
];

export const DEFAULT_RECITER = 'husary';

export function recitersFor(surah: number): Reciter[] {
  return RECITERS.filter((r) => r.covers(surah));
}

export function reciterById(id: string, surah: number): Reciter {
  const available = recitersFor(surah);
  return available.find((r) => r.id === id) ?? available[0];
}

// Remembered per browser: chosen reciter, whether the player row is open, and
// the last āyah reached in each surah (so "Play" resumes there).
const KEY = 'tibyan.audio.v1';
export interface AudioPrefs {
  reciter: string;
  open: boolean;
  resume: Record<string, number>;
}

export function readAudioPrefs(): AudioPrefs {
  const base: AudioPrefs = { reciter: DEFAULT_RECITER, open: false, resume: {} };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...base, ...(JSON.parse(raw) as Partial<AudioPrefs>) } : base;
  } catch {
    return base;
  }
}

export function writeAudioPrefs(p: AudioPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: preferences just are not remembered */
  }
}
