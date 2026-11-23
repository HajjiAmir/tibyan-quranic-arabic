import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LemmaLink, StatusActions } from '../components/VocabBits';
import { WordCard, useDetail } from '../components/TeachCard';
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
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [key]);

  const l = useMemo(() => (index ? findByKey(index, key) : null), [index, key]);
  const store = useMemo(() => vocabTrack.read(), [rev, key]);
  const detail = useDetail(l, index?.chunk ?? 250);
  const family = useMemo(() => (index && l?.root ? rootFamily(index, l.root) : []), [index, l]);

  if (err) return <p style={{ color: 'var(--role-negation)' }}>Could not load the vocabulary. {err}</p>;
  if (!index) return <div className="mx-auto h-80 max-w-reading skeleton card" />;
  if (!l)
    return (
      <div className="mx-auto flex max-w-reading flex-col items-center gap-3 pt-10 text-center">
        <p className="font-display text-lg font-semibold">That word is not in the index.</p>
        <Link to="/learn" className="tap inline-flex items-center text-sm text-accent underline underline-offset-4">
          Back to the learning path
        </Link>
      </div>
    );

  return (
    <div className="mx-auto flex max-w-reading flex-col gap-7 sm:gap-8">
      <header className="title-bloom flex flex-col items-center gap-1.5 pt-6 text-center sm:pt-10">
        <Link to="/learn" className="tap inline-flex items-center text-xs text-muted hover:text-ink">
          ← Learning path
        </Link>
        <span className="tnum mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          #{l.id} by frequency · {l.count.toLocaleString()}× {l.kind === 'prefix' || l.kind === 'suffix' ? 'attached' : 'in the Qur’an'}
        </span>
        <h1 className="sr-only">{l.lemma}</h1>
      </header>

      <section className="card-raised flex flex-col gap-4 p-5 sm:p-6">
        <WordCard l={l} detail={detail} />
        <StatusActions l={l} status={statusOf(l, store)} onChange={() => setRev((r) => r + 1)} />
      </section>

      {l.root && family.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Root family{' '}
              <span lang="ar" className="ar-naskh font-normal text-accent">
                {l.root.split('').join(' ')}
              </span>
            </h2>
            <Link to={rootPath(l.root)} className="text-xs font-medium text-accent underline underline-offset-4">
              Open the family →
            </Link>
          </div>
          <ol className="flex flex-col overflow-hidden card [&>li]:border-b [&>li]:border-line/60 [&>li:last-child]:border-b-0">
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
