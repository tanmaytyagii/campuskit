/**
 * Schemas for template customization and template bundles.
 *
 * A template declares *options* (what a student may change) and *edits*
 * (exactly where each value is written). Nothing outside the declared edits is
 * ever modified, which keeps customization honest: if a template does not
 * declare an edit for something, the generator offers no control for it.
 */
import { z } from './zod.ts';

import { ESCAPE_CONTEXTS } from './escape.ts';
import { isSafeRelativePath } from './paths.ts';

/** Values computed by the engine that edits may reference like options. */
export const DERIVED_VALUE_IDS = ['projectSlug'] as const;
export type DerivedValueId = (typeof DERIVED_VALUE_IDS)[number];

/** Every customizable template must offer this option. */
export const PROJECT_NAME_OPTION_ID = 'projectName';

const optionId = z
  .string()
  .regex(
    /^[a-z][A-Za-z0-9]{1,39}$/,
    'Option ids are camelCase, 2-40 characters, starting with a letter',
  );

const relativePath = z
  .string()
  .refine(isSafeRelativePath, 'Must be a safe relative path such as "src/app.config.json"');

const OPTION_GROUPS = ['identity', 'appearance', 'data', 'behaviour'] as const;
export type OptionGroup = (typeof OPTION_GROUPS)[number];

const optionBase = {
  id: optionId,
  label: z.string().min(1).max(60),
  description: z.string().max(240).optional(),
  group: z.enum(OPTION_GROUPS),
};

export const textOptionSchema = z.strictObject({
  ...optionBase,
  type: z.literal('text'),
  required: z.boolean(),
  default: z.string().max(200),
  minLength: z.number().int().min(0).max(200),
  maxLength: z.number().int().min(1).max(200),
  placeholder: z.string().max(80).optional(),
});

export const numberOptionSchema = z.strictObject({
  ...optionBase,
  type: z.literal('number'),
  default: z.number(),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  integer: z.boolean(),
  unit: z.string().max(16).optional(),
});

export const selectChoiceSchema = z.strictObject({
  value: z
    .string()
    .regex(/^[a-z0-9-]{1,32}$/, 'Choice values are lowercase letters, digits and hyphens'),
  label: z.string().min(1).max(40),
  description: z.string().max(160).optional(),
  swatch: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Swatches are 6-digit hex colours')
    .optional(),
});

export const selectOptionSchema = z.strictObject({
  ...optionBase,
  type: z.literal('select'),
  default: z.string(),
  choices: z.array(selectChoiceSchema).min(2).max(12),
});

export const booleanOptionSchema = z.strictObject({
  ...optionBase,
  type: z.literal('boolean'),
  default: z.boolean(),
});

export const optionSchema = z.discriminatedUnion('type', [
  textOptionSchema,
  numberOptionSchema,
  selectOptionSchema,
  booleanOptionSchema,
]);

export const valueRefSchema = z.strictObject({
  /** An option id, or a derived value such as `projectSlug`. */
  option: z.string(),
  /** For select options: maps each choice value to the text that is written. */
  map: z.record(z.string(), z.string()).optional(),
  /** Text written instead of an empty optional value. */
  whenEmpty: z.string().max(120).optional(),
});

const editBase = {
  /** Human-readable description shown in the generator's review step. */
  label: z.string().min(3).max(120),
  file: relativePath,
  value: valueRefSchema,
};

export const jsonSetEditSchema = z.strictObject({
  ...editBase,
  kind: z.literal('json-set'),
  /** RFC 6901 JSON Pointer to an existing value, e.g. "/appName". */
  pointer: z.string().regex(/^(\/[^/]*)+$/, 'Must be a JSON Pointer such as "/appName"'),
});

export const replaceEditSchema = z.strictObject({
  ...editBase,
  kind: z.literal('replace'),
  /** Exact text in the template file that is replaced. */
  find: z.string().min(3).max(200),
  escape: z.enum(ESCAPE_CONTEXTS),
  /** How many times `find` must occur; a mismatch means the template drifted. */
  expectedCount: z.number().int().min(1).max(50),
});

export const editSchema = z.discriminatedUnion('kind', [jsonSetEditSchema, replaceEditSchema]);

