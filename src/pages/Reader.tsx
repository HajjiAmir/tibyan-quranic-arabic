import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadSurah, loadTajweedLegend } from '../lib/data';
import { studiedVerses, toggleVerse } from '../lib/progress';
import type { Surah, TajweedLegend as TajweedLegendT } from '../types';
import Verse from '../components/Verse';
import TajweedLegend from '../components/TajweedLegend';

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

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        on
          ? 'border-line bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.05)]'
          : 'border-transparent text-muted hover:text-ink'
      }`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full transition-colors ${on ? 'bg-gold' : 'bg-line'}`}
      />
      {children}
    </button>
  );
}

function Ornament() {
  return (
    <div aria-hidden className="flex items-center justify-center gap-3 text-gold/70">
      <span className="h-px w-12 bg-gradient-to-l from-gold/50 to-transparent" />
      <span className="h-1.5 w-1.5 rotate-45 bg-gold/60" />
      <span className="h-px w-12 bg-gradient-to-r from-gold/50 to-transparent" />
    </div>
  );
}

const navLink =
  'group flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-gold/50 hover:text-ink';

export default function Reader() {
  const { id } = useParams();
  const surahId = Number(id);
  const [surah, setSurah] = useState<Surah | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(readPrefs);
  const [tajweedLegend, setTajweedLegend] = useState<TajweedLegendT | null>(null);
  const [studied, setStudied] = useState<Set<number>>(new Set());

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

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  useEffect(() => {
    loadTajweedLegend().then(setTajweedLegend).catch(() => {});
  }, []);

  const toggle = (k: keyof Prefs) => () => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const progress = useMemo(
    () => (surah ? Math.round((studied.size / surah.totalVerses) * 100) : 0),
    [studied, surah],
  );

  if (err) return <p style={{ color: 'var(--role-negation)' }}>Could not load this surah. {err}</p>;
  if (!surah) return <ReaderSkeleton />;

  return (
    <div className="mx-auto flex max-w-[52rem] flex-col">
      <header className="flex flex-col items-center gap-3 pb-8 pt-6 text-center sm:pt-10">
        <span className="tnum text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Surah {surah.id} · {surah.type === 'meccan' ? 'Meccan' : 'Medinan'} · {surah.totalVerses}{' '}
          verses
        </span>
        <h1 className="ar-title text-[3.4rem] text-gold sm:text-[4.2rem]">{surah.name}</h1>
        <div className="flex flex-col items-center gap-1">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {surah.transliteration}
          </h2>
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

      <div
        className="sticky top-16 z-10 -mx-4 mb-2 flex items-center justify-between gap-3 border-b border-line/60 px-4 py-2 backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, rgb(var(--paper)) 88%, transparent)' }}
      >
        <div className="no-scrollbar -mx-1 flex min-w-0 gap-0.5 overflow-x-auto px-1 py-0.5">
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
        <Link
          to={`/surah/${surah.id}/practice`}
          className="shrink-0 rounded-full border border-emerald/40 bg-emerald/10 px-3.5 py-1 text-xs font-semibold text-emerald transition-colors hover:bg-emerald/15"
        >
          Practice
        </Link>
      </div>

      {prefs.tajweed && tajweedLegend && (
        <div className="mt-3">
          <TajweedLegend legend={tajweedLegend} />
        </div>
      )}

      {surah.bismillah && (
        <p className="ar pb-2 pt-10 text-center text-[2.1rem] leading-[2] text-ink/90 sm:text-[2.5rem]">
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
          />
        ))}
      </section>

      <nav className="mt-12 flex items-center justify-between gap-3">
        {surah.id > 1 ? (
          <Link to={`/surah/${surah.id - 1}`} className={navLink}>
            <span className="transition-transform group-hover:-translate-x-0.5">←</span> Surah{' '}
            {surah.id - 1}
          </Link>
        ) : (
          <span />
        )}
        {surah.id < 114 ? (
          <Link to={`/surah/${surah.id + 1}`} className={navLink}>
            Surah {surah.id + 1}{' '}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
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
