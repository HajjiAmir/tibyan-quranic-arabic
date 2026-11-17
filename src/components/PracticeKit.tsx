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
    <div className="seg mx-auto text-xs">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
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
        {seg(learning, 'rgb(var(--accent))')}
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{known} known</span>
        <span>{learning} learning</span>
        <span>{unseen} new</span>
      </div>
    </div>
  );
}
