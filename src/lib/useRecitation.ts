import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { readAudioPrefs, reciterById, recitersFor, writeAudioPrefs, type AudioPrefs } from './audio';

export type PlayStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
/** single = one āyah; continuous = from an āyah to the end; range = a passage looped. */
export type PlayMode = 'single' | 'continuous' | 'range';

/** What to recite. `each`/`loops` of 0 mean "until stopped" (∞). */
export interface Plan {
  mode: PlayMode;
  from: number;
  to: number;
  /** Times each āyah is recited before moving on. */
  each: number;
  /** Times the whole from–to passage is recited. */
  loops: number;
  /** Recite the basmala first (only ever before āyah 1 of surahs 2–114 except 9). */
  basmala: boolean;
}

export interface RecitationState {
  /** Āyah being recited; 0 = the basmala; null = nothing. */
  verse: number | null;
  plan: Plan | null;
  /** Repetition of the current āyah (1-based). */
  rep: number;
  /** Pass through the passage (1-based). */
  loop: number;
  status: PlayStatus;
  message: string | null;
}

export const BASMALA = 0;

const IDLE: RecitationState = { verse: null, plan: null, rep: 1, loop: 1, status: 'idle', message: null };

const OFFLINE_MSG = 'You appear to be offline. Recitation streams from the internet.';
const FAILED_MSG = 'This recitation could not be loaded. Check your connection and try again.';

const more = (done: number, total: number) => total === 0 || done < total;

const LAST_SURAH = 114;

/**
 * One <audio> element per reader: plays an āyah (optionally repeated), the
 * surah onwards from an āyah, or a passage looped, then stops cleanly.
 *
 * Playback always belongs to the surah on screen. The element lives as long
 * as the reader, so it keeps the browser's play permission between surahs:
 * - moving to another surah while reciting carries the recitation there,
 *   from its start;
 * - a surah recited to its end carries on into the next surah, and the
 *   reader moves with it.
 * `totalVerses` and `globalOffset` must describe `surah` (0 / null while it loads).
 */
