import { useEffect, useState } from 'react';

// Word pronunciation (brief 16, piece 3): the word cut from Mishary Rashid Alafasy's
// recitation of its verse, at the word timings Quran.com publishes for that recording.
// - Recording: https://verses.quran.com/Alafasy/mp3/SSSVVV.mp3 (one file per verse).
// - Timings:   https://api.quran.com/api/v4/recitations/7/by_ayah/S:V?fields=segments
//              -> [index, word position, from ms, to ms].
// Both are Quran Foundation content (Developer Terms): fetched when a word is tapped and
// held in memory for this visit only; never bundled, stored or rehosted. No synthetic speech.
//
// The published timings can be a little off, so each cut is moved to the quietest point
// within a short window of the published boundary, and faded over a few milliseconds so it
// does not click. Which verse a headword is heard from is chosen at build time for where the
// recitation pauses around it (scripts/build-vocab.mjs).

export const WORD_AUDIO_CREDIT = 'Recitation: Mishary Rashid Alafasy (word timings via Quran.com / Quran Foundation)';

const pad = (n: number) => String(n).padStart(3, '0');
const RECITATION = 7; // Quran.com recitation id: Mishari Rashid al-Afasy, murattal

export const verseAudioUrl = (ref: string) => {
  const [s, v] = ref.split(':').map(Number);
  return `https://verses.quran.com/Alafasy/mp3/${pad(s)}${pad(v)}.mp3`;
};
const timingsUrl = (ref: string) => `https://api.quran.com/api/v4/recitations/${RECITATION}/by_ayah/${ref}?fields=segments`;

type Segment = [number, number, number, number];

// In memory for this visit only.
const timingCache = new Map<string, Promise<Segment[]>>();
const bufferCache = new Map<string, Promise<AudioBuffer>>();
const MAX_BUFFERS = 8;

function timings(ref: string): Promise<Segment[]> {
  let p = timingCache.get(ref);
  if (!p) {
    p = fetch(timingsUrl(ref))
      .then((r) => {
        if (!r.ok) throw new Error(`timings ${r.status}`);
        return r.json();
      })
      .then((d: { audio_files?: { segments?: Segment[] }[] }) => d.audio_files?.[0]?.segments ?? []);
    p.catch(() => timingCache.delete(ref));
    timingCache.set(ref, p);
  }
  return p;
}

function decoded(ctx: AudioContext, ref: string): Promise<AudioBuffer> {
  let p = bufferCache.get(ref);
  if (!p) {
    p = fetch(verseAudioUrl(ref))
      .then((r) => {
        if (!r.ok) throw new Error(`audio ${r.status}`);
        return r.arrayBuffer();
      })
      .then((ab) => ctx.decodeAudioData(ab));
    p.catch(() => bufferCache.delete(ref));
    bufferCache.set(ref, p);
    if (bufferCache.size > MAX_BUFFERS) bufferCache.delete(bufferCache.keys().next().value as string);
  }
  return p;
}

/** Loudness (dB) of [t, t + 20 ms) of the first channel. */
function level(buf: AudioBuffer, t: number): number {
  const d = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const a = Math.max(0, Math.floor(t * sr));
  const b = Math.min(d.length, Math.floor((t + 0.02) * sr));
  let sum = 0;
  for (let i = a; i < b; i++) sum += d[i] * d[i];
  return 20 * Math.log10(Math.sqrt(sum / Math.max(1, b - a)) + 1e-9);
}

/** The quietest point between `from` and `to` (seconds), nearest `near` on ties. */
function quietest(buf: AudioBuffer, from: number, to: number, near: number): number {
  let best = near;
  let bestDb = Infinity;
  for (let t = Math.max(0, from); t <= Math.min(buf.duration - 0.02, to); t += 0.01) {
    const db = level(buf, t) + Math.abs(t - near) * 40; // pulled toward the published boundary (4 dB per 0.1 s)
    if (db < bestDb) {
      bestDb = db;
      best = t + 0.01;
    }
  }
  return best;
}

