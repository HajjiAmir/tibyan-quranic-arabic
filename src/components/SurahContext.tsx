import { useEffect, useId, useState, type ReactNode } from 'react';
import { loadContext } from '../lib/data';
import type { ContextQuote, SurahContext as Ctx, VirtueNarration } from '../types';

// Per-surah "Context & Virtues": a short sourced background, then any virtue
// narrations that met the grading rule. Everything shown is built from cited
// sources by scripts/build-context.mjs; until the owner's reviewer signs off
// the data says review.status = 'pending' and this section stays behind a
// visible draft banner.

const OPEN_KEY = 'tibyan.context.v1';
const readOpen = () => {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) ?? 'false') === true;
  } catch {
    return false;
  }
};

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

const GRADE_LABEL: Record<string, string> = { sahih: 'Ṣaḥīḥ', hasan: 'Ḥasan', 'hasan sahih': 'Ḥasan ṣaḥīḥ' };
const gradeLabel = (g: string) => GRADE_LABEL[g.toLowerCase()] ?? g;

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-0.5 underline decoration-line underline-offset-2 transition-colors hover:text-ink hover:decoration-gold/60"
    >
      {children}
      <span aria-hidden className="text-[0.8em]">↗</span>
    </a>
  );
}

function DraftPill() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-draft-line bg-draft-bg px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-draft">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-draft" />
      Draft<span className="hidden sm:inline"> · pending review</span>
    </span>
  );
}

function DraftBanner() {
  return (
    <div role="note" className="flex gap-3 rounded-xl border border-draft-line bg-draft-bg px-4 py-3 text-draft">
      <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor">
        <path d="M10 1.5a1 1 0 0 1 .87.5l7.5 13a1 1 0 0 1-.87 1.5h-15a1 1 0 0 1-.87-1.5l7.5-13a1 1 0 0 1 .87-.5Zm0 5a.9.9 0 0 0-.9.9v3.7a.9.9 0 0 0 1.8 0V7.4a.9.9 0 0 0-.9-.9Zm0 7.9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
      </svg>
      <div className="text-[0.84rem] leading-relaxed">
        <p className="font-semibold">Draft — pending scholarly review</p>
        <p className="mt-0.5 opacity-90">
          Nothing here has yet been checked by a qualified reviewer, and every entry is marked unverified. Narrations
          appear only when graded ṣaḥīḥ or ḥasan by a named authority, with the grading and a link to the source.
          Please check them at the source before relying on them.
        </p>
      </div>
    </div>
  );
}

function Quote({ label, q }: { label: string; q: ContextQuote }) {
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</figcaption>
      <blockquote className="border-l-2 border-gold/40 pl-3.5 font-display text-[0.95rem] leading-relaxed text-ink/90">
        {q.text}
        {q.truncated ? ' …' : ''}
      </blockquote>
    </figure>
  );
}

function Narration({ v, draft }: { v: VirtueNarration; draft: boolean }) {
  const collectionItem = v.sources.find((s) => s.url.includes('/virtues:'));
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line/80 bg-paper/50 p-4">
      <div className="flex items-start justify-between gap-3">
        {v.heading ? (
          <h4 className="font-display text-[0.98rem] font-semibold leading-snug">{v.heading.en}</h4>
        ) : (
          <h4 className="font-display text-[0.98rem] font-semibold leading-snug">{v.reference}</h4>
        )}
        {draft && !v.verified && (
          <span className="shrink-0 rounded-full border border-draft-line px-1.5 py-px text-[10px] font-medium text-draft">
            Unverified
          </span>
        )}
      </div>

      <p className="text-[0.9rem] leading-relaxed text-ink/90">{v.en}</p>

      {/* The full Arabic as the collection prints it (chain included), so it
          always matches the English above. */}
      <p lang="ar" dir="rtl" className="ar-naskh text-[1.2rem] leading-[2] text-ink/90">
        {v.ar}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line/60 pt-2.5 text-xs text-muted">
        <span className="tnum font-medium text-ink/80">{v.reference}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/10 px-2 py-0.5 text-emerald">
          <span className="font-semibold">{gradeLabel(v.grade.label)}</span>
          <span className="opacity-80">
            {v.grade.source === 'collection' ? v.grade.by.replace('Included in', 'in') : `graded by ${v.grade.by}`}
          </span>
        </span>
        {v.crossCheck && (
          <span>
            Cross-check: <External href={v.crossCheck.url}>HadeethEnc — {v.crossCheck.grade}</External>
          </span>
        )}
        <External href={`https://sunnah.com/${v.id}`}>sunnah.com</External>
        {collectionItem && v.heading && (
          <External href={collectionItem.url}>Virtues collection {v.heading.item}</External>
        )}
      </div>
      {draft && v.note && (
        <p className="-mt-1 text-xs italic leading-relaxed text-muted">Review note: {v.note}</p>
      )}
    </article>
  );
}

