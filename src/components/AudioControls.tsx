import { useState } from 'react';
import { REPEAT_OPTIONS, SPEED_OPTIONS, repeatLabel } from '../lib/audio';
import { BASMALA, type Recitation } from '../lib/useRecitation';

const icon = 'h-3.5 w-3.5 shrink-0';

export function PlayIcon({ className = icon }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.2-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5Z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon({ className = icon }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
    </svg>
  );
}

export function StopIcon({ className = icon }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/** Play onwards: a play triangle trailed by lines (continue through the surah). */
export function PlayFromIcon({ className = icon }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M2 3.2v7.6a.5.5 0 0 0 .8.4l5.9-3.8a.5.5 0 0 0 0-.8L2.8 2.8a.5.5 0 0 0-.8.4Z" fill="currentColor" />
      <path d="M10.5 4.5h4M10.5 8h4M7 11.5h7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Spinner({ className = icon }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`${className} animate-spin`} aria-hidden>
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M13.5 8A5.5 5.5 0 0 0 8 2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function HeadphonesIcon({ className = icon }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        d="M2.5 10V8a5.5 5.5 0 0 1 11 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <rect x="2" y="9" width="3" height="5" rx="1.2" fill="currentColor" />
      <rect x="11" y="9" width="3" height="5" rx="1.2" fill="currentColor" />
    </svg>
  );
}

/** Small "Listen" pill for the reader toolbar; opens the player row. */
export function ListenToggle({ rec }: { rec: Recitation }) {
  const active = rec.state.verse != null;
  return (
    <button
      onClick={() => rec.setOpen(!rec.open)}
      aria-expanded={rec.open}
      aria-label="Listen to the recitation"
      className={`tap flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        rec.open || active
          ? 'border-accent/50 bg-accent/10 text-accent'
          : 'border-line bg-surface text-muted hover:text-ink'
      }`}
    >
      {active && rec.state.status === 'playing' ? (
        <span aria-hidden className="flex h-3.5 items-end gap-[2px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[2px] origin-bottom animate-[eq_0.9s_ease-in-out_infinite] rounded-full bg-current"
              style={{ height: '100%', animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      ) : (
        <HeadphonesIcon />
      )}
      <span className="hidden min-[400px]:inline">Listen</span>
    </button>
  );
}

function RepeatIcon({ className = icon }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7.5V6a2 2 0 0 1 2-2h7.5M10.5 2 12.5 4l-2 2M13 8.5V10a2 2 0 0 1-2 2H3.5M5.5 14l-2-2 2-2" />
    </svg>
  );
}

const pillSelect =
  'tap cursor-pointer appearance-none rounded-full border border-line bg-surface py-1 pl-3 pr-7 text-xs font-medium text-ink transition-colors hover:border-accent/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/60';

function Caret() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-muted">
      <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PillSelect<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className = '',
  title,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
  title?: string;
}) {
  return (
    <label className="relative shrink-0">
      <span className="sr-only">{label}</span>
      <select
        value={String(value)}
        onChange={(e) => {
          const hit = options.find((o) => String(o.value) === e.target.value);
          if (hit) onChange(hit.value);
        }}
        className={`${pillSelect} ${className}`}
        title={title ?? label}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      <Caret />
    </label>
  );
}

const count = (n: number) => (n === 0 ? '∞' : String(n));

function statusLine(rec: Recitation, totalVerses: number): string {
  const { state } = rec;
  if (state.status === 'error') return state.message ?? 'Recitation unavailable.';
  if (state.status === 'ended') return 'Recitation complete.';
  const { verse, plan } = state;
  if (verse == null || !plan) {
    return rec.resumeVerse > 1 ? `Continue from āyah ${rec.resumeVerse}` : 'Play the surah from the start';
  }
  const parts: string[] = [];
  if (verse === BASMALA) parts.push('Basmala');
  else if (plan.mode === 'range') parts.push(`Āyāt ${plan.from}–${plan.to} · āyah ${verse}`);
  // While repeating, the repetition count matters more than the surah length.
  else parts.push(plan.each === 1 ? `Āyah ${verse} of ${totalVerses}` : `Āyah ${verse}`);
  if (verse !== BASMALA && plan.each !== 1) parts.push(`${state.rep} of ${count(plan.each)}`);
  if (plan.mode === 'range' && plan.loops !== 1) parts.push(`pass ${state.loop} of ${count(plan.loops)}`);
  if (state.status === 'loading') parts.push('loading…');
  else if (state.status === 'paused') parts.push('paused');
  return parts.join(' · ');
}

