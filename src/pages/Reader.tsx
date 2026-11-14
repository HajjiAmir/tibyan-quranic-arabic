import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadSurah } from '../lib/data';
import { studiedVerses, toggleVerse } from '../lib/progress';
import type { Surah } from '../types';
import Verse from '../components/Verse';

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
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        on ? 'border-gold/50 bg-gold/10 text-gold' : 'border-line text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

export default function Reader() {
  const { id } = useParams();
  const surahId = Number(id);
  const [surah, setSurah] = useState<Surah | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(true);
  const [colorWords, setColorWords] = useState(true);
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

  const progress = useMemo(
    () => (surah ? Math.round((studied.size / surah.totalVerses) * 100) : 0),
    [studied, surah],
  );

  if (err) return <p style={{ color: 'var(--role-negation)' }}>Could not load this surah. {err}</p>;
  if (!surah) return <ReaderSkeleton />;

  return (
    <div className="flex flex-col">
      <header className="relative mb-2 overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(90% 120% at 100% 0%, color-mix(in srgb, rgb(var(--gold)) 14%, transparent), transparent 55%)',
          }}
        />
        <div className="relative flex flex-col items-center gap-2 text-center">
          <span className="tnum text-xs font-medium uppercase tracking-widest text-muted">
            Surah {surah.id} · {surah.type} · {surah.totalVerses} verses
          </span>
          <h1 className="ar text-5xl leading-tight text-gold sm:text-6xl">{surah.name}</h1>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {surah.transliteration}
          </h2>
          <p className="text-sm text-muted">{surah.translation}</p>
          {studied.size > 0 && (
            <div className="mt-2 flex w-full max-w-xs items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-emerald" style={{ width: `${progress}%` }} />
              </div>
              <span className="tnum text-xs text-muted">{studied.size}/{surah.totalVerses}</span>
            </div>
          )}
        </div>
      </header>

      <div className="sticky top-[57px] z-10 -mx-4 mb-2 flex items-center justify-between gap-2 border-b border-line/70 px-4 py-2.5 backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, var(--paper) 86%, transparent)' }}>
        <div className="flex gap-2">
          <Toggle on={colorWords} onClick={() => setColorWords((v) => !v)}>
            Grammar colours
          </Toggle>
          <Toggle on={showTranslation} onClick={() => setShowTranslation((v) => !v)}>
            Translation
          </Toggle>
        </div>
        <Link
          to={`/surah/${surah.id}/practice`}
          className="rounded-full border border-emerald/50 bg-emerald/10 px-3 py-1.5 text-xs font-semibold text-emerald transition-colors hover:bg-emerald/20"
        >
          Practice ✦
        </Link>
      </div>

      <section>
        {surah.verses.map((v) => (
          <Verse
            key={v.id}
            surahId={surah.id}
            verse={v}
            showTranslation={showTranslation}
            colorWords={colorWords}
            studied={studied.has(v.id)}
            onToggleStudied={() => setStudied(new Set(toggleVerse(surah.id, v.id)))}
          />
        ))}
      </section>

      <nav className="mt-8 flex items-center justify-between gap-3">
        {surah.id > 1 ? (
          <Link
            to={`/surah/${surah.id - 1}`}
            className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-gold/50"
          >
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {surah.id < 114 ? (
          <Link
            to={`/surah/${surah.id + 1}`}
            className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-gold/50"
          >
            Next →
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
      <div className="h-48 animate-pulse rounded-3xl border border-line bg-surface" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
      ))}
    </div>
  );
}
