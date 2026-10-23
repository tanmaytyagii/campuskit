/**
 * Labelled form controls. Every control gets a visible label, an optional
 * description and an inline error linked with aria-describedby.
 */
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

import { cn } from '../../lib/cn.ts';

export const controlClasses = cn(
  // The border colour keeps 3:1 contrast with every surface, so the control is easy to find.
  'w-full rounded-lg border border-control bg-surface px-3 text-[0.9375rem] text-ink transition-colors',
  'placeholder:text-ink-3 hover:border-ink-2',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger-soft/30',
  'disabled:cursor-not-allowed disabled:opacity-60',
);

interface FieldShellProps {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: string | undefined;
  children: ReactNode;
  className?: string;
  optional?: boolean;
}

export function FieldShell({
  id,
  label,
  description,
  error,
  children,
  className,
  optional,
}: FieldShellProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {optional ? (
          <>
            {' '}
            <span className="ml-0.5 font-normal text-ink-3">(optional)</span>
          </>
        ) : null}
      </label>
      {description ? (
        <p id={`${id}-description`} className="text-sm text-ink-3">
          {description}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, description: unknown, error: unknown): string | undefined {
  const ids = [description ? `${id}-description` : null, error ? `${id}-error` : null].filter(
    Boolean,
  );
  return ids.length > 0 ? ids.join(' ') : undefined;
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: ReactNode;
  description?: ReactNode;
  error?: string | undefined;
  optional?: boolean;
  id?: string;
  containerClassName?: string;
  suffix?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    description,
    error,
    optional,
    id: givenId,
    containerClassName,
    className,
    suffix,
    ...props
  },
  ref,
) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      optional={optional}
      className={containerClassName}
    >
      <div className="relative">
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, description, error)}
          className={cn(controlClasses, 'h-11', suffix ? 'pr-12' : '', className)}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-3">
            {suffix}
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
});

interface TextareaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: ReactNode;
  description?: ReactNode;
  error?: string | undefined;
  id?: string;
  containerClassName?: string;
}

export function TextareaField({
  label,
  description,
  error,
  id: givenId,
  containerClassName,
  className,
  ...props
}: TextareaFieldProps) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      className={containerClassName}
    >
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, description, error)}
        className={cn(controlClasses, 'min-h-32 py-2.5 font-mono text-sm leading-6', className)}
        {...props}
      />
    </FieldShell>
  );
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: ReactNode;
  description?: ReactNode;
  error?: string | undefined;
  id?: string;
  containerClassName?: string;
  children: ReactNode;
}

export function SelectField({
  label,
  description,
  error,
  id: givenId,
  containerClassName,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      className={containerClassName}
    >
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, description, error)}
        className={cn(controlClasses, 'h-11 pr-8', className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
}

export function Checkbox({ label, description, id: givenId, className, ...props }: CheckboxProps) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={description ? `${id}-description` : undefined}
        className="mt-0.5 size-[1.15rem] shrink-0 cursor-pointer rounded accent-violet"
        {...props}
      />
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-ink">
          {label}
        </label>
        {description ? (
          <p id={`${id}-description`} className="text-sm text-ink-3">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
