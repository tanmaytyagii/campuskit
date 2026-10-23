import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

import { cn } from '../../lib/cn.ts';
import { ThemeToggle } from './ThemeToggle.tsx';
import { Wordmark } from './Wordmark.tsx';

export const NAV_ITEMS = [
  { to: '/projects', label: 'Projects' },
  { to: '/generate', label: 'Generator' },
  { to: '/learn', label: 'Learn' },
  { to: '/viva', label: 'Viva practice' },
  { to: '/docs', label: 'Docs' },
] as const;

function navClasses({ isActive }: { isActive: boolean }) {
  return cn(
    'rounded-lg px-3 py-2 text-[0.95rem] font-semibold transition-colors',
    isActive ? 'bg-raised text-ink' : 'text-ink-2 hover:bg-raised hover:text-ink',
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [lastPath, setLastPath] = useState(location.pathname);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Close the mobile menu after navigating (adjusting state during render, as React recommends).
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="rounded-lg" aria-label="CampusKit home">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClasses}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* On small screens the theme switch lives in the menu instead. */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-line bg-surface text-ink lg:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      <div id={menuId} hidden={!open} className="border-t border-line bg-surface lg:hidden">
        <nav aria-label="Main" className="container-page flex flex-col gap-1 py-3">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClasses}>
              {item.label}
            </NavLink>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
            <span className="text-sm text-ink-3">Theme</span>
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
