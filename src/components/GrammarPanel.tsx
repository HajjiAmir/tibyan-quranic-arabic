import { roleBgVar, roleVar } from '../lib/data';
import type { Segment, Word } from '../types';

function Tag({ label, value, arabic }: { label: string; value: string; arabic?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-md border border-line/70 px-2 py-0.5 text-[11px]">
      <span className="text-muted">{label}</span>
      <span className={arabic ? 'ar-naskh text-[0.95rem] leading-none' : 'font-medium'}>{value}</span>
    </span>
  );
}

const FORM_NOTE: Record<NonNullable<Segment['pronounForm']>, string> = {
  possessive: 'possessive — attached to a noun',
  object: 'object — attached to a verb or preposition',
  both: 'both forms — the host is a particle or adverb',
};

// English for one segment: the QAC's own wording, or the reviewed grammatical table.
function SegmentGloss({ seg }: { seg: Segment }) {
  if (!seg.gloss) return null;
  const [label, title] =
    seg.glossSource === 'qac-prefix'
      ? ['usually', 'How the Quranic Arabic Corpus says this prefix is usually translated']
      : seg.glossSource === 'qac-lemma'
        ? ['lemma sense', 'The Quranic Arabic Corpus gloss for this lemma (a dictionary sense, not tied to this verse)']
        : [
            seg.pronounForm
              ? seg.pronounForm === 'both'
                ? 'both forms'
                : seg.pronounForm
              : 'article',
            seg.pronounForm
              ? `Standard English equivalent of this attached pronoun: ${FORM_NOTE[seg.pronounForm]}`
              : 'Standard English equivalent of the definite article',
          ];
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[0.95rem] font-medium text-ink">&ldquo;{seg.gloss}&rdquo;</span>
      <span className="text-[10px] uppercase tracking-[0.08em] text-muted" title={title}>
        {label}
      </span>
    </span>
  );
}

export default function GrammarPanel({ word }: { word: Word }) {
  const anySegGloss = word.segments.some((s) => s.gloss);
  return (
    <div className="relative mt-4 overflow-hidden card">
      <div className="flex items-start justify-between gap-4 border-b border-line/80 px-5 py-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          {word.gloss && (
            <span className="font-display text-lg font-semibold leading-snug">{word.gloss}</span>
          )}
          <span className="flex flex-wrap items-center gap-1.5">
            {word.translit && <span className="mr-1 text-sm italic text-muted">{word.translit}</span>}
            {word.root && <Tag label="root" value={word.root} arabic />}
            {word.lemma && <Tag label="lemma" value={word.lemma} arabic />}
          </span>
        </div>
        <span className="ar shrink-0 text-[2.4rem] leading-[1.6]">{word.arabic}</span>
      </div>

      <ul className="flex flex-col divide-y divide-line/70">
        {word.segments.map((seg, i) => (
          <li key={i} className="grid grid-cols-[1fr_auto] items-start gap-x-4 px-5 py-3.5">
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                  style={{ background: roleBgVar(seg.role), color: roleVar(seg.role) }}
                >
                  {seg.description}
                </span>
                {seg.prefix && (
                  <span className="text-[10px] uppercase tracking-[0.08em] text-muted">prefix</span>
                )}
                {seg.flags.includes('SUFF') && (
                  <span className="text-[10px] uppercase tracking-[0.08em] text-muted">suffix</span>
                )}
              </div>
              <SegmentGloss seg={seg} />
              {(seg.root || seg.verbForm) && (
                <div className="flex flex-wrap gap-1.5">
                  {seg.root && <Tag label="root" value={seg.root} arabic />}
                  {seg.verbForm && <Tag label="form" value={seg.verbForm} />}
                </div>
              )}
            </div>
            <span
              className="ar-naskh text-[1.6rem] leading-[1.5]"
              style={{ color: roleVar(seg.role) }}
            >
              {seg.arabic}
            </span>
          </li>
        ))}
      </ul>

      <p className="border-t border-line/70 bg-surface-2/40 px-5 py-2.5 text-[11px] leading-relaxed text-muted">
        Word meaning from the Quranic Arabic Corpus.
        {anySegGloss
          ? ' Part meanings: prefixes and stems from the corpus; the article and attached pronouns are standard grammatical equivalents.'
          : ''}{' '}
        Parts with no sourced English are left blank.
      </p>
    </div>
  );
}
