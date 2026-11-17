import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { loadIndex, loadSurah, loadTajweedLegend } from '../lib/data';
import { BASMALA, useRecitation } from '../lib/useRecitation';
import { ListenToggle, PlayerRow, RecitationCredit } from '../components/AudioControls';
import { studiedVerses, toggleVerse } from '../lib/progress';
import type { Surah, TajweedLegend as TajweedLegendT } from '../types';
import Verse from '../components/Verse';
import TajweedLegend from '../components/TajweedLegend';
import SurahContext from '../components/SurahContext';
import { usePhone } from '../lib/useMedia';

// Reader display preferences, remembered per browser.
const PREFS_KEY = 'tibyan.reader.v1';
interface Prefs {
  translation: boolean;
  colors: boolean;
  gloss: boolean;
  tajweed: boolean;
}
const DEFAULT_PREFS: Prefs = { translation: true, colors: true, gloss: true, tajweed: false };

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`tap flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        on
          ? 'border-line bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.05)]'
          : 'border-transparent text-muted hover:text-ink'
      }`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-line'}`} />
      {children}
    </button>
  );
}

function Ornament() {
  return (
    <div aria-hidden className="flex items-center justify-center gap-3 text-accent/70">
      <span className="h-px w-12 bg-gradient-to-l from-accent/50 to-transparent" />
      <span className="h-1.5 w-1.5 rotate-45 bg-accent/60" />
      <span className="h-px w-12 bg-gradient-to-r from-accent/50 to-transparent" />
    </div>
  );
}

const navLink = 'group btn btn-secondary btn-pill font-medium text-muted hover:text-ink';

