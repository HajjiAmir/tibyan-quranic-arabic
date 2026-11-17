import { useEffect, useId, useState, type ReactNode } from 'react';
import { loadContext } from '../lib/data';
import type { ContextQuote, SurahContext as Ctx, VirtueNarration } from '../types';

// Per-surah "Context & Tafsir" and "Virtues & Hadith": two labelled entries under
// the surah title, each opening its own section. A short sourced background, and
// any narrations that met the grading rule. Everything shown is built from cited
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
      className="inline-flex items-center gap-0.5 underline decoration-line underline-offset-2 transition-colors hover:text-ink hover:decoration-accent/60"
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
      <blockquote className="border-l-2 border-accent/40 pl-3.5 font-display text-[0.95rem] leading-relaxed text-ink/90">
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

type Part = 'tafsir' | 'hadith';
const PARTS_KEY = 'tibyan.context.v2';
const readParts = (): Record<Part, boolean> => {
  try {
    const v = JSON.parse(localStorage.getItem(PARTS_KEY) ?? 'null');
    if (v && typeof v === 'object') return { tafsir: !!v.tafsir, hadith: !!v.hadith };
    // carry over the old single panel's state
    const old = readOpen();
    return { tafsir: old, hadith: old };
  } catch {
    return { tafsir: false, hadith: false };
  }
};

function BookIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.5C10.3 5.2 7.9 4.5 4.5 4.5v13c3.4 0 5.8.7 7.5 2 1.7-1.3 4.1-2 7.5-2v-13c-3.4 0-5.8.7-7.5 2Z" />
      <path d="M12 6.5v13" />
    </svg>
  );
}
function ScrollIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4.5h10.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H17" />
      <path d="M7 4.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8.5a2 2 0 0 0 2-2V8.5" />
      <path d="M8.5 10.5h6M8.5 13.5h6M8.5 16.5h4" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}

/** One of the two labelled ways in, shown under every surah's title. */
function Entry({
  icon,
  title,
  detail,
  open,
  onClick,
  controls,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  open: boolean;
  onClick: () => void;
  controls: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      className={`card card-link flex w-full items-center gap-3.5 px-4 py-3.5 text-left ${
        open ? 'border-accent/40 bg-accent/[0.06]' : ''
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-display text-[1.02rem] font-semibold tracking-tight">{title}</span>
        <span className="text-xs leading-snug text-muted">{detail}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
        {open ? 'Close' : 'Open'}
        <Chevron open={open} />
      </span>
    </button>
  );
}

function Panel({ id, title, onClose, children }: { id: string; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div id={id} className="card flex flex-col gap-5 px-4 pb-5 pt-4 sm:px-5" role="region" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
        <button onClick={onClose} className="btn btn-sm btn-ghost">
          Close
        </button>
      </div>
      {children}
    </div>
  );
}

export default function SurahContext({ surahId }: { surahId: number }) {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [parts, setParts] = useState(readParts);
  const tafsirId = useId();
  const hadithId = useId();

  useEffect(() => {
    setCtx(null);
    loadContext(surahId).then(setCtx).catch(() => setCtx(null));
  }, [surahId]);

  useEffect(() => {
    try {
      localStorage.setItem(PARTS_KEY, JSON.stringify(parts));
    } catch {
      /* not remembered */
    }
  }, [parts]);

  if (!ctx) return <div aria-hidden className="mb-6 grid gap-3 sm:grid-cols-2"><div className="skeleton h-[72px] rounded-[18px]" /><div className="skeleton h-[72px] rounded-[18px]" /></div>;
  const draft = ctx.review.status !== 'approved';
  const { revelation, period, theme } = ctx.context;
  const virtues = ctx.virtues.filter((v) => v.kind === 'virtue');
  const practice = ctx.virtues.filter((v) => v.kind === 'practice');
  const toggle = (p: Part) => setParts((o) => ({ ...o, [p]: !o[p] }));

  const hadithDetail =
    virtues.length + practice.length === 0
      ? 'No authentic narration on this surah’s virtues'
      : [
          virtues.length && `${virtues.length} on its virtues`,
          practice.length && `${practice.length} on its recitation`,
        ]
          .filter(Boolean)
          .join(' · ') + ' · graded';

  return (
    <section aria-label="Context and tafsir, virtues and hadith" className="mb-6 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Entry
          icon={<BookIcon />}
          title="Context & Tafsir"
          detail={`${revelation.type === 'meccan' ? 'Meccan' : 'Medinan'} · ${ordinal(revelation.order)} revealed · background from Tafhīm al-Qurʾān`}
          open={parts.tafsir}
          onClick={() => toggle('tafsir')}
          controls={tafsirId}
        />
        <Entry
          icon={<ScrollIcon />}
          title="Virtues & Hadith"
          detail={hadithDetail}
          open={parts.hadith}
          onClick={() => toggle('hadith')}
          controls={hadithId}
        />
      </div>

      {draft && (parts.tafsir || parts.hadith) && (
        <div className="flex flex-col gap-2">
          <DraftPill />
          <DraftBanner />
        </div>
      )}

      {parts.tafsir && (
        <Panel id={tafsirId} title="Context & Tafsir" onClose={() => toggle('tafsir')}>
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
          <p className="border-t border-line/60 pt-3 text-xs leading-relaxed text-muted">
            Classification and order: <External href={revelation.source.url}>Tanzil Quran metadata</External>
            {(period ?? theme) && (
              <>
                . Quoted from the introduction in Sayyid Abul Aʿlā Mawdūdī’s <i>Tafhīm al-Qurʾān</i>, via{' '}
                <External href={(period ?? theme)!.source.url}>Quran.com</External>
              </>
            )}
            . Scholars differ on the classification of some surahs.
          </p>
        </Panel>
      )}

      {parts.hadith && (
        <Panel id={hadithId} title="Virtues & Hadith" onClose={() => toggle('hadith')}>
          <div className="flex flex-col gap-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">On its virtues</h4>
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
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">How the Prophet ﷺ recited it</h4>
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
        </Panel>
      )}
    </section>
  );
}
