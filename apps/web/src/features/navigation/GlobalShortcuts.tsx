/**
 * Keyboard shortcuts for the whole site, and the dialogs they open. Ctrl+K (⌘K on a Mac) opens
 * the command palette from anywhere; ? opens the shortcut list unless the student is typing.
 * Other parts of the page (the header button) open the palette with openCommandPalette().
 */
import { useEffect, useState } from 'react';

import { CommandPalette } from './CommandPalette.tsx';
import { ShortcutsDialog } from './ShortcutsDialog.tsx';

const OPEN_EVENT = 'campuskit:open-palette';

export function openCommandPalette(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

export function GlobalShortcuts() {
  const [open, setOpen] = useState<'palette' | 'shortcuts' | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen('palette');
      } else if (event.key === '?' && !event.ctrlKey && !event.metaKey && !isTyping(event.target)) {
        event.preventDefault();
        setOpen('shortcuts');
      }
    };
    const onOpen = () => setOpen('palette');
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  if (open === 'palette')
    return (
      <CommandPalette onClose={() => setOpen(null)} onShortcuts={() => setOpen('shortcuts')} />
    );
  if (open === 'shortcuts') return <ShortcutsDialog onClose={() => setOpen(null)} />;
  return null;
}
