import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { loadIndex, loadLegend } from '../lib/data';
import { surahStudiedCount, totalStudied } from '../lib/progress';
import type { Legend, SurahMeta } from '../types';
import GrammarLegend from '../components/GrammarLegend';
import HeroMotif from '../components/HeroMotif';
import HeroSky from '../components/HeroSky';
import HeroSpecimen from '../components/HeroSpecimen';
import { loadVocab, mastery, type Mastery } from '../lib/vocab';

type Filter = 'all' | 'meccan' | 'medinan';

/** The landing entrance order: eyebrow, wordmark, headline, sub, stats, buttons, word card. */
const rise = (i: number) => ({ ['--i' as string]: i }) as CSSProperties;

export default function Home() {
  const [index, setIndex] = useState<SurahMeta[] | null>(null);
  const [legend, setLegend] = useState<Legend | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [err, setErr] = useState<string | null>(null);
  const [vocab, setVocab] = useState<Mastery | null>(null);
  const [words, setWords] = useState<number | null>(null);
  const studied = useMemo(() => totalStudied(), []);

  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setErr(String(e)));
    loadLegend().then(setLegend).catch(() => {});
    loadVocab()
      .then((v) => {
        setVocab(mastery(v));
        setWords(v.totals.words);
      })
      .catch(() => {});
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
    <div className="flex flex-col gap-10 sm:gap-12">
      <section data-hero className="hero-bleed hero-under-header hero-bloom relative isolate">
        <HeroSky />
        <HeroMotif className="-z-10" />

        <div className="gutter mx-auto grid max-w-5xl items-center gap-12 pb-16 pt-12 sm:gap-14 sm:pb-24 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-28 lg:pt-24">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="rise mb-5 text-[11px] font-medium uppercase tracking-[0.24em] text-muted" style={rise(0)}>
              Quranic Arabic · word by word
            </span>
            <span className="rise flex flex-col items-center lg:items-start" style={rise(1)}>
              <span lang="ar" className="wordmark-glow ar-title text-[clamp(3rem,15vw,3.6rem)] leading-[1.25] sm:text-[4.8rem]">
                تِبْيَان
              </span>
              <span aria-hidden className="mb-6 mt-2 flex items-center gap-2.5">
                <span className="h-px w-10 bg-gradient-to-l from-accent/50 to-transparent" />
                <span className="h-1.5 w-1.5 rotate-45 border border-accent/60" />
                <span className="h-px w-10 bg-gradient-to-r from-accent/50 to-transparent" />
              </span>
            </span>
            <h1
              className="rise max-w-[34rem] font-display text-[clamp(2rem,9vw,2.5rem)] leading-[1.1] text-balance sm:text-[3.4rem] sm:leading-[1.06]"
              style={rise(2)}
            >
              Understand <em className="text-accent">every word</em> of the Qur&rsquo;an
            </h1>
            <p
              className="rise mt-5 max-w-[34rem] text-[0.98rem] leading-[1.75] text-muted text-pretty sm:mt-6 sm:text-[1.02rem]"
              style={rise(3)}
            >
              Tap any word to see its meaning, grammar, root and form — colour-coded by its role in
              the sentence — with optional tajweed highlighting. Built on the Quranic Arabic Corpus,
              the Tanzil Uthmani text and the Saheeh International translation.
            </p>

            <div className="rise mt-9 w-full sm:w-auto" style={rise(4)}>
              <dl className="tnum mx-auto grid w-full max-w-sm grid-cols-3 divide-x divide-[color:var(--border-strong)] sm:max-w-none lg:mx-0">
                <Stat value="114" label="Surahs" />
                <Stat value={index ? index.reduce((n, s) => n + s.totalVerses, 0).toLocaleString() : '—'} label="Verses" />
                <Stat value={words ? words.toLocaleString() : '—'} label="Words" />
              </dl>
              {studied > 0 && (
                <p className="tnum mt-3 text-xs text-muted">
                  <span className="font-semibold text-accent">{studied.toLocaleString()}</span> verses studied so far
                </p>
              )}
            </div>

            <div className="rise mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row" style={rise(5)}>
              <Link to="/surah/1" className="btn btn-primary btn-lg w-full sm:w-auto">
                Begin with Al-Fātiḥa
                <span aria-hidden>→</span>
              </Link>
              <Link to="/learn" className="btn btn-secondary btn-lg w-full sm:w-auto">
                Learn the vocabulary
              </Link>
            </div>
          </div>

          <div className="rise mx-auto w-full max-w-md lg:max-w-none" style={rise(6)}>
            <HeroSpecimen />
          </div>
        </div>
        {/* the header watches this to know when the hero has scrolled away */}
        <span aria-hidden data-hero-end className="pointer-events-none absolute inset-x-0 bottom-0 h-px" />
      </section>

      {vocab && (
        <Link
          to="/learn"
          className="card card-link group flex items-center gap-4 px-5 py-5"
        >
          <span className="tnum flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-accent/40 bg-accent/[0.06] font-display text-[0.95rem] font-semibold text-accent">
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
            className="field w-full px-4 py-2.5 text-sm placeholder:text-muted/80 sm:max-w-sm"
          />
          <div className="seg self-start text-xs sm:self-auto">
            {(['all', 'meccan', 'medinan'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className="capitalize"
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
        className="card card-link group relative flex items-center gap-4 overflow-hidden px-4 py-3.5"
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-[6px] rotate-45 rounded-[4px] border border-accent/45 transition-colors duration-200 group-hover:border-accent/80 group-hover:bg-accent/10"
          />
          <span className="tnum relative font-display text-[0.8rem] font-semibold text-accent">{s.id}</span>
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
        <li key={i} className="skeleton h-[74px] rounded-[18px]" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </ul>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse items-center gap-1.5 px-3 sm:px-7 lg:items-start lg:first:pl-0">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="font-display text-[1.6rem] leading-none text-accent sm:text-[1.85rem]" style={{ fontWeight: 380 }}>{value}</dd>
    </div>
  );
}
