import { useState } from 'react';
import { ROLE_ORDER, roleBgVar, roleVar } from '../lib/data';
import type { Legend } from '../types';

export default function GrammarLegend({ legend }: { legend: Legend }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="text-muted">Grammar colour key</span>
          <span className="flex gap-1">
            {ROLE_ORDER.slice(0, 6).map((r) => (
              <span
                key={r}
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: roleVar(r) }}
              />
            ))}
          </span>
        </span>
        <span className="text-xs text-muted">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-2 border-t border-line p-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_ORDER.map((role) => {
            const info = legend[role];
            if (!info) return null;
            return (
              <div
                key={role}
                className="flex items-start gap-3 rounded-xl p-2.5"
                style={{ background: roleBgVar(role) }}
              >
                <span
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-full ring-2 ring-white/40"
                  style={{ background: roleVar(role) }}
                />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="role-label text-sm font-semibold" style={{ ['--role-c' as string]: roleVar(role) }}>
                      {info.label}
                    </span>
                    <span className="ar-naskh text-sm text-ink/70">{info.arabic}</span>
                  </div>
                  <p className="text-xs leading-snug text-muted">{info.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
