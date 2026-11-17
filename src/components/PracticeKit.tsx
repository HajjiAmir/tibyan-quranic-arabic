// Small pieces shared by surah practice and vocabulary practice.

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mx-auto flex gap-1 rounded-lg border border-line/70 p-0.5 text-xs">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`rounded-md px-3 py-1 font-medium transition-colors ${
            value === v ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function StatBar({ known, learning, unseen }: { known: number; learning: number; unseen: number }) {
  const total = known + learning + unseen || 1;
  const seg = (n: number, color: string) =>
    n > 0 ? <div style={{ width: `${(n / total) * 100}%`, background: color }} /> : null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
        {seg(known, 'rgb(var(--emerald))')}
        {seg(learning, 'rgb(var(--gold))')}
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{known} known</span>
        <span>{learning} learning</span>
        <span>{unseen} new</span>
      </div>
    </div>
  );
}
