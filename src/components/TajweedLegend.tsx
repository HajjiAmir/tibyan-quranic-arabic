import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadTajweedGuide, tajweedVar } from '../lib/data';
import type { TajweedGuide, TajweedGuideEntry, TajweedLegend as Legend, TajweedRule } from '../types';
import { tajweedPieces } from './TajweedText';

/**
 * The tajweed colour key as a teaching legend: each rule with its name, a short
 * beginner explanation (summarised from cited references, see
 * scripts/build-tajweed-guide.mjs) and a real example from the coloured data,
 * with only that rule's letters in its colour.
 */
const SECTIONS: { title: string; rules: TajweedRule[] }[] = [
  { title: 'Letters joined or left unsaid', rules: ['hamzat_wasl', 'lam_shamsiyyah', 'silent'] },
  { title: 'Lengthening (madd)', rules: ['madd_2', 'madd_246', 'madd_munfasil', 'madd_muttasil', 'madd_6'] },
  {
    title: 'Nūn, mīm and the nasal hum',
    rules: [
      'ghunnah',
      'ikhfa',
      'ikhfa_shafawi',
      'iqlab',
      'idghaam_ghunnah',
      'idghaam_no_ghunnah',
      'idghaam_shafawi',
      'idghaam_mutajanisayn',
      'idghaam_mutaqaribayn',
    ],
  },
  { title: 'The echo', rules: ['qalqalah'] },
];

const SWATCHES = ['silent', 'madd2', 'madd45', 'madd6', 'ghunnah', 'ikhfa', 'idgham', 'qalqalah'] as const;

export default function TajweedLegend({ legend }: { legend: Legend }) {
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState<TajweedGuide | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (open && !guide) loadTajweedGuide().then(setGuide).catch(() => setErr(true));
  }, [open, guide]);

  return (
    <section className="card mb-2 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="tap-y flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-display text-[1rem] font-semibold">Tajweed guide</span>
          <span className="flex items-center gap-2 text-xs text-muted">
            <span className="flex gap-1" aria-hidden>
              {SWATCHES.map((g) => (
                <span key={g} className="h-2.5 w-2.5 rounded-full" style={{ background: tajweedVar(g) }} />
              ))}
            </span>
            What each colour means, with an example
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium text-accent">{open ? 'Hide' : 'Open'}</span>
      </button>

      {open && (
        <div className="border-t border-line px-3 pb-4 pt-3 sm:px-4">
          <p className="mb-4 px-1 text-[12px] leading-relaxed text-muted">
            Each colour marks a recitation rule (Ḥafṣ ʿan ʿĀṣim). The explanations are short summaries of the
            sources named under each rule, written for beginners; the coloured examples come straight from the
            text. Rules are marked by an automated classifier (
            <a
              className="hit underline decoration-line underline-offset-2 hover:text-ink"
              href="https://github.com/cpfair/quran-tajweed"
              target="_blank"
              rel="noreferrer"
            >
              cpfair/quran-tajweed
            </a>
            ). Learn recitation with a qualified teacher.
          </p>
          {err && <p className="px-1 text-sm text-muted">Could not load the guide.</p>}
          {!guide && !err && <div className="skeleton h-40 rounded-xl" />}
          {guide && (
            <div className="flex flex-col gap-6">
              {SECTIONS.map((sec) => (
                <div key={sec.title} className="flex flex-col gap-2.5">
                  <h3 className="px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{sec.title}</h3>
                  <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    {sec.rules.map((rule) => {
                      const g = guide.rules[rule];
                      if (!g || !legend[rule]) return null;
                      return <RuleCard key={rule} rule={rule} g={g} guide={guide} />;
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function RuleCard({ rule, g, guide }: { rule: TajweedRule; g: TajweedGuideEntry; guide: TajweedGuide }) {
  const colour = tajweedVar(g.group);
  const ex = g.example;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-paper/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colour }} />
            <span className="font-display text-[1.02rem] font-semibold leading-snug">{g.label}</span>
          </span>
          <span lang="ar" className="ar-naskh text-[0.95rem] leading-[1.6] text-muted">
            {g.arabic}
          </span>
        </span>
        {ex && (
          <Link
            to={`/surah/${ex.surah}?v=${ex.verse}`}
            className="tap inline-flex shrink-0 items-center justify-end text-[11px] font-medium text-accent hover:underline"
          >
            {ex.surah}:{ex.verse}
          </Link>
        )}
      </div>

      {ex && (
        <p
          lang="ar"
          dir="rtl"
          className="ar rounded-xl bg-surface-2/40 px-3 py-1 text-center text-[1.75rem] leading-[2]"
          aria-label={`Example from ${ex.surah}:${ex.verse}`}
        >
          {tajweedPieces(
            ex.text,
            ex.marks.map(([s, e]) => [s, e, rule]),
          ).map((p, i) => (
            <span key={i} style={p.rule ? { color: colour } : undefined}>
              {p.text}
            </span>
          ))}
        </p>
      )}

      <div className="flex flex-col gap-1.5 text-[0.88rem] leading-relaxed">
        <p>
          <span className="font-semibold">What it is. </span>
          <span className="text-muted">{g.what}</span>
        </p>
        <p>
          <span className="font-semibold">What you do. </span>
          <span className="text-muted">{g.how}</span>
        </p>
      </div>

      <p className="text-[11px] leading-snug text-muted/90">
        <span className="tnum">Marked {g.count.toLocaleString()} times in the Qur’an.</span> Source:{' '}
        {g.sources.map((k, i) => {
          const s = guide.sources[k];
          if (!s) return null;
          return (
            <span key={k}>
              {i > 0 && '; '}
              <a href={s.url} target="_blank" rel="noreferrer" className="hit underline decoration-line underline-offset-2 hover:text-ink">
                {s.title}
              </a>
            </span>
          );
        })}
        .
      </p>
    </li>
  );
}
