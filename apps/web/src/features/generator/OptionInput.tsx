import type { TemplateOption } from '@campuskit/template-engine';
import { useId } from 'react';

import { Checkbox, TextField } from '../../components/ui/Field.tsx';
import { cn } from '../../lib/cn.ts';
import type { FormValue } from './logic.ts';

export function optionInputId(optionId: string): string {
  return `option-${optionId}`;
}

interface OptionInputProps {
  option: TemplateOption;
  value: FormValue | undefined;
  error?: string | undefined;
  onChange: (value: FormValue) => void;
}

/** Renders the right control for each option type declared by a template. */
export function OptionInput({ option, value, error, onChange }: OptionInputProps) {
  const id = optionInputId(option.id);
  switch (option.type) {
    case 'text':
      return (
        <TextField
          id={id}
          label={option.label}
          description={option.description}
          placeholder={option.placeholder}
          optional={!option.required}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          error={error}
          autoComplete="off"
          spellCheck={false}
        />
      );
    case 'number':
      return (
        <TextField
          id={id}
          type="number"
          inputMode="numeric"
          label={option.label}
          description={`${option.description ?? ''} Allowed: ${option.min} to ${option.max}${option.unit ? ` ${option.unit}` : ''}.`.trim()}
          min={option.min}
          max={option.max}
          step={option.step}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          error={error}
          suffix={option.unit}
          className="max-w-[14rem]"
        />
      );
    case 'boolean':
      return (
        <Checkbox
          id={id}
          label={option.label}
          description={option.description}
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
      );
    case 'select':
      return (
        <ChoiceGroup
          option={option}
          value={typeof value === 'string' ? value : option.default}
          error={error}
          onChange={onChange}
        />
      );
  }
}

function ChoiceGroup({
  option,
  value,
  error,
  onChange,
}: {
  option: Extract<TemplateOption, { type: 'select' }>;
  value: string;
  error?: string | undefined;
  onChange: (value: string) => void;
}) {
  const name = useId();
  const descriptionId = `${name}-description`;
  return (
    <fieldset
      aria-describedby={option.description ? descriptionId : undefined}
      className="space-y-2"
    >
      <legend className="text-sm font-semibold text-ink">{option.label}</legend>
      {option.description ? (
        <p id={descriptionId} className="text-sm text-ink-3">
          {option.description}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {option.choices.map((choice, index) => {
          const checked = value === choice.value;
          return (
            <label
              key={choice.value}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                checked
                  ? 'border-violet bg-violet-soft text-ink'
                  : 'border-line-strong bg-surface text-ink-2 hover:border-ink-3',
              )}
            >
              <input
                id={index === 0 ? optionInputId(option.id) : undefined}
                type="radio"
                name={name}
                value={choice.value}
                checked={checked}
                onChange={() => onChange(choice.value)}
                className="size-4 accent-violet"
              />
              {choice.swatch ? (
                <span
                  aria-hidden="true"
                  className="size-5 shrink-0 rounded-md border border-black/10"
                  style={{ background: choice.swatch }}
                />
              ) : null}
              <span className="font-medium">{choice.label}</span>
            </label>
          );
        })}
      </div>
      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
    </fieldset>
  );
}