export interface Clip {
  start: number;
  end: number;
}

/** Where to cut word `position` of verse `ref` from its recording (seconds). */
export function clipOf(buf: AudioBuffer, segs: Segment[], position: number): Clip | null {
  const i = segs.findIndex((s) => s[1] === position);
  if (i < 0) return null;
  const from = segs[i][2] / 1000;
  const to = segs[i][3] / 1000;
  const first = i === 0;
  const last = i === segs.length - 1;
  // Look up to 0.1 s outward, and inward no more than 0.1 s or a quarter of the word: further
  // out, a quiet moment can lie inside the neighbouring word (a stop like ṭ is silent before it
  // sounds); further in, a short word would lose its own sound.
  const inward = Math.min(0.1, (to - from) / 4);
  const start = first ? Math.max(0, from - 0.05) : quietest(buf, from - 0.1, from + inward, from);
  const end = last ? Math.min(buf.duration, to + 0.3) : quietest(buf, to - inward, to + 0.1, to);
  return end > start ? { start, end } : null;
}

export type WordAudioStatus = 'idle' | 'loading' | 'playing' | 'error';

let ctx: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let current: string | null = null;
let status: WordAudioStatus = 'idle';
let token = 0;
const listeners = new Set<() => void>();

function set(key: string | null, s: WordAudioStatus) {
  current = key;
  status = s;
  listeners.forEach((f) => f());
}

function stop() {
  if (source) {
    source.onended = null;
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
    source = null;
  }
}

export const wordKey = (ref: string, position: number) => `${ref}#${position}`;

/** Play (or stop) one word. Call from the tap itself: browsers only allow sound after a gesture. */
export function playWord(ref: string, position: number) {
  const key = wordKey(ref, position);
  if (current === key && (status === 'playing' || status === 'loading')) {
    token++;
    stop();
    set(key, 'idle');
    return;
  }
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  const ac = ctx;
  void ac.resume();
  const mine = ++token;
  stop();
  set(key, 'loading');
  Promise.all([decoded(ac, ref), timings(ref)])
    .then(([buf, segs]) => {
      if (mine !== token) return;
      const clip = clipOf(buf, segs, position);
      if (!clip) throw new Error('no timing for this word');
      const fade = 0.012;
      const gain = ac.createGain();
      const t0 = ac.currentTime + 0.02;
      const dur = clip.end - clip.start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(1, t0 + fade);
      gain.gain.setValueAtTime(1, t0 + Math.max(fade, dur - fade));
      gain.gain.linearRampToValueAtTime(0, t0 + dur);
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(gain).connect(ac.destination);
      src.onended = () => {
        if (mine === token) {
          source = null;
          set(key, 'idle');
        }
      };
      source = src;
      src.start(t0, clip.start, dur);
      set(key, 'playing');
    })
    .catch(() => {
      if (mine === token) set(key, 'error');
    });
}

/** This word's playback state, live. */
export function useWordAudio(key: string | null): WordAudioStatus {
  const read = () => (key && current === key ? status : 'idle');
  const [s, setS] = useState<WordAudioStatus>(read);
  useEffect(() => {
    const f = () => setS(read());
    f();
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return s;
}

// For checks in development: where a word would be cut, and how quiet the edges are.
export async function inspectClip(ref: string, position: number) {
  const ac = new OfflineAudioContext(1, 44100, 44100);
  const [buf, segs] = await Promise.all([
    fetch(verseAudioUrl(ref))
      .then((r) => r.arrayBuffer())
      .then((ab) => ac.decodeAudioData(ab)),
    timings(ref),
  ]);
  const clip = clipOf(buf, segs, position);
  const seg = segs.find((s) => s[1] === position);
  if (!clip || !seg) return null;
  const r = (x: number) => Math.round(x * 1000);
  return {
    published: [seg[2], seg[3]],
    cut: [r(clip.start), r(clip.end)],
    startDb: Math.round(level(buf, clip.start - 0.01)),
    endDb: Math.round(level(buf, clip.end - 0.01)),
  };
}
