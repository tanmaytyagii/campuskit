import { Check, Copy } from 'lucide-react';

import { useCopyToClipboard } from '../../hooks/useCopyToClipboard.ts';
import { cn } from '../../lib/cn.ts';

interface CommandBlockProps {
  commands: string[];
  label?: string;
  className?: string;
}

/** Terminal commands with a copy button. */
export function CommandBlock({ commands, label, className }: CommandBlockProps) {
  const { state, copy } = useCopyToClipboard();
  const text = commands.join('\n');
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl bg-code-bg text-code-ink',
        className,
      )}
    >
      {label ? (
        <p className="border-b border-white/10 px-4 py-2 text-xs font-medium text-code-ink/70">
          {label}
        </p>
      ) : null}
      {/* Focusable so keyboard users can scroll long commands sideways. */}
      <pre tabIndex={0} className="overflow-x-auto px-4 py-3 pr-24 text-sm leading-7">
        <code>
          {commands.map((command, index) => (
            <span key={`${index}-${command}`} className="block">
              <span aria-hidden="true" className="mr-3 text-code-ink/40 select-none">
                $
              </span>
              {command}
            </span>
          ))}
        </code>
      </pre>
      <button
        type="button"
        onClick={() => void copy(text)}
        className={cn(
          'absolute right-2 top-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold',
          'bg-white/10 text-code-ink hover:bg-white/20',
          label ? 'top-[2.6rem]' : '',
        )}
        aria-label={commands.length > 1 ? 'Copy commands' : `Copy command: ${commands[0] ?? ''}`}
      >
        {state === 'copied' ? (
          <Check aria-hidden="true" className="size-3.5 text-lime" />
        ) : (
          <Copy aria-hidden="true" className="size-3.5" />
        )}
        <span aria-live="polite">
          {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy'}
        </span>
      </button>
    </div>
  );
}
