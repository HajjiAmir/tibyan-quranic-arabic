import type { Recitation } from '../lib/useRecitation';

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
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        rec.open || active
          ? 'border-gold/50 bg-gold/10 text-gold'
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

/** Compact player row shown under the toolbar when Listen is open. */
export function PlayerRow({ rec, totalVerses }: { rec: Recitation; totalVerses: number }) {
  const { state } = rec;
  const busy = state.status === 'playing' || state.status === 'loading';
  const active = state.verse != null;

  let status: string;
  if (state.status === 'error') status = state.message ?? 'Recitation unavailable.';
  else if (state.status === 'ended') status = 'Recitation complete.';
  else if (active) {
    const where = `Āyah ${state.verse} of ${totalVerses}`;
    status =
      state.status === 'loading'
        ? `${where} · loading…`
        : state.status === 'paused'
          ? `${where} · paused`
          : state.mode === 'single'
            ? `${where} · this āyah only`
            : where;
  } else status = rec.resumeVerse > 1 ? `Continue from āyah ${rec.resumeVerse}` : 'Play the surah from the start';

  return (
    <div className="flex items-center gap-2.5 pb-1 pt-2">
      <button
        onClick={rec.togglePlay}
        disabled={!rec.ready}
        aria-label={busy ? 'Pause recitation' : 'Play surah'}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-paper shadow-sm transition-transform hover:scale-[1.04] active:scale-95 disabled:opacity-40"
      >
        {state.status === 'loading' ? (
          <Spinner />
        ) : busy ? (
          <PauseIcon />
        ) : (
          <PlayIcon className="ml-0.5 h-3.5 w-3.5" />
        )}
      </button>

      <p
        role="status"
        aria-live="polite"
        className={`tnum min-w-0 flex-1 truncate text-xs ${
          state.status === 'error' ? 'text-gold' : 'text-muted'
        }`}
        title={status}
      >
        {status}
      </p>

      {active && (
        <button
          onClick={rec.stop}
          aria-label="Stop recitation"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-gold/50 hover:text-ink"
        >
          <StopIcon className="h-3 w-3" />
        </button>
      )}

      <label className="relative shrink-0">
        <span className="sr-only">Reciter</span>
        <select
          value={rec.reciter.id}
          onChange={(e) => rec.setReciter(e.target.value)}
          className="max-w-[9.5rem] cursor-pointer appearance-none truncate rounded-full border border-line bg-surface py-1 pl-3 pr-7 text-xs font-medium text-ink transition-colors hover:border-gold/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-gold/60 sm:max-w-none"
          title={`${rec.reciter.name} · ${rec.reciter.style}`}
        >
          {rec.reciters.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 12 12"
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-muted"
        >
          <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </label>
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
            className="underline decoration-line underline-offset-2 hover:text-ink"
            href="https://alquran.cloud/terms-and-conditions"
            target="_blank"
            rel="noreferrer"
          >
            Islamic Network CDN
          </a>{' '}
          (recordings from{' '}
          <a
            className="underline decoration-line underline-offset-2 hover:text-ink"
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
  const single = current && state.mode === 'single';
  const cont = current && state.mode === 'continuous';
  const btn =
    'flex h-7 items-center justify-center gap-1 rounded-full border px-2 text-[11px] font-medium transition-colors disabled:opacity-40';
  const on = 'border-gold/50 bg-gold/10 text-gold';
  const off = 'border-transparent text-muted hover:border-line hover:text-ink';

  return (
    <span className="flex items-center gap-0.5">
      <button
        onClick={() => rec.toggleVerse(verse, 'single')}
        disabled={!rec.ready}
        aria-label={single && busy ? `Pause āyah ${verse}` : `Play āyah ${verse}`}
        title="Play this āyah"
        className={`${btn} w-7 px-0 ${single ? on : off}`}
      >
        {single && state.status === 'loading' ? (
          <Spinner className="h-3 w-3" />
        ) : single && busy ? (
          <PauseIcon className="h-3 w-3" />
        ) : (
          <PlayIcon className="ml-px h-3 w-3" />
        )}
      </button>
      <button
        onClick={() => rec.toggleVerse(verse, 'continuous')}
        disabled={!rec.ready}
        aria-label={cont && busy ? 'Pause recitation' : `Play the surah from āyah ${verse}`}
        title="Play the surah from here"
        className={`${btn} ${cont ? on : off}`}
      >
        {cont && state.status === 'loading' ? (
          <Spinner className="h-3 w-3" />
        ) : cont && busy ? (
          <PauseIcon className="h-3 w-3" />
        ) : (
          <PlayFromIcon className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">From here</span>
      </button>
    </span>
  );
}
