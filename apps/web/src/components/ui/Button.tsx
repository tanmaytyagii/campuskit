import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Link, type LinkProps } from 'react-router';

import { cn } from '../../lib/cn.ts';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-violet text-on-violet shadow-card hover:bg-violet-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:border-violet hover:text-violet',
  ghost: 'text-ink-2 hover:bg-raised hover:text-ink',
  danger:
    'border border-line-strong bg-surface text-danger hover:border-danger hover:bg-danger-soft',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-[0.9375rem]',
  lg: 'h-12 gap-2 px-5 text-base',
};

/** The same sizes for a label that may need a second line: the button grows instead. */
const WRAPPING_SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-8 gap-1.5 px-3 py-1 text-sm',
  md: 'min-h-10 gap-2 px-4 py-2 text-[0.9375rem]',
  lg: 'min-h-12 gap-2 px-5 py-2.5 text-base',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
  wrap = false,
): string {
  return cn(
    'inline-flex items-center justify-center rounded-lg font-semibold select-none',
    wrap ? 'text-center' : 'whitespace-nowrap',
    // A one-pixel press confirms the click; reduced motion keeps it still.
    'transition-[color,background-color,border-color,box-shadow,translate] active:translate-y-px motion-reduce:active:translate-y-0',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0',
    VARIANTS[variant],
    wrap ? WRAPPING_SIZES[size] : SIZES[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  /** Lets a long label wrap onto a second line on narrow screens or with larger text. */
  wrap?: boolean;
}

export function Button({
  variant,
  size,
  icon,
  wrap,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className, wrap)} {...props}>
      {icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export function ButtonLink({
  variant,
  size,
  icon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClasses(
        variant,
        size,
        typeof className === 'string' ? className : undefined,
      )}
      {...props}
    >
      {icon}
      {children}
    </Link>
  );
}
