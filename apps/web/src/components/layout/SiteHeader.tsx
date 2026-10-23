import { Menu, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';

import { cn } from '../../lib/cn.ts';
import { ThemeToggle } from './ThemeToggle.tsx';
import { Wordmark } from './Wordmark.tsx';

export const NAV_ITEMS = [
  { to: '/projects', label: 'Projects' },
  { to: '/generate', label: 'Generator' },
  { to: '/learn', label: 'Learn' },
  { to: '/viva', label: 'Viva practice' },
  { to: '/compare', label: 'Compare' },
  { to: '/docs', label: 'Docs' },
] as const;

/** Desktop links: the current section is marked by a violet bar on the header's lower edge. */
function desktopNavClasses({ isActive }: { isActive: boolean }) {
  return cn(
    'relative rounded-md px-3 py-2 text-[0.9375rem] font-semibold transition-colors',
    'after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full',
    isActive
      ? 'text-ink after:bg-violet'
      : 'text-ink-2 after:bg-transparent hover:bg-raised hover:text-ink',
  );
}

function mobileNavClasses({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center rounded-lg px-3 py-3 text-base font-semibold transition-colors',
    isActive ? 'bg-violet-soft text-violet' : 'text-ink-2 hover:bg-raised hover:text-ink',
  );
}

/** A plain search form: submitting opens the project gallery filtered by the text. */
function HeaderSearch({ className, onSearch }: { className?: string; onSearch?: () => void }) {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const id = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = text.trim();
    void navigate(query ? `/projects?q=${encodeURIComponent(query)}` : '/projects');
    onSearch?.();
  }

  return (
    <form
      role="search"
      aria-label="Sitewide"
      onSubmit={submit}
      className={cn('relative', className)}
    >
      <label htmlFor={id} className="sr-only">
        Search projects
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3"
      />
      <input
        id={id}
        type="search"
        value={text}
        maxLength={100}
        onChange={(event) => setText(event.target.value)}
        placeholder="Search projects"
        className="h-9 w-full rounded-lg border border-line-strong bg-surface pr-3 pl-9 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-control"
      />
    </form>
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
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-6 xl:gap-8">
          <Link to="/" className="shrink-0 rounded-lg" aria-label="CampusKit home">
            <Wordmark />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={desktopNavClasses}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <HeaderSearch className="hidden w-56 xl:block" />
          {/* Between the laptop and wide layouts there is no room for the field: link to the gallery search. */}
          <Link
            to="/projects"
            className="hidden size-9 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink-2 hover:border-control hover:text-ink lg:inline-flex xl:hidden"
          >
            <Search aria-hidden="true" className="size-4" />
            <span className="sr-only">Search projects</span>
          </Link>
          {/* On small screens the theme switch lives in the menu instead. */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink lg:hidden"
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

      <div
        id={menuId}
        hidden={!open}
        className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-surface lg:hidden"
      >
        <div className="container-page space-y-4 py-4">
          <HeaderSearch onSearch={() => setOpen(false)} />
          <nav aria-label="Main" className="grid gap-1 sm:grid-cols-2">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={mobileNavClasses}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center justify-between border-t border-line pt-4 sm:hidden">
            <span className="text-sm font-semibold text-ink-2">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
