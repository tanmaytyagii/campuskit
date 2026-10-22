/**
 * A modal dialog on the native <dialog> element: the browser handles focus
 * trapping, the Escape key and the inert background.
 */
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { cn } from '../../lib/cn.ts';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "sheet" slides in from the side on small screens (used for filters). */
  variant?: 'centered' | 'sheet' | 'wide';
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  variant = 'centered',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // Clicking the backdrop is a mouse shortcut; keyboard users close the dialog with
    // Escape (the cancel event) or the Close button, so no key handler is needed here.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'bg-surface text-ink backdrop:bg-[#060b1f]/70 border border-line shadow-lift p-0',
        variant === 'sheet'
          ? 'ml-auto mr-0 h-dvh max-h-dvh w-[min(26rem,100%)] max-w-none rounded-none'
          : variant === 'wide'
            ? 'm-auto w-[min(72rem,calc(100%-2rem))] max-w-none rounded-[18px]'
            : 'm-auto w-[min(34rem,calc(100%-2rem))] rounded-[18px]',
      )}
    >
      <div className="flex h-full max-h-[inherit] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id={titleId} className="heading text-lg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-lg text-ink-3 hover:bg-raised hover:text-ink"
            aria-label="Close"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-line px-5 py-4">{footer}</div> : null}
      </div>
    </dialog>
  );
}
