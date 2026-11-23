import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLabel } from '../lib/learn';
import {
  KIND_LABEL,
  displayMeaning,
  familySense,
  isAttached,
  loadDetail,
  loadRootFamily,
  rootPath,
  type Detail,
  type Example,
  type Form,
  type Lemma,
  type VocabIndex,
} from '../lib/vocab';
import { ExampleVerse } from './VocabBits';

// Teaching cards for the learning loop (brief 16). Every line on them comes from
// the built data: QAC parts of speech, forms and dictionary glosses, Quran.com
// in-context glosses, the reviewed pronoun table and Saheeh International.
// Each meaning is shown with an example of that same meaning.

export function useDetail(l: Lemma | null, chunk: number): Detail | null {
  const [d, setD] = useState<Detail | null>(null);
  useEffect(() => {
    setD(null);
    if (!l) return;
    let live = true;
    loadDetail(l.id, chunk)
      .then((x) => live && setD(x))
      .catch(() => live && setD({ ex: [] }));
    return () => {
      live = false;
    };
  }, [l, chunk]);
  return d;
}

const TENSE: Record<string, string> = {
  PERF: 'Perfect (past)',
  IMPF: 'Imperfect (present)',
  IMPV: 'Imperative (command)',
};

function Section({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{title}</h3>
        {sub && <p className="text-xs leading-relaxed text-muted text-pretty">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Count({ n }: { n: number }) {
  return <span className="tnum shrink-0 text-xs text-muted">{n.toLocaleString()}×</span>;
}

/** The front of a card: the headword alone. */
export function CardFront({ arabic, hint }: { arabic: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-3 text-center">
      <p lang="ar" className="ar text-[3.2rem] leading-[1.9]">
        {arabic}
      </p>
      <p className="text-sm text-muted">{hint}</p>
    </div>
  );
}

/* ------------------------------- word card -------------------------------- */

export function WordCard({ l, detail }: { l: Lemma; detail: Detail | null }) {
  const attached = isAttached(l);
  const uses = detail?.uses ?? [];
  const forms = detail?.forms ?? [];
  const multi = !attached && uses.length >= 2;
  const posLine = l.kind ? KIND_LABEL[l.kind] : l.pos.map(([p]) => p).slice(0, 2).join(' · ');

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col items-center gap-1 text-center">
        <p lang="ar" className="ar text-[3rem] leading-[1.8]">
          {l.lemma}
        </p>
        {!multi && <p className="font-display text-[1.35rem] font-semibold leading-snug">{displayMeaning(l)}</p>}
        <p className="text-xs text-muted">
          {posLine}
          {l.form ? ` · Form ${l.form}` : ''} · <span className="tnum">{l.count.toLocaleString()}×</span>{' '}
          {attached ? 'attached' : 'in the Qur’an'}
          {l.root && (
            <>
              {' · root '}
              <Link to={rootPath(l.root)} className="underline decoration-accent/40 underline-offset-4 hover:text-accent">
                <bdi lang="ar" className="ar-naskh text-[0.95rem]">
                  {l.root.split('').join(' ')}
                </bdi>
              </Link>
            </>
          )}
        </p>
        {!multi && !attached && l.meaning && l.inContext.length > 0 && (
          <p className="text-xs text-muted">In context: {l.inContext.join(' · ')}</p>
        )}
      </header>

      {detail === null && <div className="h-28 skeleton rounded-xl" />}

      {multi && (
        <Section
          title={`${uses.length} uses`}
          sub={
            <>
              <bdi lang="ar" className="ar-naskh text-[0.95rem]">{l.lemma}</bdi> does more than one job. Each use is
              named as the Quranic Arabic Corpus tags it, with a verse that uses it that way.
            </>
          }
        >
          <ol className="flex flex-col gap-3">
            {uses.map((u) => (
              <li key={u.label} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 text-[0.95rem]">
                    <span className="font-semibold">{u.gloss ?? '—'}</span>
                    <span className="text-muted"> · {u.label}</span>
                  </p>
                  <Count n={u.count} />
                </div>
                <ExampleVerse ex={u.ex} compact />
              </li>
            ))}
          </ol>
        </Section>
      )}

      {attached && uses.length > 0 && (
        <Section
          title={l.kind === 'suffix' ? 'Its forms, by what it is attached to' : 'Its uses'}
          sub={
            l.kind === 'suffix'
              ? 'On a noun it shows whose (possessive); on a verb or a preposition it is the object. Each form with its spellings in the Qur’an and a verse that uses it that way.'
              : 'Each use as the Quranic Arabic Corpus tags it, with its English and a verse that uses it that way.'
          }
        >
          <ol className="flex flex-col gap-3">
            {uses.map((u) => (
              <li key={useLabel(u)} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 text-[0.95rem]">
                    <span className="font-semibold">{u.gloss ?? '—'}</span>
                    <span className="text-muted"> · {useLabel(u)}</span>
                  </p>
                  <Count n={u.count} />
                </div>
                {u.spellings && u.spellings.length > 0 && (
                  <p className="text-xs text-muted">
                    Spelled{' '}
                    {u.spellings.map(([sp, n], i) => (
                      <span key={sp}>
                        {i > 0 && ' · '}
                        <bdi lang="ar" className="ar-naskh text-[1.05rem] text-ink">
                          {sp}
                        </bdi>{' '}
                        <span className="tnum">({n})</span>
                      </span>
                    ))}
                  </p>
                )}
                <ExampleVerse ex={u.ex} compact />
              </li>
            ))}
          </ol>
        </Section>
      )}

      {forms.length > 0 && <Forms forms={forms} verb={forms.some((f) => f.tense)} />}

      {!multi && !attached && detail && detail.ex.length > 0 && (
        <Section title="In the Qur’an">
          {detail.ex.map((ex) => (
            <ExampleVerse key={ex.ref} ex={ex} compact />
          ))}
        </Section>
      )}

      {l.spellings && !attached && (
        <p className="text-xs text-muted">
          Spellings:{' '}
          {l.spellings.map((sp, i) => (
            <span key={sp}>
              {i > 0 && ' · '}
              <bdi lang="ar" className="ar-naskh text-[1rem]">
                {sp}
              </bdi>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function Forms({ forms, verb }: { forms: Form[]; verb: boolean }) {
  const groups = verb
    ? (['PERF', 'IMPF', 'IMPV'] as const).map((t) => [t, forms.filter((f) => f.tense === t)] as const).filter(([, g]) => g.length)
    : ([[null, forms]] as const);
  return (
    <Section
      title={verb ? 'Its forms in use' : 'Singular, dual, plural'}
      sub={
        verb
          ? 'The commonest forms of each tense, as the Quranic Arabic Corpus describes them (person, gender, number), each in a verse.'
          : 'Its commonest numbers in the Qur’an, each in a verse.'
      }
    >
      <div className="flex flex-col gap-4">
        {groups.map(([t, g]) => (
          <div key={t ?? 'n'} className="flex flex-col gap-2.5">
            {t && <h4 className="font-display text-[1rem] font-semibold">{TENSE[t]}</h4>}
            {g.map((f) => (
              <FormRow key={f.key} f={f} />
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}

function FormRow({ f }: { f: Form }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <bdi lang="ar" className="ar-naskh shrink-0 text-[1.5rem] leading-[1.6]">
            {f.spell}
          </bdi>
          <span className="min-w-0 text-[0.85rem] leading-snug">
            <span className="text-muted">{f.label}</span>
            {f.here && <span className="font-medium"> · “{f.here}”</span>}
          </span>
        </div>
        <Count n={f.count} />
      </div>
      <ExampleVerse ex={f.ex} compact />
    </div>
  );
}

/* ------------------------------- root card -------------------------------- */

export function useRootFamily(index: VocabIndex, root: string | null) {
  const [fam, setFam] = useState<{ lemma: Lemma; ex: Example | null }[] | null>(null);
  useEffect(() => {
    setFam(null);
    if (!root) return;
    let live = true;
    loadRootFamily(index, root)
      .then((f) => live && setFam(f))
      .catch(() => live && setFam([]));
    return () => {
      live = false;
    };
  }, [index, root]);
  return fam;
}

export function RootCard({ index, root }: { index: VocabIndex; root: string }) {
  const fam = useRootFamily(index, root);
  const stats = index.roots[root];
  const all = (stats?.lemmas ?? []).map((id) => index.lemmas[id - 1]).filter(Boolean);
  const sense = familySense(all);
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col items-center gap-1 text-center">
        <p lang="ar" className="ar-title text-[3.2rem] leading-[1.5] text-accent">
          {root.split('').join(' ')}
        </p>
        <p className="tnum text-xs text-muted">
          {all.length} {all.length === 1 ? 'word' : 'words'} · {stats?.count.toLocaleString()} occurrences
        </p>
      </header>
      <Section
        title="Core sense, through its words"
        sub="The Quranic Arabic Corpus gives meanings for words, not roots, so the sense is shown through the dictionary meanings of its most frequent words."
      >
        <ul className="flex flex-wrap gap-1.5">
          {sense.map((m) => (
            <li key={m} className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-sm font-medium">
              {m}
            </li>
          ))}
        </ul>
      </Section>
      <Section title={all.length > 6 ? `Its family: the ${Math.min(6, all.length)} commonest words` : 'Its family'}>
        {fam === null ? (
          <div className="h-28 skeleton rounded-xl" />
        ) : (
          <ol className="flex flex-col gap-3.5">
            {fam.map(({ lemma: w, ex }) => (
              <li key={w.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <bdi lang="ar" className="ar-naskh shrink-0 text-[1.5rem] leading-[1.6]">
                      {w.lemma}
                    </bdi>
                    <span className="min-w-0 text-[0.88rem] leading-snug">
                      <span className="font-medium">{displayMeaning(w)}</span>
                      <span className="text-muted">
                        {' '}
                        · {w.pos[0]?.[0]}
                        {w.form ? ` · Form ${w.form}` : ''}
                      </span>
                    </span>
                  </div>
                  <Count n={w.count} />
                </div>
                {ex && <ExampleVerse ex={ex} compact />}
              </li>
            ))}
          </ol>
        )}
        {all.length > 6 && (
          <Link to={rootPath(root)} className="tap inline-flex items-center text-xs font-medium text-accent underline underline-offset-4">
            All {all.length} words of this root →
          </Link>
        )}
      </Section>
    </div>
  );
}
