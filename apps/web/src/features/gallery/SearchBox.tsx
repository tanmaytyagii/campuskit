/**
 * Project search with suggestions, following the WAI-ARIA combobox pattern:
 * arrow keys move through suggestions, Enter opens one (or searches the
 * gallery), Escape closes the list.
 */
import { catalog } from '@campuskit/project-catalog';
import { Search } from 'lucide-react';
import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '../../components/ui/Button.tsx';
import { cn } from '../../lib/cn.ts';
import { suggestions } from './filtering.ts';

export function SearchBox({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const inputId = useId();
  const items = suggestions(catalog, query);
  const showList = open && items.length > 0;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosen = active >= 0 ? items[active] : undefined;
    setOpen(false);
    if (chosen) {
      void navigate(chosen.to);
    } else {
      void navigate(query.trim() ? `/projects?q=${encodeURIComponent(query.trim())}` : '/projects');
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (items.length === 0 ? -1 : (index + 1) % items.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (items.length === 0 ? -1 : (index - 1 + items.length) % items.length));
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <form role="search" onSubmit={submit} className={cn('relative', className)}>
      <label htmlFor={inputId} className="sr-only">
        Search projects
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-3"
          />
          <input
            id={inputId}
            type="search"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            placeholder="e.g. React or pandas"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
            className="h-12 w-full rounded-lg border border-line-strong bg-surface pl-11 pr-3 text-base text-ink shadow-card placeholder:text-ink-3 hover:border-ink-3"
          />
        </div>
        <Button type="submit" size="lg" variant="secondary">
          Search
        </Button>
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!showList}
        className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-30 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lift"
      >
        {items.map((item, index) => (
          <li
            key={`${item.kind}-${item.label}`}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(event) => {
              event.preventDefault();
              setOpen(false);
              void navigate(item.to);
            }}
            onMouseEnter={() => setActive(index)}
            className={cn(
              'flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm',
              index === active ? 'bg-raised text-ink' : 'text-ink-2',
            )}
          >
            <span className="font-medium">{item.label}</span>
            <span className="text-xs text-ink-3">
              {item.kind === 'project' ? 'Project' : 'Search topic'}
            </span>
          </li>
        ))}
      </ul>
    </form>
  );
}
