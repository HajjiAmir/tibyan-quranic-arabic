import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * A phone bottom sheet: slides up from the bottom edge over a dimmed page, sits
 * above the home indicator (safe-area inset), scrolls inside itself, and closes
 * on the backdrop, the close button or Escape. Focus moves into the sheet and
 * back to where it came from on close.
 */
export default function BottomSheet({
  label,
  onClose,
  children,
  footer,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    sheet.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      before?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="sheet-backdrop absolute inset-0 bg-black/45"
      />
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="sheet-panel relative flex max-h-[min(80dvh,40rem)] flex-col rounded-t-[22px] border-t border-[color:var(--border-strong)] bg-surface outline-none"
        style={{ boxShadow: '0 -18px 50px -20px rgb(0 0 0 / 0.55)' }}
      >
        <div className="flex shrink-0 items-center justify-between px-3 pt-2">
          <span className="w-11" />
          <span aria-hidden className="h-1 w-10 rounded-full bg-muted/40" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="tap flex items-center justify-center rounded-full text-lg leading-none text-muted hover:text-ink"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div
            className="shrink-0 border-t border-line/70 px-3 pt-2"
            style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {footer}
          </div>
        )}
        {!footer && <div className="shrink-0" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />}
      </div>
    </div>,
    document.body,
  );
}