export default function Reader() {
  const { id } = useParams();
  const surahId = Number(id);
  // ?v=<verse>: open at that verse (links from vocabulary examples).
  const [params] = useSearchParams();
  const targetVerse = Number(params.get('v')) || null;
  const [surah, setSurah] = useState<Surah | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(readPrefs);
  const [tajweedLegend, setTajweedLegend] = useState<TajweedLegendT | null>(null);
  const [studied, setStudied] = useState<Set<number>>(new Set());
  // Global āyah number of this surah's first verse minus one (audio files are
  // numbered 1–6236), derived from the verse counts in index.json.
  // Both are kept with the surah they belong to: for one render after a surah
  // change they still hold the previous surah's values, which the player must
  // never use.
  const [offsetFor, setOffsetFor] = useState<{ id: number; offset: number } | null>(null);
  const globalOffset = offsetFor && offsetFor.id === surahId ? offsetFor.offset : null;
  const rec = useRecitation(surahId, surah && surah.id === surahId ? surah.totalVerses : 0, globalOffset);
  const phone = usePhone();
  const recitingVerse = rec.state.verse;
  const following = rec.state.plan != null && rec.state.plan.mode !== 'single';

  useEffect(() => {
    loadIndex()
      .then((idx) =>
        setOffsetFor({ id: surahId, offset: idx.filter((m) => m.id < surahId).reduce((n, m) => n + m.totalVerses, 0) }),
      )
      .catch(() => {});
  }, [surahId]);

  // Keep the āyah being recited in view, gently, during continuous play.
  useEffect(() => {
    if (recitingVerse == null || !following) return;
    const el = document.getElementById(recitingVerse === BASMALA ? 'basmala' : `v${recitingVerse}`);
    if (!el) return;
    // Below the sticky toolbar (its height changes with the player row).
    const bar = document.getElementById('reader-toolbar');
    const top = (bar ? bar.getBoundingClientRect().bottom : 16 * 9.5) + 12;
    const r = el.getBoundingClientRect();
    const fits = r.height < window.innerHeight - top;
    const visible = r.top >= top - 8 && (fits ? r.bottom <= window.innerHeight : r.top < window.innerHeight / 2);
    if (visible) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: window.scrollY + r.top - top, behavior: reduce ? 'auto' : 'smooth' });
  }, [recitingVerse, following]);

  useEffect(() => {
    setSurah(null);
    setErr(null);
    window.scrollTo(0, 0);
    loadSurah(surahId)
      .then((s) => {
        setSurah(s);
        setStudied(studiedVerses(surahId));
      })
      .catch((e) => setErr(String(e)));
  }, [surahId]);

  // Jump to ?v= once the surah is on screen, and mark the verse briefly. The
  // surah's context panel loads after the verses and can push them down, so
  // the jump is repeated until the reader scrolls on their own.
  useEffect(() => {
    if (!surah || !targetVerse) return;
    const el = document.getElementById(`v${targetVerse}`);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let userMoved = false;
    const stop = () => (userMoved = true);
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchmove', stop, { passive: true });
    window.addEventListener('keydown', stop);
    // Just below the sticky toolbar, whose height depends on the width and
    // on whether the player row is open.
    const jump = () => {
      if (userMoved) return;
      const bar = document.getElementById('reader-toolbar');
      const top = (bar ? bar.getBoundingClientRect().bottom : 160) + 12;
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - top, behavior: 'auto' });
    };
    const raf = requestAnimationFrame(jump);
    const timers = [250, 700, 1500].map((t) => window.setTimeout(jump, t));
    el.classList.add('verse-target');
    const clear = window.setTimeout(() => el.classList.remove('verse-target'), reduce ? 1200 : 2600);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      clearTimeout(clear);
      el.classList.remove('verse-target');
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
      window.removeEventListener('keydown', stop);
    };
  }, [surah, targetVerse]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  useEffect(() => {
    loadTajweedLegend()
      .then(setTajweedLegend)
      .catch(() => {});
  }, []);

  const toggle = (k: keyof Prefs) => () => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const progress = useMemo(() => (surah ? Math.round((studied.size / surah.totalVerses) * 100) : 0), [studied, surah]);

  if (err) return <p style={{ color: 'var(--role-negation)' }}>Could not load this surah. {err}</p>;
  if (!surah) return <ReaderSkeleton />;

  return (
    <div className="mx-auto flex max-w-[52rem] flex-col">
      <header className="flex flex-col items-center gap-3 pb-8 pt-6 text-center sm:pt-10">
        <span className="tnum text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Surah {surah.id} · {surah.type === 'meccan' ? 'Meccan' : 'Medinan'} · {surah.totalVerses} verses
        </span>
        <h1 className="ar-title text-[3.4rem] text-accent sm:text-[4.2rem]">{surah.name}</h1>
        <div className="flex flex-col items-center gap-1">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{surah.transliteration}</h2>
          <p className="font-display text-[0.95rem] italic text-muted">{surah.translation}</p>
        </div>
        {studied.size > 0 && (
          <div className="mt-2 flex w-full max-w-[14rem] items-center gap-2.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-emerald" style={{ width: `${progress}%` }} />
            </div>
            <span className="tnum text-[11px] text-muted">
              {studied.size}/{surah.totalVerses}
            </span>
          </div>
        )}
        <div className="mt-3">
          <Ornament />
        </div>
      </header>

      <SurahContext surahId={surah.id} />

      <div
        id="reader-toolbar"
        className="sticky z-10 -mx-4 mb-2 flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-4 py-2 backdrop-blur-md"
        style={{
          top: 'calc(4rem + env(safe-area-inset-top, 0px))',
          background: 'color-mix(in srgb, rgb(var(--paper)) 88%, transparent)',
        }}
      >
        <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 basis-0 gap-0.5 overflow-x-auto px-1 py-0.5">
          <Toggle on={prefs.gloss} onClick={toggle('gloss')}>
            Meanings
          </Toggle>
          <Toggle on={prefs.colors} onClick={toggle('colors')}>
            Grammar
          </Toggle>
          <Toggle on={prefs.tajweed} onClick={toggle('tajweed')}>
            Tajweed
          </Toggle>
          <Toggle on={prefs.translation} onClick={toggle('translation')}>
            Translation
          </Toggle>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ListenToggle rec={rec} />
          <Link
            to={`/surah/${surah.id}/practice`}
            className="tap inline-flex shrink-0 items-center rounded-full border border-emerald/40 bg-emerald/10 px-3.5 py-1 text-xs font-semibold text-emerald transition-colors hover:bg-emerald/15"
          >
            Practice
          </Link>
        </div>
        {!phone && (rec.open || recitingVerse != null) && (
          <div className="min-w-0 basis-full">
            <PlayerRow rec={rec} totalVerses={surah.totalVerses} />
          </div>
        )}
      </div>

      {prefs.tajweed && tajweedLegend && (
        <div className="mt-3">
          <TajweedLegend legend={tajweedLegend} />
        </div>
      )}

      {surah.bismillah && (
        <p
          id="basmala"
          aria-current={recitingVerse === BASMALA ? 'true' : undefined}
          title={rec.basmalaAvailable ? 'Recited before āyah 1 when you play from the start' : undefined}
          className={`ar scroll-mt-40 pb-2 pt-10 text-center text-[2.1rem] leading-[2] transition-colors duration-500 sm:text-[2.5rem] ${
            recitingVerse === BASMALA ? 'text-accent' : 'text-ink/90'
          }`}
        >
          {surah.bismillah}
        </p>
      )}

      <section>
        {surah.verses.map((v) => (
          <Verse
            key={v.id}
            surahId={surah.id}
            verse={v}
            showTranslation={prefs.translation}
            colorWords={prefs.colors}
            showGloss={prefs.gloss}
            tajweed={prefs.tajweed}
            tajweedLegend={tajweedLegend}
            studied={studied.has(v.id)}
            onToggleStudied={() => setStudied(new Set(toggleVerse(surah.id, v.id)))}
            rec={rec}
          />
        ))}
      </section>

      <RecitationCredit rec={rec} />

      <nav className="mt-12 flex items-center justify-between gap-3">
        {surah.id > 1 ? (
          <Link to={`/surah/${surah.id - 1}`} className={navLink}>
            <span className="transition-transform group-hover:-translate-x-0.5">←</span> Surah {surah.id - 1}
          </Link>
        ) : (
          <span />
        )}
        {surah.id < 114 ? (
          <Link to={`/surah/${surah.id + 1}`} className={navLink}>
            Surah {surah.id + 1} <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {phone && (rec.open || recitingVerse != null) && (
        <PhoneDock>
          <PlayerRow rec={rec} totalVerses={surah.totalVerses} docked />
        </PhoneDock>
      )}
    </div>
  );
}

/**
 * The phone player: a bar fixed to the bottom of the screen, above the home
 * indicator, so play and pause sit under the thumb and the top of the screen
 * stays for the text. A spacer of the same height keeps the last āyah reachable.
 */
function PhoneDock({ children }: { children: ReactNode }) {
  const bar = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <>
      <div aria-hidden style={{ height: h }} />
      {/* Portalled to <body>: the page fade's transform would otherwise pin "fixed" to the page, not the screen. */}
      {createPortal(
        <div
          ref={bar}
          data-dock=""
          className="gutter fixed inset-x-0 bottom-0 z-30 border-t border-line/70 pt-2 backdrop-blur-md"
          style={{
            background: 'color-mix(in srgb, rgb(var(--paper)) 92%, transparent)',
            paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
            boxShadow: '0 -14px 40px -24px rgb(0 0 0 / 0.5)',
          }}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}

function ReaderSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto mt-8 h-40 w-full max-w-[52rem] animate-pulse rounded-3xl bg-surface/70" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mx-auto h-28 w-full max-w-[52rem] animate-pulse rounded-2xl bg-surface/70" />
      ))}
    </div>
  );
}