/** Loop a passage: from āyah X to āyah Y, N times. */
function PassageForm({ rec, totalVerses, onDone }: { rec: Recitation; totalVerses: number; onDone: () => void }) {
  const startAt = rec.state.verse && rec.state.verse > 0 ? rec.state.verse : rec.resumeVerse;
  const [from, setFrom] = useState(startAt);
  const [to, setTo] = useState(Math.min(totalVerses, startAt + 2));
  const [loops, setLoops] = useState(3);
  const verses = Array.from({ length: totalVerses }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
  return (
    <form
      className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-line/60 pb-1 pt-2 text-xs text-muted"
      onSubmit={(e) => {
        e.preventDefault();
        rec.playRange(from, to, loops);
        onDone();
      }}
    >
      <span className="font-medium text-ink">Loop a passage</span>
      <span className="flex items-center gap-1.5">
        āyah
        <PillSelect label="From āyah" value={from} options={verses} onChange={(v) => { setFrom(v); if (to < v) setTo(v); }} />
        to
        <PillSelect label="To āyah" value={to} options={verses.filter((o) => o.value >= from)} onChange={setTo} />
      </span>
      <PillSelect
        label="Times through the passage"
        value={loops}
        options={REPEAT_OPTIONS.map((n) => ({ value: n, label: n === 0 ? '∞ times' : `${n}×` }))}
        onChange={setLoops}
      />
      <button
        type="submit"
        disabled={!rec.ready}
        className="tap ml-auto flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent shadow-sm transition-transform active:scale-95 disabled:opacity-40"
      >
        <PlayIcon className="h-3 w-3" /> Start
      </button>
    </form>
  );
}

/** Compact player row shown under the toolbar when Listen is open. */
export function PlayerRow({ rec, totalVerses }: { rec: Recitation; totalVerses: number }) {
  const { state } = rec;
  const busy = state.status === 'playing' || state.status === 'loading';
  const active = state.verse != null;
  const [passage, setPassage] = useState(false);
  const status = statusLine(rec, totalVerses);
  const inRange = state.plan?.mode === 'range' && active;

  return (
    <div className="flex flex-col pb-1 pt-2">
      <div className="flex items-center gap-2.5">
        <button
          onClick={rec.togglePlay}
          disabled={!rec.ready}
          aria-label={busy ? 'Pause recitation' : 'Play surah'}
          className="tap flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-sm transition-transform hover:scale-[1.04] active:scale-95 disabled:opacity-40"
        >
          {state.status === 'loading' ? <Spinner /> : busy ? <PauseIcon /> : <PlayIcon className="ml-0.5 h-3.5 w-3.5" />}
        </button>

        <p
          role="status"
          aria-live="polite"
          className={`tnum min-w-0 flex-1 truncate text-xs ${state.status === 'error' ? 'text-accent' : 'text-muted'}`}
          title={status}
        >
          {status}
        </p>

        {active && (
          <button
            onClick={rec.stop}
            aria-label="Stop recitation"
            className="tap flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent/50 hover:text-ink"
          >
            <StopIcon className="h-3 w-3" />
          </button>
        )}

        <PillSelect
          label="Reciter"
          value={rec.reciter.id}
          options={rec.reciters.map((r) => ({ value: r.id, label: r.name }))}
          onChange={rec.setReciter}
          className="max-w-[8rem] truncate sm:max-w-none"
          title={`${rec.reciter.name} · ${rec.reciter.style}`}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* Repeat each āyah: the core memorisation control */}
        <div
          role="radiogroup"
          aria-label="Repeat each āyah"
          className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5"
          title="Repeat each āyah"
        >
          <span className="pl-1 pr-0.5 text-muted sm:pl-1.5 sm:pr-1">
            <RepeatIcon />
          </span>
          {REPEAT_OPTIONS.map((n) => {
            const on = rec.repeat === n;
            return (
              <button
                key={n}
                role="radio"
                aria-checked={on}
                aria-label={n === 0 ? 'Repeat until stopped' : n === 1 ? 'Recite once' : `Repeat ${n} times`}
                onClick={() => rec.setRepeat(n)}
                className={`tap-y tnum min-w-[1.6rem] rounded-full px-1 py-0.5 sm:min-w-[1.85rem] sm:px-1.5 text-[11px] font-semibold transition-colors ${
                  on ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink'
                }`}
              >
                {repeatLabel(n)}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setPassage((o) => !o)}
          aria-expanded={passage}
          className={`tap shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            passage || inRange ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line bg-surface text-muted hover:text-ink'
          }`}
          title="Loop a passage of āyāt"
        >
          Passage
        </button>

        <span className="flex-1" />

        <PillSelect
          label="Playback speed"
          value={rec.speed}
          options={SPEED_OPTIONS.map((v) => ({ value: v, label: `${v}×` }))}
          onChange={rec.setSpeed}
          className="tnum !pl-2.5 !pr-6"
        />
      </div>

      {passage && <PassageForm rec={rec} totalVerses={totalVerses} onDone={() => setPassage(false)} />}
    </div>
  );
}

/** Visible credit for the reciter and the audio source. */
export function RecitationCredit({ rec }: { rec: Recitation }) {
  return (
    <p className="mt-10 text-center text-[11px] leading-relaxed text-muted">
      Recitation by <span className="font-medium text-ink/80">{rec.reciter.name}</span>{' '}
      <span className="ar-naskh text-[0.9rem]">({rec.reciter.arabic})</span> · {rec.reciter.style}
      <br />
      {rec.reciter.credit.startsWith('Audio: Islamic Network') ? (
        <>
          Audio streamed from the{' '}
          <a
            className="hit underline decoration-line underline-offset-2 hover:text-ink"
            href="https://alquran.cloud/terms-and-conditions"
            target="_blank"
            rel="noreferrer"
          >
            Islamic Network CDN
          </a>{' '}
          (recordings from{' '}
          <a
            className="hit underline decoration-line underline-offset-2 hover:text-ink"
            href="https://everyayah.com/"
            target="_blank"
            rel="noreferrer"
          >
            EveryAyah.com
          </a>
          ) for personal and educational use.
        </>
      ) : (
        rec.reciter.credit
      )}
    </p>
  );
}

/** The per-āyah controls: play this āyah, and play onwards from it. */
export function VerseAudio({
  verse,
  rec,
}: {
  verse: number;
  rec: Recitation;
}) {
  const { state } = rec;
  const current = state.verse === verse;
  const busy = current && (state.status === 'playing' || state.status === 'loading');
  const mode = state.plan?.mode;
  const single = current && mode === 'single';
  // "From here" stays lit while the basmala that precedes āyah 1 plays.
  const cont =
    mode === 'continuous' &&
    (current || (state.verse === BASMALA && state.plan?.from === verse));
  const contBusy = cont && (state.status === 'playing' || state.status === 'loading');
  const btn =
    'tap flex h-7 items-center justify-center gap-1 rounded-full border px-2 text-[11px] font-medium transition-colors disabled:opacity-40';
  const on = 'border-accent/50 bg-accent/10 text-accent';
  const off = 'border-transparent text-muted hover:border-line hover:text-ink';

  return (
    <span className="flex items-center gap-0.5">
      <button
        onClick={() => rec.toggleVerse(verse, 'single')}
        disabled={!rec.ready}
        aria-label={
          single && busy
            ? `Pause āyah ${verse}`
            : rec.repeat === 1
              ? `Play āyah ${verse}`
              : `Play āyah ${verse} ${rec.repeat === 0 ? 'until stopped' : `${rec.repeat} times`}`
        }
        title={rec.repeat === 1 ? 'Play this āyah' : `Play this āyah ${repeatLabel(rec.repeat)}`}
        className={`${btn} ${rec.repeat === 1 ? 'w-7 px-0' : ''} ${single ? on : off}`}
      >
        {single && state.status === 'loading' ? (
          <Spinner className="h-3 w-3" />
        ) : single && busy ? (
          <PauseIcon className="h-3 w-3" />
        ) : (
          <PlayIcon className="ml-px h-3 w-3" />
        )}
        {rec.repeat !== 1 && <span className="tnum font-semibold">{repeatLabel(rec.repeat)}</span>}
      </button>
      <button
        onClick={() => rec.toggleVerse(verse, 'continuous')}
        disabled={!rec.ready}
        aria-label={contBusy ? 'Pause recitation' : `Play the surah from āyah ${verse}`}
        title="Play the surah from here"
        className={`${btn} ${cont ? on : off}`}
      >
        {cont && state.status === 'loading' ? (
          <Spinner className="h-3 w-3" />
        ) : contBusy ? (
          <PauseIcon className="h-3 w-3" />
        ) : (
          <PlayFromIcon className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">From here</span>
      </button>
    </span>
  );
}