export function useRecitation(surah: number, totalVerses: number, globalOffset: number | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<RecitationState>(IDLE);
  const [prefs, setPrefs] = useState<AudioPrefs>(readAudioPrefs);
  const stateRef = useRef(state);
  stateRef.current = state;
  const speedRef = useRef(prefs.speed);
  speedRef.current = prefs.speed;

  const navigate = useNavigate();
  // Set when the recitation should start the next surah shown on screen.
  const carryRef = useRef(false);
  const shownSurahRef = useRef(surah);
  const totalRef = useRef(totalVerses);
  totalRef.current = totalVerses;

  const reciter = reciterById(prefs.reciter, surah);
  const reciterRef = useRef(reciter);
  reciterRef.current = reciter;

  useEffect(() => writeAudioPrefs(prefs), [prefs]);

  /** The basmala is recited before āyah 1 everywhere except al-Fātiḥah (where it is āyah 1) and at-Tawbah. */
  const basmalaAvailable = surah !== 1 && surah !== 9 && !!reciter.basmala;

  const urlFor = useCallback(
    (verse: number) => {
      const r = reciterRef.current;
      if (verse === BASMALA) return r.basmala ? r.basmala() : null;
      return globalOffset == null ? null : r.url({ surah, ayah: verse, global: globalOffset + verse });
    },
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

  const applySpeed = (audio: HTMLAudioElement) => {
    // Loading a new src resets playbackRate to defaultPlaybackRate, so set both.
    audio.defaultPlaybackRate = speedRef.current;
    audio.playbackRate = speedRef.current;
    audio.preservesPitch = true;
  };

  const fail = () => setState((s) => ({ ...s, status: 'error', message: FAILED_MSG }));

  /** Load and play one item of the plan. */
  const load = useCallback(
    (verse: number, plan: Plan, rep: number, loop: number) => {
      const audio = audioRef.current;
      const url = urlFor(verse);
      if (!audio || !url) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setState({ verse, plan, rep, loop, status: 'error', message: OFFLINE_MSG });
        return;
      }
      setState({ verse, plan, rep, loop, status: 'loading', message: null });
      audio.src = url;
      applySpeed(audio);
      audio.play().catch((e: unknown) => {
        // AbortError just means a newer play() replaced this one.
        if (e instanceof DOMException && e.name === 'AbortError') return;
        fail();
      });
      if (plan.mode === 'continuous' && verse !== BASMALA) rememberVerse(verse);
      // Warm the next file so the hand-over between āyāt is seamless.
      const nextVerse = verse === BASMALA ? plan.from : verse < plan.to ? verse + 1 : plan.loops !== 1 ? plan.from : null;
      const next = nextVerse != null && nextVerse !== verse ? urlFor(nextVerse) : null;
      if (next && preloadRef.current) {
        preloadRef.current.src = next;
        preloadRef.current.load();
      }
    },
    [urlFor, rememberVerse],
  );

  const begin = useCallback(
    (plan: Plan) => load(plan.basmala ? BASMALA : plan.from, plan, 1, 1),
    [load],
  );

  // Create the elements once; tear down when leaving the reader.
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
  }, []);

  // A new surah on screen: silence the previous one at once (audio and
  // highlight never belong to a surah that is not shown), and carry the
  // recitation over if it was running.
  useEffect(() => {
    if (shownSurahRef.current === surah) return;
    shownSurahRef.current = surah;
    const s = stateRef.current;
    if (s.status === 'playing' || s.status === 'loading') carryRef.current = true;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    preloadRef.current?.removeAttribute('src');
    setState(IDLE);
  }, [surah]);

  // When a file ends: repeat the āyah, advance, loop the passage, or finish.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      const { verse, plan, rep, loop } = stateRef.current;
      if (verse == null || !plan) return;
      if (verse === BASMALA) return load(plan.from, plan, 1, loop);
      if (more(rep, plan.each)) {
        // Same file again: rewind rather than reload.
        setState((s) => ({ ...s, rep: rep + 1 }));
        audio.currentTime = 0;
        audio.play().catch(fail);
        return;
      }
      if (verse < plan.to) return load(verse + 1, plan, 1, loop);
      if (more(loop, plan.loops)) return load(plan.from, plan, 1, loop + 1);
      if (plan.mode === 'continuous') rememberVerse(null);
      // Recited to the end of the surah: carry on into the next one.
      if (plan.mode === 'continuous' && plan.to === totalRef.current && surah < LAST_SURAH) {
        carryRef.current = true;
        setState({ ...IDLE, plan, status: 'loading' });
        navigate(`/surah/${surah + 1}`);
        return;
      }
      setState({ ...IDLE, plan, status: 'ended' });
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [load, rememberVerse, surah, navigate]);

  const resumeVerse = Math.min(Math.max(prefs.resume[surah] ?? 1, 1), Math.max(totalVerses, 1));

  const pause = useCallback(() => audioRef.current?.pause(), []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const s = stateRef.current;
    if (s.status === 'paused') audio.play().catch(fail);
    else if (s.status === 'error' && s.verse != null && s.plan) load(s.verse, s.plan, s.rep, s.loop);
  }, [load]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setState(IDLE);
  }, []);

  const continuousFrom = useCallback(
    (from: number): Plan => ({
      mode: 'continuous',
      from,
      to: totalVerses,
      each: prefs.repeat,
      loops: 1,
      basmala: from === 1 && basmalaAvailable,
    }),
    [totalVerses, prefs.repeat, basmalaAvailable],
  );

  const isBusy = (s: RecitationState) => s.status === 'playing' || s.status === 'loading';

  // Start a carried recitation once the new surah's verses and audio offset are known.
  useEffect(() => {
    if (!carryRef.current || globalOffset == null || totalVerses <= 0) return;
    if (shownSurahRef.current !== surah) return;
    carryRef.current = false;
    begin(continuousFrom(1));
  }, [surah, globalOffset, totalVerses, begin, continuousFrom]);

  /** Toolbar play/pause: resumes, or plays the surah from the remembered āyah. */
  const togglePlay = useCallback(() => {
    const s = stateRef.current;
    if (isBusy(s)) pause();
    else if (s.status === 'paused' || (s.status === 'error' && s.verse != null)) resume();
    else begin(continuousFrom(resumeVerse));
  }, [pause, resume, begin, continuousFrom, resumeVerse]);

  /** Per-āyah buttons: play that āyah (repeated) or the surah from it; pause/resume if current. */
  const toggleVerse = useCallback(
    (verse: number, mode: 'single' | 'continuous') => {
      const s = stateRef.current;
      if (s.plan?.mode === mode && (s.verse === verse || (mode === 'continuous' && s.plan.from === verse && s.verse === BASMALA))) {
        if (isBusy(s)) return pause();
        if (s.status === 'paused' || s.status === 'error') return resume();
      }
      begin(
        mode === 'single'
          ? { mode, from: verse, to: verse, each: prefs.repeat, loops: 1, basmala: false }
          : continuousFrom(verse),
      );
    },
    [pause, resume, begin, continuousFrom, prefs.repeat],
  );

  /** Loop a passage: āyāt from–to, the whole passage `loops` times (0 = ∞). */
  const playRange = useCallback(
    (from: number, to: number, loops: number) => {
      const a = Math.max(1, Math.min(from, to));
      const b = Math.min(totalVerses, Math.max(from, to));
      begin({ mode: 'range', from: a, to: b, each: 1, loops, basmala: false });
    },
    [begin, totalVerses],
  );

  const setReciter = useCallback(
    (id: string) => {
      setPrefs((p) => ({ ...p, reciter: id }));
      const s = stateRef.current;
      // Switch voices mid-recitation: restart the current item with the new reciter.
      if (s.verse != null && s.plan && s.status !== 'idle' && s.status !== 'ended') {
        reciterRef.current = reciterById(id, surah);
        if (s.verse === BASMALA && !reciterRef.current.basmala) load(s.plan.from, s.plan, 1, s.loop);
        else load(s.verse, s.plan, s.rep, s.loop);
      }
    },
    [load, surah],
  );

  /** Repeat count for each āyah; also applies to what is playing now. */
  const setRepeat = useCallback((n: number) => {
    setPrefs((p) => ({ ...p, repeat: n }));
    setState((s) =>
      s.plan && s.plan.mode !== 'range' ? { ...s, plan: { ...s.plan, each: n } } : s,
    );
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setPrefs((p) => ({ ...p, speed }));
    speedRef.current = speed;
    if (audioRef.current) applySpeed(audioRef.current);
  }, []);

  const setOpen = useCallback((open: boolean) => setPrefs((p) => ({ ...p, open })), []);

  // Lock-screen / hardware media keys where the browser supports them.
  useEffect(() => {
    if (!('mediaSession' in navigator) || state.verse == null) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.verse === BASMALA ? `Surah ${surah}, basmala` : `Surah ${surah}, āyah ${state.verse}`,
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
    repeat: prefs.repeat,
    speed: prefs.speed,
    resumeVerse,
    basmalaAvailable,
    ready: globalOffset != null,
    togglePlay,
    toggleVerse,
    playRange,
    stop,
    setReciter,
    setRepeat,
    setSpeed,
    setOpen,
  };
}

export type Recitation = ReturnType<typeof useRecitation>;
