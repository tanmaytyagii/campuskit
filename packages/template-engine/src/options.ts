/**
 * Turns a template's declared options into a validation schema and resolves
 * raw form input into clean, typed values.
 */
import { z } from './zod.ts';

import { deriveProjectSlug } from './slug.ts';
import {
  PROJECT_NAME_OPTION_ID,
  type CustomizationSpec,
  type TemplateOption,
  type TextOption,
} from './spec.ts';

export type OptionValue = string | number | boolean;

/** Validated option values plus the values the engine derives from them. */
export interface ResolvedValues {
  readonly options: Readonly<Record<string, OptionValue>>;
  readonly projectSlug: string;
}

export type FieldErrors = Record<string, string>;

export class OptionValidationError extends Error {
  readonly fieldErrors: FieldErrors;

  constructor(fieldErrors: FieldErrors) {
    const summary = Object.entries(fieldErrors)
      .map(([field, message]) => `${field}: ${message}`)
      .join('; ');
    super(`Invalid customization values (${summary})`);
    this.name = 'OptionValidationError';
    this.fieldErrors = fieldErrors;
  }
}

// Control characters (including newlines and tabs) and the Unicode
// bidirectional-override characters that can make text display differently
// from how it is stored ("Trojan Source").
// eslint-disable-next-line no-control-regex
const FORBIDDEN_TEXT = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;

function textSchema(option: TextOption) {
  return z
    .string({ error: `${option.label} must be text` })
    .transform((value) => value.normalize('NFC').trim())
    .pipe(
      z
        .string()
        .refine((value) => !FORBIDDEN_TEXT.test(value), {
          message: 'Remove line breaks, tabs and invisible control characters',
        })
        .refine((value) => (option.required ? value.length > 0 : true), {
          message: `${option.label} is required`,
        })
        .refine((value) => value.length === 0 || [...value].length >= option.minLength, {
          message: `Use at least ${option.minLength} characters`,
        })
        .refine((value) => [...value].length <= option.maxLength, {
          message: `Use at most ${option.maxLength} characters`,
        }),
    );
}

function schemaForOption(option: TemplateOption): z.ZodType<OptionValue> {
  switch (option.type) {
    case 'text':
      return textSchema(option);
    case 'number': {
      let schema = z
        .number({ error: `Enter a number for ${option.label.toLowerCase()}` })
        .refine(Number.isFinite, { message: 'Enter a finite number' })
        .refine((value) => value >= option.min, { message: `Use ${option.min} or more` })
        .refine((value) => value <= option.max, { message: `Use ${option.max} or less` });
      if (option.integer) {
        schema = schema.refine(Number.isInteger, { message: 'Use a whole number' });
      }
      return schema;
    }
    case 'select': {
      const values = option.choices.map((choice) => choice.value);
      return z.string().refine((value) => values.includes(value), {
        message: `Choose one of: ${option.choices.map((choice) => choice.label).join(', ')}`,
      });
    }
    case 'boolean':
      return z.boolean({ error: `${option.label} must be on or off` });
  }
}

/** Default values for every option, as declared by the template. */
export function getDefaultValues(spec: CustomizationSpec): Record<string, OptionValue> {
  return Object.fromEntries(spec.options.map((option) => [option.id, option.default]));
}

/**
 * Validates a single option value. Useful for inline form validation.
 * Returns the cleaned value or an error message.
 */
export function validateOptionValue(
  option: TemplateOption,
  raw: unknown,
): { ok: true; value: OptionValue } | { ok: false; error: string } {
  const result = schemaForOption(option).safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: result.error.issues[0]?.message ?? 'Invalid value' };
}

/**
 * Validates `raw` against the template's options. Missing values fall back to
 * the template defaults; unknown keys are rejected so typos surface early.
 */
export function resolveValues(
  spec: CustomizationSpec,
  raw: Readonly<Record<string, unknown>>,
  templateId: string,
): ResolvedValues {
  const errors: FieldErrors = {};
  const known = new Set(spec.options.map((option) => option.id));
  for (const key of Object.keys(raw)) {
    if (!known.has(key)) errors[key] = 'This template does not support this option';
  }

  const options: Record<string, OptionValue> = {};
  for (const option of spec.options) {
    const input = raw[option.id] === undefined ? option.default : raw[option.id];
    const result = validateOptionValue(option, input);
    if (result.ok) options[option.id] = result.value;
    else errors[option.id] = result.error;
  }

  if (Object.keys(errors).length > 0) throw new OptionValidationError(errors);

  const projectName = String(options[PROJECT_NAME_OPTION_ID] ?? '');
  return { options, projectSlug: deriveProjectSlug(projectName, templateId) };
}

/** Like `resolveValues`, but returns errors instead of throwing. */
export function safeResolveValues(
  spec: CustomizationSpec,
  raw: Readonly<Record<string, unknown>>,
  templateId: string,
): { ok: true; values: ResolvedValues } | { ok: false; errors: FieldErrors } {
  try {
    return { ok: true, values: resolveValues(spec, raw, templateId) };
  } catch (error) {
    if (error instanceof OptionValidationError) return { ok: false, errors: error.fieldErrors };
    throw error;
  }
}
