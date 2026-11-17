import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadIndex, loadLegend } from '../lib/data';
import { surahStudiedCount, totalStudied } from '../lib/progress';
import type { Legend, SurahMeta } from '../types';
import GrammarLegend from '../components/GrammarLegend';
import { loadVocab, mastery, type Mastery } from '../lib/vocab';

type Filter = 'all' | 'meccan' | 'medinan';

export default function Home() {
  const [index, setIndex] = useState<SurahMeta[] | null>(null);
  const [legend, setLegend] = useState<Legend | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [err, setErr] = useState<string | null>(null);
  const [vocab, setVocab] = useState<Mastery | null>(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setErr(String(e)));
    loadLegend().then(setLegend).catch(() => {});
    loadVocab().then((v) => setVocab(mastery(v))).catch(() => {});
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
      <section className="flex flex-col items-center gap-4 pb-2 pt-10 text-center sm:pt-14">
        <span className="ar-title text-[2.6rem] leading-none text-gold sm:text-5xl">تِبْيَان</span>
        <h1 className="max-w-reading font-display text-[2rem] font-semibold leading-tight tracking-tight text-balance sm:text-[2.6rem]">
          Understand every word of the Qur&rsquo;an
        </h1>
        <p className="max-w-[38rem] text-[0.95rem] leading-7 text-muted text-pretty">
          Tap any word to see its meaning, grammar, root and form — colour-coded by its role in
          the sentence — with optional tajweed highlighting. Built on the Quranic Arabic Corpus,
          the Tanzil Uthmani text and the Saheeh International translation.
        </p>
        {index && (
          <p className="tnum text-[11px] uppercase tracking-[0.14em] text-muted">
            114 surahs · {index.reduce((n, s) => n + s.totalVerses, 0).toLocaleString()} verses ·{' '}
            {totalStudied()} verses studied
          </p>
        )}
      </section>

      {vocab && (
        <Link
          to="/learn"
          className="group flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4 transition-colors hover:border-gold/50"
        >
          <span className="tnum flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-gold/40 font-display text-[0.95rem] font-semibold text-gold">
            {vocab.coverage === 0 ? '0' : (vocab.coverage * 100).toFixed(vocab.coverage < 0.1 ? 1 : 0)}%
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-display text-[1.05rem] font-semibold">Vocabulary mastery</span>
            <span className="text-[0.85rem] leading-snug text-muted">
              {vocab.known === 0
                ? 'Learn the most frequent words first and watch how much of the Qur’an you understand grow.'
                : `${vocab.known.toLocaleString()} words known — about ${(vocab.coverage * 100).toFixed(1)}% of the words in the Qur’an.${vocab.due ? ` ${vocab.due} due for review.` : ''}`}
            </span>
          </span>
          <span className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      )}

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
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-line/80 bg-surface px-4 py-3.5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-gold/40 hover:shadow-[0_6px_20px_-12px_rgb(var(--ink)/0.25)]"
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-[5px] rotate-45 rounded-[5px] border border-gold/35 transition-colors group-hover:border-gold/70"
          />
          <span className="tnum relative font-display text-[0.8rem] font-semibold text-gold">{s.id}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate font-display text-base font-semibold">{s.transliteration}</h3>
            <span className="ar-title shrink-0 text-[1.35rem] leading-none text-ink/85">{s.name}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-muted">{s.translation}</p>
            <span className="tnum shrink-0 text-[10px] uppercase tracking-[0.1em] text-muted/90">
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
        <li key={i} className="h-[74px] animate-pulse rounded-2xl bg-surface/70" />
      ))}
    </ul>
  );
}
