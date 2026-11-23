import { useEffect, useState } from 'react';

// Word-by-word recitation (brief 16, piece 3): the recorded word audio Quran.com
// plays when a word is tapped, streamed from the Quran Foundation's CDN
// (audio.qurancdn.com/wbw/SSS_VVV_WWW.mp3). Positions are Quran.com word
// positions, the same ones our word data uses (checked against the Quran.com API).
// Licence: Quran Foundation Developer Terms. Streamed only, never bundled or
// rehosted, and credited to the Quran Foundation where it plays. No synthetic speech.

export const WORD_AUDIO_CREDIT = 'Word recitation: Quran Foundation (Quran.com word by word)';
export const WORD_AUDIO_SOURCE = 'https://quran.com';

const pad = (n: number) => String(n).padStart(3, '0');

/** "2:255" and a 1-based word position -> the recorded word's URL. */
export function wordAudioUrl(ref: string, position: number): string {
  const [s, v] = ref.split(':').map(Number);
  return `https://audio.qurancdn.com/wbw/${pad(s)}_${pad(v)}_${pad(position)}.mp3`;
}

export type WordAudioStatus = 'idle' | 'loading' | 'playing' | 'error';

// One shared element: a new word stops the last one.
let audio: HTMLAudioElement | null = null;
let current: string | null = null;
let status: WordAudioStatus = 'idle';
const listeners = new Set<() => void>();

function set(url: string | null, s: WordAudioStatus) {
  current = url;
  status = s;
  listeners.forEach((f) => f());
}

function element(): HTMLAudioElement {
  if (audio) return audio;
  const a = new Audio();
  a.preload = 'auto';
  a.addEventListener('playing', () => set(current, 'playing'));
  a.addEventListener('ended', () => set(current, 'idle'));
  a.addEventListener('pause', () => status === 'playing' && set(current, 'idle'));
  a.addEventListener('error', () => current && set(current, 'error'));
  audio = a;
  return a;
}

export function playWord(url: string) {
  const a = element();
  if (current === url && (status === 'playing' || status === 'loading')) {
    a.pause();
    a.currentTime = 0;
    set(url, 'idle');
    return;
  }
  a.pause();
  set(url, 'loading');
  a.src = url;
  a.currentTime = 0;
  a.play().catch((e: unknown) => {
    // An interrupted play (another word tapped) is not an error.
    if (e instanceof DOMException && e.name === 'AbortError') return;
    if (current === url) set(url, 'error');
  });
}

/** This URL's playback state, live. */
export function useWordAudio(url: string | null): WordAudioStatus {
  const read = () => (url && current === url ? status : 'idle');
  const [s, setS] = useState<WordAudioStatus>(read);
  useEffect(() => {
    const f = () => setS(read());
    f();
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  return s;
}
