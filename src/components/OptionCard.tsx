import type { CSSProperties } from 'react';
import { findTerm, useGlossary } from '../lib/glossary';
import type { OptionView } from '../lib/learn';
import { Term } from './Term';

/**
 * One answer option. A grammar option (`view`) leads with its everyday meaning and
 * what the word does, in the glossary's plain words; the technical term follows,
 * small and tappable, so the question can be answered by understanding and the
 * term learned along the way. The term sits outside the answer button, so tapping
 * it explains it without answering.
 */
export default function OptionCard({
  option,
  view,
  arabic = false,
  onPick,
  disabled,
  stateClass,
  style,
}: {
  option: string;
  view?: OptionView;
  arabic?: boolean;
  onPick: () => void;
  disabled: boolean;
  stateClass: string;
  style?: CSSProperties;
}) {
  const g = useGlossary();
  if (!view) {
    return (
      <button
        onClick={onPick}
        disabled={disabled}
        className={`min-h-[48px] rounded-xl border px-4 py-2.5 text-center font-medium transition-colors ${stateClass}`}
        style={style}
      >
        <span lang={arabic ? 'ar' : undefined} className={arabic ? 'ar-naskh text-2xl leading-[1.7]' : 'text-sm'}>
          {option}
        </span>
      </button>
    );
  }
  const first = view.terms[0] ? findTerm(g, view.terms[0]) : null;
  // A use: the meaning, then what the word does. A form: its plain reading alone.
  const what = view.terms.length === 1 ? first?.short : undefined;
  const lead = view.lead ?? first?.short ?? option;
  return (
    <div className={`flex flex-col rounded-xl border transition-colors ${stateClass}`} style={style}>
      <button onClick={onPick} disabled={disabled} className="min-h-[48px] w-full rounded-xl px-4 pb-1.5 pt-2.5 text-left">
        <span className="block text-[0.95rem] font-semibold leading-snug">{lead}</span>
        {what && view.lead && <span className="mt-0.5 block text-[0.85rem] leading-snug opacity-80">{what}</span>}
      </button>
      {view.terms.length > 0 && (
        <p className="px-4 pb-2.5 text-[11.5px] leading-snug opacity-75">
          (
          {view.terms.map((t, i) => (
            <span key={t}>
              {i > 0 && ', '}
              <Term label={t} siblings={view.terms} />
            </span>
          ))}
          )
        </p>
      )}
    </div>
  );
}
