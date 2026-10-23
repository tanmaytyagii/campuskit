import type { ButtonHTMLAttributes, ReactNode } from 'react';
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

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap select-none',
    // A one-pixel press confirms the click; reduced motion keeps it still.
    'transition-[color,background-color,border-color,box-shadow,translate] active:translate-y-px motion-reduce:active:translate-y-0',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export function Button({
  variant,
  size,
  icon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...props}>
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
