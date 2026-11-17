import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LemmaLink } from '../components/VocabBits';
import { loadVocab, rootFamily, rootPath, statusOf, vocabTrack, type Lemma, type VocabIndex } from '../lib/vocab';

const spaced = (root: string) => root.split('').join(' ');
// Arabic letters only, so a search for "ع ل م" or "علم" both match the root علم.
const lettersOnly = (s: string) => s.replace(/[^ء-يٱ]/g, '');

function useIndex() {
  const [index, setIndex] = useState<VocabIndex | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    loadVocab().then(setIndex).catch((e) => setErr(String(e)));
  }, []);
  return { index, err };
}

/**
 * The words of a root's family carry the meaning; the corpus gives no gloss
 * for a root itself. Shown: the distinct dictionary meanings of its most
 * frequent words.
 */
function familySense(family: Lemma[]): string[] {
  const out: string[] = [];
  for (const l of family) {
    if (!l.meaning) continue;
    const m = l.meaning.trim();
    if (!out.some((o) => o.toLowerCase() === m.toLowerCase())) out.push(m);
    if (out.length >= 4) break;
  }
  return out;
}

/* ------------------------------- one root -------------------------------- */

export function RootFamily() {
  const { root = '' } = useParams();
  const { index, err } = useIndex();
  const store = useMemo(() => vocabTrack.read(), [root]);
  const family = useMemo(() => (index ? rootFamily(index, root) : []), [index, root]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [root]);

  if (err) return <p style={{ color: 'var(--role-negation)' }}>Could not load the vocabulary. {err}</p>;
  if (!index) return <div className="mx-auto h-80 max-w-reading skeleton card" />;
  const stats = index.roots[root];
  if (!stats || family.length === 0)
    return (
      <div className="mx-auto flex max-w-reading flex-col items-center gap-3 pt-10 text-center">
        <p className="font-display text-lg font-semibold">That root is not in the index.</p>
        <Link to="/learn/roots" className="tap inline-flex items-center text-sm text-accent underline underline-offset-4">
          All roots
        </Link>
      </div>
    );

  const known = family.filter((l) => statusOf(l, store) === 'known').length;
  const sense = familySense(family);
  const rank = Object.keys(index.roots).indexOf(root) + 1;

  return (
    <div className="mx-auto flex max-w-reading flex-col gap-7 sm:gap-8">
      <header className="title-bloom flex flex-col items-center gap-1.5 pt-6 text-center sm:pt-10">
        <Link to="/learn/roots" className="tap inline-flex items-center text-xs text-muted hover:text-ink">
          ← All roots
        </Link>
        <span className="tnum mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Root family · #{rank} of {index.totals.roots.toLocaleString()}
        </span>
        <h1 lang="ar" className="ar-title text-[3.6rem] leading-[1.5] text-accent">
          {spaced(root)}
        </h1>
        <p className="tnum text-sm text-muted">
          {family.length} {family.length === 1 ? 'word' : 'words'} · {stats.count.toLocaleString()} occurrences ·{' '}
          {known} known
        </p>
      </header>

      <section className="card-raised flex flex-col gap-2 p-5 sm:p-6">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Core sense, through its words</h2>
        {sense.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {sense.map((m) => (
              <li key={m} className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-sm font-medium">
                {m}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">None of its words has a dictionary meaning in the corpus yet; see each word below.</p>
        )}
        <p className="text-xs leading-relaxed text-muted text-pretty">
          The Quranic Arabic Corpus gives meanings for words, not for roots, so the family’s sense is shown through the
          dictionary meanings of its most frequent words.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">Every word from this root</h2>
        <ol className="flex flex-col overflow-hidden card [&>li]:border-b [&>li]:border-line/60 [&>li:last-child]:border-b-0">
          {family.map((l) => (
            <li key={l.id}>
              <LemmaLink l={l} status={statusOf(l, store)} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/* ------------------------------- all roots ------------------------------- */

const PAGE = 30;

export function RootsIndex() {
  const { index, err } = useIndex();
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);
  const store = useMemo(() => vocabTrack.read(), []);

  const rows = useMemo(() => {
    if (!index) return [];
    const needle = lettersOnly(q);
    return Object.entries(index.roots)
      .filter(([r]) => !needle || r.includes(needle))
      .map(([r, s]) => {
        const fam = s.lemmas.map((id) => index.lemmas[id - 1]).filter(Boolean);
        return { root: r, count: s.count, fam, known: fam.filter((l) => statusOf(l, store) === 'known').length };
      });
  }, [index, q, store]);

  useEffect(() => {
    setShown(PAGE);
  }, [q]);

  if (err) return <p style={{ color: 'var(--role-negation)' }}>Could not load the vocabulary. {err}</p>;
  if (!index) return <div className="mx-auto h-80 max-w-reading skeleton card" />;

  return (
    <div className="mx-auto flex max-w-reading flex-col gap-7 sm:gap-8">
      <header className="title-bloom flex flex-col items-center gap-2 pt-6 text-center sm:pt-10">
        <Link to="/learn" className="tap inline-flex items-center text-xs text-muted hover:text-ink">
          ← Learning path
        </Link>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Root families</span>
        <h1 className="font-display text-[1.9rem] font-semibold leading-tight tracking-tight">
          {index.totals.roots.toLocaleString()} roots, most frequent first
        </h1>
        <p className="max-w-md text-sm text-muted text-pretty">
          Most Arabic words grow from a root of three letters. Learn a family together and its words reinforce each other.
        </p>
      </header>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Find a root (Arabic letters)</span>
        <input
          lang="ar"
          dir="rtl"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ع ل م"
          className="field ar-naskh px-4 py-2 text-xl"
        />
      </label>

      <ol className="flex flex-col overflow-hidden card">
        {rows.slice(0, shown).map((r) => (
          <li key={r.root} className="border-b border-line/60 last:border-b-0">
            <Link
              to={rootPath(r.root)}
              className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-surface-2/40 sm:px-4"
            >
              <span lang="ar" className="ar-naskh w-[5.5rem] shrink-0 text-right text-[1.4rem] leading-[1.6] text-accent sm:w-24">
                {spaced(r.root)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[0.92rem] font-medium">
                  {familySense(r.fam).slice(0, 2).join(' · ') || r.fam[0]?.inContext[0] || '—'}
                </span>
                <span className="tnum truncate text-[11px] text-muted">
                  {r.fam.length} {r.fam.length === 1 ? 'word' : 'words'}
                  {r.known ? ` · ${r.known} known` : ''}
                </span>
              </span>
              <span className="tnum shrink-0 text-xs text-muted">{r.count.toLocaleString()}×</span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">No root matches.</li>}
      </ol>
      {shown < rows.length && (
        <button
          onClick={() => setShown((n) => n + PAGE)}
          className="btn btn-secondary self-center font-medium"
        >
          Show {Math.min(PAGE, rows.length - shown)} more
        </button>
      )}
    </div>
  );
}

/** A short strip of the most frequent root families, for the Learn page. */
export function RootsPreview({ index }: { index: VocabIndex }) {
  const top = Object.entries(index.roots).slice(0, 8);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Root families</h2>
          <p className="text-xs text-muted">Study a root with every word built from it.</p>
        </div>
        <Link to="/learn/roots" className="tap inline-flex items-center text-xs font-medium text-accent underline underline-offset-4">
          All {index.totals.roots.toLocaleString()} roots →
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {top.map(([r, s]) => {
          const fam = rootFamily(index, r);
          return (
            <li key={r}>
              <Link
                to={rootPath(r)}
                className="card card-link flex h-full flex-col gap-0.5 px-3.5 py-3"
              >
                <span lang="ar" className="ar-naskh text-[1.5rem] leading-[1.5] text-accent">
                  {spaced(r)}
                </span>
                <span className="truncate text-xs font-medium">{familySense(fam)[0] ?? fam[0]?.inContext[0] ?? ''}</span>
                <span className="tnum text-[11px] text-muted">
                  {fam.length} words · {s.count.toLocaleString()}×
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