export default function SurahContext({ surahId }: { surahId: number }) {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [open, setOpen] = useState(readOpen);
  const panelId = useId();

  useEffect(() => {
    setCtx(null);
    loadContext(surahId).then(setCtx).catch(() => setCtx(null));
  }, [surahId]);

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(open));
    } catch {
      /* not remembered */
    }
  }, [open]);

  if (!ctx) return null;
  const draft = ctx.review.status !== 'approved';
  const { revelation, period, theme } = ctx.context;
  const virtues = ctx.virtues.filter((v) => v.kind === 'virtue');
  const practice = ctx.virtues.filter((v) => v.kind === 'practice');
  const count = ctx.virtues.length;

  return (
    <section aria-label="Context and virtues" className="mb-6">
      <div className="overflow-hidden card">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/40 sm:px-5"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[1.02rem] font-semibold tracking-tight">Context &amp; Virtues</span>
              {draft && <DraftPill />}
            </span>
            <span className="tnum truncate text-xs text-muted">
              {revelation.type === 'meccan' ? 'Meccan' : 'Medinan'} · {ordinal(revelation.order)} revealed ·{' '}
              {count === 0 ? 'no graded narration' : `${count} narration${count === 1 ? '' : 's'}`}
            </span>
          </div>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </button>

        {open && (
          <div id={panelId} className="flex flex-col gap-6 border-t border-line/70 px-4 pb-5 pt-4 sm:px-5">
            {draft && <DraftBanner />}

            <div className="flex flex-col gap-4">
              <h3 className="font-display text-lg font-semibold tracking-tight">Context</h3>
              <dl className="flex flex-wrap gap-2 text-xs">
                <div className="rounded-full border border-line bg-paper/60 px-3 py-1">
                  <dt className="sr-only">Revealed in</dt>
                  <dd className="font-medium">{revelation.type === 'meccan' ? 'Meccan' : 'Medinan'}</dd>
                </div>
                <div className="rounded-full border border-line bg-paper/60 px-3 py-1">
                  <dt className="sr-only">Order of revelation</dt>
                  <dd className="tnum font-medium">{ordinal(revelation.order)} of 114 in order of revelation</dd>
                </div>
              </dl>
              {period && <Quote label="Period of revelation" q={period} />}
              {theme && <Quote label="Theme" q={theme} />}
              <p className="text-xs leading-relaxed text-muted">
                Classification and order: <External href={revelation.source.url}>Tanzil Quran metadata</External>
                {(period ?? theme) && (
                  <>
                    . Quoted from the introduction in Sayyid Abul Aʿlā Mawdūdī’s <i>Tafhīm al-Qurʾān</i>, via{' '}
                    <External href={(period ?? theme)!.source.url}>Quran.com</External>
                  </>
                )}
                . Scholars differ on the classification of some surahs.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="font-display text-lg font-semibold tracking-tight">Virtues</h3>
              {virtues.length === 0 && (
                <p className="text-[0.9rem] leading-relaxed text-muted">
                  No narration about a particular virtue of this surah met the standard used here (ṣaḥīḥ or ḥasan, graded
                  by a named authority). That is expected: for most surahs no authentic narration of this kind exists, and
                  many that circulate are weak or fabricated.
                </p>
              )}
              {virtues.map((v) => (
                <Narration key={v.id} v={v} draft={draft} />
              ))}
            </div>

            {practice.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="font-display text-lg font-semibold tracking-tight">How the Prophet ﷺ recited it</h3>
                {practice.map((v) => (
                  <Narration key={v.id} v={v} draft={draft} />
                ))}
              </div>
            )}

            <p className="border-t border-line/60 pt-3 text-xs leading-relaxed text-muted">
              Narrations are chosen from{' '}
              <External href="https://sunnah.com/virtues">Special Virtues of the Qur’an’s Chapters and Verses</External>{' '}
              (compiled by Shaykh Suleiman Hani, on sunnah.com). Wording and gradings are copied from each narration’s
              sunnah.com page, and cross-checked with <External href="https://hadeethenc.com">HadeethEnc</External> where
              it has the same hadith.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
