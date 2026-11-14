import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadIndex, loadLegend } from '../lib/data';
import { surahStudiedCount, totalStudied } from '../lib/progress';
import type { Legend, SurahMeta } from '../types';
import GrammarLegend from '../components/GrammarLegend';

type Filter = 'all' | 'meccan' | 'medinan';

export default function Home() {
  const [index, setIndex] = useState<SurahMeta[] | null>(null);
  const [legend, setLegend] = useState<Legend | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setErr(String(e)));
    loadLegend().then(setLegend).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!index) return [];
    const needle = q.trim().toLowerCase();
    return index.filter((s) => {
      if (filter !== 'all' && s.type !== filter) return false;
      if (!needle) return true;
      return (
        s.transliteration.toLowerCase().includes(needle) ||
        s.translation.toLowerCase().includes(needle) ||
        s.name.includes(q.trim()) ||
        String(s.id) === needle
      );
    });
  }, [index, q, filter]);

  if (err) return <p style={{ color: 'var(--role-negation)' }}>Could not load data. {err}</p>;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col items-center gap-3 pt-4 text-center">
        <h1 className="max-w-reading font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Understand every word of the Qur&rsquo;an
        </h1>
        <p className="max-w-reading text-sm leading-relaxed text-muted">
          Tap any word to see its meaning, grammar, root and form — colour-coded by its role in
          the sentence — with optional tajweed highlighting. Built on the Quranic Arabic Corpus,
          the Tanzil Uthmani text and the Saheeh International translation.
        </p>
        {index && (
          <p className="tnum text-xs text-muted">
            114 surahs · {index.reduce((n, s) => n + s.totalVerses, 0).toLocaleString()} verses ·{' '}
            {totalStudied()} verses studied
          </p>
        )}
      </section>

      {legend && <GrammarLegend legend={legend} />}

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            id="surah-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a surah by name or number…"
            className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/70 focus:border-gold sm:max-w-sm"
          />
          <div className="flex gap-1.5 rounded-xl border border-line bg-surface p-1 text-xs">
            {(['all', 'meccan', 'medinan'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 font-medium capitalize transition-colors ${
                  filter === f ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {!index ? (
          <SkeletonGrid />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <SurahCard key={s.id} s={s} />
            ))}
          </ul>
        )}
        {index && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">No surah matches &ldquo;{q}&rdquo;.</p>
        )}
      </section>
    </div>
  );
}

function SurahCard({ s }: { s: SurahMeta }) {
  const studied = surahStudiedCount(s.id);
  const pct = Math.round((studied / s.totalVerses) * 100);
  return (
    <li>
      <Link
        to={`/surah/${s.id}`}
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-lg"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2">
          <span className="tnum font-display text-sm font-semibold text-gold">{s.id}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate font-display text-base font-semibold">{s.transliteration}</h3>
            <span className="ar shrink-0 text-xl text-ink/90">{s.name}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-muted">{s.translation}</p>
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted">
              {s.type} · {s.totalVerses}
            </span>
          </div>
          {studied > 0 && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-emerald" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <li key={i} className="h-[78px] animate-pulse rounded-2xl border border-line bg-surface" />
      ))}
    </ul>
  );
}
