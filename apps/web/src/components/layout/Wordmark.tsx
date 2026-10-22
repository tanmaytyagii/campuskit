import { cn } from '../../lib/cn.ts';

/**
 * The CampusKit mark: a parts frame (like a model-kit sprue) holding three
 * pieces, one of them in the lime "ready" colour.
 */
export function KitMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8', className)}>
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="8"
        className="fill-[#0b1330] dark:fill-[#1c2a55]"
      />
      <rect
        x="6"
        y="6"
        width="20"
        height="20"
        rx="3.5"
        fill="none"
        strokeWidth="2"
        stroke="#a79bff"
      />
      <rect x="9.5" y="9.5" width="6" height="6" rx="1.2" fill="#c8f23c" />
      <rect x="17.5" y="9.5" width="5" height="13" rx="1.2" fill="#a79bff" />
      <rect x="9.5" y="17.5" width="6" height="5" rx="1.2" fill="#a79bff" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <KitMark />
      <span className="text-[1.15rem] font-extrabold tracking-tight text-ink [font-stretch:125%]">
        CampusKit
      </span>
    </span>
  );
}