export const customizationSpecSchema = z
  .strictObject({
    options: z.array(optionSchema).min(1).max(20),
    edits: z.array(editSchema).min(1).max(80),
  })
  .superRefine((spec, ctx) => {
    const ids = new Set<string>();
    spec.options.forEach((option, index) => {
      if (ids.has(option.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['options', index, 'id'],
          message: `Duplicate option id "${option.id}"`,
        });
      }
      ids.add(option.id);
      if ((DERIVED_VALUE_IDS as readonly string[]).includes(option.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['options', index, 'id'],
          message: `"${option.id}" is computed by the engine and cannot be declared as an option`,
        });
      }
      for (const problem of describeOptionProblems(option)) {
        ctx.addIssue({ code: 'custom', path: ['options', index], message: problem });
      }
    });

    const projectName = spec.options.find((option) => option.id === PROJECT_NAME_OPTION_ID);
    if (!projectName || projectName.type !== 'text' || !projectName.required) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: `Templates must declare a required text option "${PROJECT_NAME_OPTION_ID}"`,
      });
    }

    const editKindsByFile = new Map<string, Set<string>>();
    spec.edits.forEach((edit, index) => {
      const kinds = editKindsByFile.get(edit.file) ?? new Set<string>();
      kinds.add(edit.kind);
      editKindsByFile.set(edit.file, kinds);
      if (kinds.size > 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['edits', index, 'kind'],
          message: `"${edit.file}" mixes json-set and replace edits; use one kind per file`,
        });
      }

      const isDerived = (DERIVED_VALUE_IDS as readonly string[]).includes(edit.value.option);
      const option = spec.options.find((candidate) => candidate.id === edit.value.option);
      if (!option && !isDerived) {
        ctx.addIssue({
          code: 'custom',
          path: ['edits', index, 'value', 'option'],
          message: `Edit refers to unknown option "${edit.value.option}"`,
        });
        return;
      }
      if (edit.value.map) {
        if (!option || option.type !== 'select') {
          ctx.addIssue({
            code: 'custom',
            path: ['edits', index, 'value', 'map'],
            message: 'Only select options can use "map"',
          });
        } else {
          const choiceValues = option.choices.map((choice) => choice.value).sort();
          const mapKeys = Object.keys(edit.value.map).sort();
          if (choiceValues.join('|') !== mapKeys.join('|')) {
            ctx.addIssue({
              code: 'custom',
              path: ['edits', index, 'value', 'map'],
              message: `"map" must have exactly one entry per choice (${choiceValues.join(', ')})`,
            });
          }
        }
      }
      if (
        edit.value.whenEmpty !== undefined &&
        (!option || option.type !== 'text' || option.required)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['edits', index, 'value', 'whenEmpty'],
          message: '"whenEmpty" is only meaningful for optional text options',
        });
      }
      if (edit.kind === 'replace' && edit.escape === 'none' && option?.type === 'text') {
        ctx.addIssue({
          code: 'custom',
          path: ['edits', index, 'escape'],
          message:
            'Free-text values must be escaped; choose html, markdown, toml-string or json-string',
        });
      }
    });
  });

function describeOptionProblems(option: z.infer<typeof optionSchema>): string[] {
  const problems: string[] = [];
  switch (option.type) {
    case 'text':
      if (option.minLength > option.maxLength) problems.push('minLength is greater than maxLength');
      if (option.required && option.minLength < 1)
        problems.push('required text options need minLength >= 1');
      if (option.default.length > option.maxLength)
        problems.push('default is longer than maxLength');
      if (option.default.length > 0 && option.default.length < option.minLength) {
        problems.push('default is shorter than minLength');
      }
      break;
    case 'number':
      if (option.min > option.max) problems.push('min is greater than max');
      if (option.default < option.min || option.default > option.max)
        problems.push('default is outside min/max');
      if (option.integer && !Number.isInteger(option.default))
        problems.push('default must be an integer');
      break;
    case 'select': {
      const values = option.choices.map((choice) => choice.value);
      if (new Set(values).size !== values.length) problems.push('choice values must be unique');
      if (!values.includes(option.default))
        problems.push(`default "${option.default}" is not one of the choices`);
      break;
    }
    case 'boolean':
      break;
  }
  return problems;
}

export type TextOption = z.infer<typeof textOptionSchema>;
export type NumberOption = z.infer<typeof numberOptionSchema>;
export type SelectOption = z.infer<typeof selectOptionSchema>;
export type BooleanOption = z.infer<typeof booleanOptionSchema>;
export type TemplateOption = z.infer<typeof optionSchema>;
export type ValueRef = z.infer<typeof valueRefSchema>;
export type JsonSetEdit = z.infer<typeof jsonSetEditSchema>;
export type ReplaceEdit = z.infer<typeof replaceEditSchema>;
export type TemplateEdit = z.infer<typeof editSchema>;
export type CustomizationSpec = z.infer<typeof customizationSpecSchema>;

// ---------------------------------------------------------------------------
// Template bundles: the template's files, serialised for the browser.
// ---------------------------------------------------------------------------

export const bundleFileSchema = z.strictObject({
  path: relativePath,
  encoding: z.enum(['utf8', 'base64']),
  content: z.string(),
  size: z.number().int().min(0),
});

export const templateBundleSchema = z.strictObject({
  schemaVersion: z.literal(1),
  templateId: z.string().regex(/^[a-z0-9-]{2,64}$/),
  templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  files: z.array(bundleFileSchema).max(2000),
});

export type BundleFile = z.infer<typeof bundleFileSchema>;
export type TemplateBundle = z.infer<typeof templateBundleSchema>;
