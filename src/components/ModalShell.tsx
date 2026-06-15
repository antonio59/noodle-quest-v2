import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalShellProps {
  /** Accessible dialog title. Rendered as the heading unless `hideHeader`. */
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** For confirmation/success panels that don't want the title bar. */
  hideHeader?: boolean;
  /** Extra classes for the dialog panel (e.g. padding/alignment overrides). */
  panelClassName?: string;
}

/**
 * Accessible modal wrapper shared by the app's dialogs. Provides:
 *  - role="dialog" + aria-modal + aria-labelledby
 *  - Escape to close and backdrop-click to close
 *  - initial focus into the dialog and a simple Tab focus trap
 */
export function ModalShell({ title, onClose, children, hideHeader, panelClassName }: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter(el => !el.hasAttribute('disabled'));

    // Move focus into the dialog so screen readers announce it.
    (focusables()[0] ?? panel)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className={panelClassName ?? 'bg-card rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-white/10 focus:outline-none'}
      >
        {hideHeader ? (
          <h2 id={titleId} className="sr-only">{title}</h2>
        ) : (
          <div className="flex items-center justify-between mb-4">
            <h2 id={titleId} className="text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="text-text-muted hover:text-text p-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
