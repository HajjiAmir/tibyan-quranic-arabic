import { roleBgVar, roleVar } from '../lib/data';
import type { Word } from '../types';

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-xs">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

export default function GrammarPanel({ word }: { word: Word }) {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-line bg-surface-2/60 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="ar text-3xl leading-none">{word.arabic}</span>
          {(word.gloss || word.translit) && (
            <span className="text-sm leading-snug">
              {word.translit && <span className="mr-2 italic text-muted">{word.translit}</span>}
              {word.gloss && <span className="font-medium">&ldquo;{word.gloss}&rdquo;</span>}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {word.root && (
            <span className="inline-flex items-baseline gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs">
              <span className="text-muted">root</span>
              <span className="ar-naskh text-base">{word.root}</span>
            </span>
          )}
          {word.lemma && (
            <span className="inline-flex items-baseline gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs">
              <span className="text-muted">lemma</span>
              <span className="ar-naskh text-base">{word.lemma}</span>
            </span>
          )}
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-line">
        {word.segments.map((seg, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3">
            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-full"
              style={{ background: roleVar(seg.role) }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="ar-naskh text-xl" style={{ color: roleVar(seg.role) }}>
                  {seg.arabic}
                </span>
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-semibold"
                  style={{ background: roleBgVar(seg.role), color: roleVar(seg.role) }}
                >
                  {seg.description}
                </span>
                {seg.prefix && <span className="text-[10px] uppercase tracking-wide text-muted">prefix</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {seg.root && <Tag label="root" value={seg.root} />}
                {seg.lemma && <Tag label="lemma" value={seg.lemma} />}
                {seg.verbForm && <Tag label="form" value={`${seg.verbForm}`} />}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
