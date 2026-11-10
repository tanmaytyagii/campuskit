/**
 * The command palette (Ctrl+K, or ⌘K on a Mac): type to find a page, a template, one of your
 * projects, a document or an action. It follows the ARIA combobox pattern: the text box keeps
 * focus, the arrow keys move through the results, Enter opens one and Escape closes.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { Dialog } from '../../components/ui/Dialog.tsx';
import { useTheme } from '../../hooks/useTheme.tsx';
import { cn } from '../../lib/cn.ts';
import { useT } from '../../lib/i18n.ts';
import { readRecent } from '../../lib/recent.ts';
import { useWorkspace } from '../workspace/useWorkspace.ts';
import { buildCommands, GROUPS, rankCommands, type Command } from './commands.ts';

export function CommandPalette({
  onClose,
  onShortcuts,
}: {
  onClose: () => void;
  onShortcuts: () => void;
}) {
  const workspace = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const { setPreference } = useTheme();
  const t = useT();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recent] = useState(readRecent);
  const listId = useId();
  const optionId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The palette exists to type into. An ordinary effect runs after the dialog's showModal() (a
  // layout effect), which would otherwise focus the dialog's first button.
  useEffect(() => inputRef.current?.focus(), []);

  const commands = useMemo(
    () =>
      buildCommands({
        workspace,
        recent,
        currentPath: `${location.pathname}${location.search}`,
      }),
    [workspace, recent, location.pathname, location.search],
  );
  const results = rankCommands(commands, query);
  const current = Math.min(active, Math.max(results.length - 1, 0));

  function run(command: Command) {
    onClose();
    if (command.run.kind === 'navigate') void navigate(command.run.to);
    else if (command.run.kind === 'theme') setPreference(command.run.theme);
    else onShortcuts();
  }

  function move(to: number) {
    if (results.length === 0) return;
    const next = (to + results.length) % results.length;
    setActive(next);
    listRef.current
      ?.querySelector(`[data-index="${next}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(current + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(current - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const command = results[current];
      if (command) run(command);
    }
  }

  const grouped = GROUPS.map((group) => ({
    group,
    items: results
      .map((command, index) => ({ command, index }))
      .filter(({ command }) => command.group === group),
  })).filter(({ items }) => items.length > 0);

  return (
    <Dialog open onClose={onClose} title={t('palette.title')} variant="wide">
      <div className="space-y-3">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={t('palette.search')}
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results.length > 0 ? `${optionId}-${current}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={t('palette.search')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-base text-ink placeholder:text-ink-3 focus:border-violet"
        />
        <p className="sr-only" aria-live="polite">
          {query
            ? results.length === 1
              ? t('palette.count.one')
              : t('palette.count.other', { count: results.length })
            : ''}
        </p>
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={t('palette.results')}
          className="max-h-[min(60vh,28rem)] overflow-y-auto"
        >
          {grouped.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-ink-2">
              {t('palette.empty', { query })}
            </p>
          ) : (
            grouped.map(({ group, items }) => (
              <div
                key={group}
                role="group"
                aria-labelledby={`${optionId}-${group}`}
                className="mb-2"
              >
                <p
                  id={`${optionId}-${group}`}
                  className="type-meta px-2 pt-2 pb-1 font-semibold"
                  role="presentation"
                >
                  {t(`group.${group}`)}
                </p>
                {items.map(({ command, index }) => (
                  // The text box keeps focus and handles the keyboard (the combobox pattern).
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                  <div
                    key={command.id}
                    id={`${optionId}-${index}`}
                    tabIndex={-1}
                    data-index={index}
                    role="option"
                    aria-selected={index === current}
                    onPointerMove={() => setActive(index)}
                    onClick={() => run(command)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm',
                      index === current ? 'bg-violet-soft text-ink' : 'text-ink-2',
                    )}
                  >
                    <span className="min-w-0 truncate">{command.label}</span>
                    {command.hint ? (
                      <span className="type-meta shrink-0">{command.hint}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        <p className="type-meta">
          <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd> {t('palette.move')},{' '}
          <kbd className="font-mono">Enter</kbd> {t('palette.open')},{' '}
          <kbd className="font-mono">Esc</kbd> {t('palette.close')}.
        </p>
      </div>
    </Dialog>
  );
}
