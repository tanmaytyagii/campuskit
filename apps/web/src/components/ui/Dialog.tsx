/**
 * A modal dialog on the native <dialog> element: the browser handles focus
 * trapping, the Escape key and the inert background.
 */
import { X } from 'lucide-react';
import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';

import { cn } from '../../lib/cn.ts';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "sheet" slides in from the side on small screens (used for filters). */
  variant?: 'centered' | 'sheet' | 'wide';
  /**
   * A question to answer before going on, such as confirming a deletion. The dialog is then an
   * alert dialog, and screen readers read its text together with the title when it opens.
   */
  confirmation?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  variant = 'centered',
  confirmation = false,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  // Opened and closed in a layout effect, in the same commit as the change: a page that moves
  // focus in its own layout effect after closing a dialog (see useFocusAfterDelete) finds the
  // rest of the page no longer inert. Child layout effects run before their parent's.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Pages often remove a dialog instead of closing it (rendering it only while it is open). The
  // browser returns focus to the control that opened a dialog only when the dialog is closed,
  // so it is closed here, while still in the page: a layout effect's cleanup runs before React
  // removes the element. Removing an open dialog would leave focus on the page body.
  useLayoutEffect(() => {
    const dialog = ref.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    // Clicking the backdrop is a mouse shortcut; keyboard users close the dialog with
    // Escape (the cancel event) or the Close button, so no key handler is needed here.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      role={confirmation ? 'alertdialog' : undefined}
      aria-labelledby={titleId}
      aria-describedby={confirmation ? bodyId : undefined}
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
            ? 'm-auto w-[min(72rem,calc(100%-2rem))] max-w-none rounded-2xl'
            : 'm-auto w-[min(34rem,calc(100%-2rem))] rounded-2xl',
      )}
    >
      <div className="flex h-full max-h-[inherit] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id={titleId} className="type-h3">
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
        <div id={bodyId} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer ? <div className="border-t border-line px-5 py-4">{footer}</div> : null}
      </div>
    </dialog>
  );
}
