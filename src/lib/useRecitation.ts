import { useCallback, useEffect, useRef, useState } from 'react';
import { readAudioPrefs, reciterById, recitersFor, writeAudioPrefs, type AudioPrefs } from './audio';

export type PlayStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
export type PlayMode = 'single' | 'continuous';

export interface RecitationState {
  verse: number | null;
  mode: PlayMode;
  status: PlayStatus;
  message: string | null;
}

const IDLE: RecitationState = { verse: null, mode: 'continuous', status: 'idle', message: null };

const OFFLINE_MSG = 'You appear to be offline. Recitation streams from the internet.';
const FAILED_MSG = 'This recitation could not be loaded. Check your connection and try again.';

/**
 * One <audio> element per reader. Plays a single āyah, or plays continuously
 * from a chosen āyah to the end of the surah, then stops cleanly.
 */
export function useRecitation(surah: number, totalVerses: number, globalOffset: number | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<RecitationState>(IDLE);
  const [prefs, setPrefs] = useState<AudioPrefs>(readAudioPrefs);
  const stateRef = useRef(state);
  stateRef.current = state;

  const reciter = reciterById(prefs.reciter, surah);
  const reciterRef = useRef(reciter);
  reciterRef.current = reciter;

  useEffect(() => writeAudioPrefs(prefs), [prefs]);

  const urlFor = useCallback(
    (verse: number) =>
      globalOffset == null
        ? null
        : reciterRef.current.url({ surah, ayah: verse, global: globalOffset + verse }),
    [surah, globalOffset],
  );

  const rememberVerse = useCallback(
    (verse: number | null) =>
      setPrefs((p) => {
        const resume = { ...p.resume };
        if (verse == null || verse <= 1) delete resume[surah];
        else resume[surah] = verse;
        return { ...p, resume };
      }),
    [surah],
  );

  const start = useCallback(
    (verse: number, mode: PlayMode) => {
      const audio = audioRef.current;
      const url = urlFor(verse);
      if (!audio || !url) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setState({ verse, mode, status: 'error', message: OFFLINE_MSG });
        return;
      }
      setState({ verse, mode, status: 'loading', message: null });
      audio.src = url;
      audio.play().catch((e: unknown) => {
        // AbortError just means a newer play() replaced this one.
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setState((s) => ({ ...s, status: 'error', message: FAILED_MSG }));
      });
      if (mode === 'continuous') {
        rememberVerse(verse);
        // Warm the next file so the hand-over between āyāt is seamless.
        const next = verse < totalVerses ? urlFor(verse + 1) : null;
        if (next && preloadRef.current) {
          preloadRef.current.src = next;
          preloadRef.current.load();
        }
      }
    },
    [urlFor, rememberVerse, totalVerses],
  );

  // Create the elements once; tear down when leaving the surah.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    const preload = new Audio();
    preload.preload = 'auto';
    preload.muted = true;
    audioRef.current = audio;
    preloadRef.current = preload;

    const onPlaying = () => setState((s) => ({ ...s, status: 'playing', message: null }));
    const onWaiting = () => setState((s) => (s.status === 'paused' ? s : { ...s, status: 'loading' }));
    // A finished file also fires `pause`; that is not a user pause.
    const onPause = () =>
      !audio.ended &&
      setState((s) => (s.status === 'playing' || s.status === 'loading' ? { ...s, status: 'paused' } : s));
    const onError = () => {
      if (!audio.getAttribute('src')) return;
      setState((s) => ({
        ...s,
        status: 'error',
        message: navigator.onLine === false ? OFFLINE_MSG : FAILED_MSG,
      }));
    };
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      preload.removeAttribute('src');
      audioRef.current = null;
      preloadRef.current = null;
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, [surah]);

  // Auto-advance (or finish) when an āyah ends.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      const s = stateRef.current;
      if (s.verse == null) return;
      if (s.mode === 'continuous' && s.verse < totalVerses) {
        start(s.verse + 1, 'continuous');
      } else {
        if (s.mode === 'continuous') rememberVerse(null);
        setState({ verse: null, mode: s.mode, status: 'ended', message: null });
      }
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [start, rememberVerse, totalVerses, surah]);

  const resumeVerse = Math.min(Math.max(prefs.resume[surah] ?? 1, 1), totalVerses);

  const pause = useCallback(() => audioRef.current?.pause(), []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const s = stateRef.current;
    if (s.status === 'paused') {
      audio.play().catch(() => setState((x) => ({ ...x, status: 'error', message: FAILED_MSG })));
    } else if (s.status === 'error' && s.verse != null) {
      start(s.verse, s.mode);
    }
  }, [start]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setState(IDLE);
  }, []);

  /** Toolbar play/pause: resumes, or starts the surah from the remembered āyah. */
  const togglePlay = useCallback(() => {
    const s = stateRef.current;
    if (s.status === 'playing' || s.status === 'loading') pause();
    else if (s.status === 'paused' || (s.status === 'error' && s.verse != null)) resume();
    else start(resumeVerse, 'continuous');
  }, [pause, resume, start, resumeVerse]);

  /** Per-āyah button: plays just that āyah, or pauses/resumes it if it is current. */
  const toggleVerse = useCallback(
    (verse: number, mode: PlayMode) => {
      const s = stateRef.current;
      if (s.verse === verse && s.mode === mode) {
        if (s.status === 'playing' || s.status === 'loading') return pause();
        if (s.status === 'paused' || s.status === 'error') return resume();
      }
      start(verse, mode);
    },
    [pause, resume, start],
  );

  const setReciter = useCallback(
    (id: string) => {
      setPrefs((p) => ({ ...p, reciter: id }));
      const s = stateRef.current;
      // Switch voices mid-recitation: restart the current āyah with the new reciter.
      if (s.verse != null && s.status !== 'idle' && s.status !== 'ended') {
        reciterRef.current = reciterById(id, surah);
        start(s.verse, s.mode);
      }
    },
    [start, surah],
  );

  const setOpen = useCallback((open: boolean) => setPrefs((p) => ({ ...p, open })), []);

  // Lock-screen / hardware media keys where the browser supports them.
  useEffect(() => {
    if (!('mediaSession' in navigator) || state.verse == null) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `Surah ${surah}, āyah ${state.verse}`,
      artist: reciter.name,
      album: 'Tibyān',
    });
    navigator.mediaSession.setActionHandler('play', () => resume());
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('stop', () => stop());
    return () => {
      for (const a of ['play', 'pause', 'stop'] as const) navigator.mediaSession.setActionHandler(a, null);
    };
  }, [state.verse, surah, reciter.name, resume, pause, stop]);

  return {
    state,
    reciter,
    reciters: recitersFor(surah),
    open: prefs.open,
    resumeVerse,
    ready: globalOffset != null,
    togglePlay,
    toggleVerse,
    stop,
    setReciter,
    setOpen,
  };
}

export type Recitation = ReturnType<typeof useRecitation>;
