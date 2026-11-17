import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExampleVerse, LemmaFacts, LemmaLink, StatusActions, useExamples } from '../components/VocabBits';
import { findByKey, loadVocab, rootFamily, rootPath, statusOf, vocabTrack, type VocabIndex } from '../lib/vocab';

/** One word (or pronoun, or attached form): facts, examples, progress and its root family. */
export default function LearnWord() {
  const { key = '' } = useParams();
  const [index, setIndex] = useState<VocabIndex | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    loadVocab().then(setIndex).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  const l = useMemo(() => (index ? findByKey(index, key) : null), [index, key]);
  const store = useMemo(() => vocabTrack.read(), [rev, key]);
  const examples = useExamples(l, index?.chunk ?? 250);
  const family = useMemo(() => (index && l?.root ? rootFamily(index, l.root) : []), [index, l]);

  if (err) return <p style={{ color: 'var(--role-negation)' }}>Could not load the vocabulary. {err}</p>;
  if (!index) return <div className="mx-auto h-80 max-w-reading animate-pulse rounded-3xl border border-line bg-surface" />;
  if (!l)
    return (
      <div className="mx-auto flex max-w-reading flex-col items-center gap-3 pt-10 text-center">
        <p className="font-display text-lg font-semibold">That word is not in the index.</p>
        <Link to="/learn" className="text-sm text-gold underline underline-offset-4">
          Back to the learning path
        </Link>
      </div>
    );

  return (
    <div className="mx-auto flex max-w-reading flex-col gap-6">
      <header className="flex flex-col items-center gap-1 pt-4 text-center sm:pt-8">
        <Link to="/learn" className="text-xs text-muted hover:text-ink">
          ← Learning path
        </Link>
        <span className="tnum mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          #{l.id} by frequency · {l.count.toLocaleString()}× {l.kind === 'prefix' || l.kind === 'suffix' ? 'attached' : 'in the Qur’an'}
        </span>
        <h1 lang="ar" className="ar text-[3.4rem] leading-[1.8]">
          {l.lemma}
        </h1>
      </header>

      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <LemmaFacts l={l} />
        <StatusActions l={l} status={statusOf(l, store)} onChange={() => setRev((r) => r + 1)} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">In the Qur’an</h2>
        {examples === null ? (
          <div className="h-24 animate-pulse rounded-xl bg-surface-2/60" />
        ) : examples.length === 0 ? (
          <p className="text-sm text-muted">No example verses.</p>
        ) : (
          examples.map((ex) => <ExampleVerse key={ex.ref} ex={ex} />)
        )}
      </section>

      {l.root && family.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Root family{' '}
              <span lang="ar" className="ar-naskh font-normal text-gold">
                {l.root.split('').join(' ')}
              </span>
            </h2>
            <Link to={rootPath(l.root)} className="text-xs font-medium text-gold underline underline-offset-4">
              Open the family →
            </Link>
          </div>
          <ol className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface [&>li]:border-b [&>li]:border-line/60 [&>li:last-child]:border-b-0">
            {family.slice(0, 6).map((f) => (
              <li key={f.id}>
                <LemmaLink l={f} status={statusOf(f, store)} current={f.id === l.id} />
              </li>
            ))}
          </ol>
          {family.length > 6 && (
            <p className="text-xs text-muted">
              {family.length - 6} more {family.length - 6 === 1 ? 'word' : 'words'} in this family.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
