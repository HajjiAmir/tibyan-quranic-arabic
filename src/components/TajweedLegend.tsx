import { useState } from 'react';
import { tajweedVar } from '../lib/data';
import type { TajweedLegend as Legend, TajweedRule } from '../types';

const ORDER: TajweedRule[] = [
  'hamzat_wasl',
  'lam_shamsiyyah',
  'silent',
  'madd_2',
  'madd_246',
  'madd_munfasil',
  'madd_muttasil',
  'madd_6',
  'ghunnah',
  'ikhfa',
  'ikhfa_shafawi',
  'iqlab',
  'qalqalah',
  'idghaam_ghunnah',
  'idghaam_shafawi',
  'idghaam_no_ghunnah',
  'idghaam_mutajanisayn',
  'idghaam_mutaqaribayn',
];

const SWATCHES = [
  'silent',
  'madd2',
  'madd45',
  'madd6',
  'ghunnah',
  'ikhfa',
  'idgham',
  'qalqalah',
] as const;

export default function TajweedLegend({ legend }: { legend: Legend }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="text-muted">Tajweed colour key</span>
          <span className="flex gap-1">
            {SWATCHES.map((g) => (
              <span
                key={g}
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: tajweedVar(g) }}
              />
            ))}
          </span>
        </span>
        <span className="text-xs text-muted">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="border-t border-line p-3">
          <div className="mb-2 px-1">
            <span className="text-[11px] text-muted">
              Rules marked by an automated classifier (
              <a
                className="underline decoration-line underline-offset-2 hover:text-ink"
                href="https://github.com/cpfair/quran-tajweed"
                target="_blank"
                rel="noreferrer"
              >
                cpfair/quran-tajweed
              </a>
              , ḥafṣ ʿan ʿāṣim). Learn recitation with a qualified teacher.
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {ORDER.map((rule) => {
              const info = legend[rule];
              if (!info) return null;
              return (
                <div key={rule} className="flex items-start gap-2.5 rounded-xl bg-surface-2/50 p-2">
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ background: tajweedVar(info.group) }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: tajweedVar(info.group) }}
                      >
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
        </div>
      )}
    </section>
  );
}
