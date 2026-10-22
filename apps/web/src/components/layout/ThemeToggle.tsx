import { Monitor, Moon, Sun } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { useTheme, type ThemePreference } from '../../hooks/useTheme.tsx';
import { cn } from '../../lib/cn.ts';

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: ReactNode }> = [
  { value: 'light', label: 'Light theme', icon: <Sun aria-hidden="true" className="size-4" /> },
  { value: 'dark', label: 'Dark theme', icon: <Moon aria-hidden="true" className="size-4" /> },
  {
    value: 'system',
    label: 'Match system theme',
    icon: <Monitor aria-hidden="true" className="size-4" />,
  },
];

/** Three-way theme switch built from real radio buttons, so arrow keys work. */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  // Each toggle instance (header and mobile menu) needs its own radio group name.
  const name = useId();
  return (
    <fieldset
      className={cn('inline-flex rounded-lg border border-line bg-surface p-0.5', className)}
    >
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map((option) => (
        <label
          key={option.value}
          title={option.label}
          className={cn(
            'relative inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-3',
            'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus',
            preference === option.value ? 'bg-raised text-ink' : 'hover:text-ink',
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={preference === option.value}
            onChange={() => setPreference(option.value)}
            className="sr-only"
          />
          {option.icon}
          <span className="sr-only">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
