/**
 * Glue between the generator form and the template engine. Nothing here
 * touches the DOM, so it is easy to test.
 */
import { generationOptions, type ProjectManifest } from '@campuskit/project-catalog';
import {
  deriveProjectSlug,
  generateProject,
  packageProject,
  parsePointer,
  replacementText,
  resolveValueRef,
  validateOptionValue,
  type GeneratedProject,
  type OptionValue,
  type ResolvedValues,
  type TemplateBundle,
  type TemplateOption,
} from '@campuskit/template-engine';

import { todayIso } from '../../lib/format.ts';

/** Form values as the inputs hold them: text and numbers as strings, booleans as booleans. */
export type FormValue = string | boolean;
export type FormValues = Record<string, FormValue>;

export const STEP_IDS = ['template', 'details', 'options', 'review', 'done'] as const;
export type StepId = (typeof STEP_IDS)[number];

export function optionsForStep(
  manifest: ProjectManifest,
  step: 'details' | 'options',
): TemplateOption[] {
  return manifest.customization.options.filter((option) =>
    step === 'details' ? option.group === 'identity' : option.group !== 'identity',
  );
}

export function initialFormValues(
  manifest: ProjectManifest,
  overrides: Partial<Record<string, string>> = {},
): FormValues {
  const values: FormValues = {};
  for (const option of manifest.customization.options) {
    const override = overrides[option.id];
    if (option.type === 'boolean') values[option.id] = option.default;
    else if (option.type === 'number') values[option.id] = String(option.default);
    else
      values[option.id] =
        override !== undefined && option.type === 'text' ? override : option.default;
  }
  return values;
}

/** Converts a form value to the type the engine expects (numbers from strings). */
export function toEngineValue(option: TemplateOption, value: FormValue | undefined): unknown {
  if (value === undefined) return option.default;
  if (option.type === 'number') {
    if (typeof value !== 'string' || value.trim() === '') return Number.NaN;
    return Number(value);
  }
  return value;
}

export function toEngineInput(
  manifest: ProjectManifest,
  values: FormValues,
): Record<string, unknown> {
  return Object.fromEntries(
    manifest.customization.options.map((option) => [
      option.id,
      toEngineValue(option, values[option.id]),
    ]),
  );
}

/** Validates the given options; returns an error message per invalid option id. */
export function validateOptions(
  options: TemplateOption[],
  values: FormValues,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const option of options) {
    const result = validateOptionValue(option, toEngineValue(option, values[option.id]));
    if (!result.ok) errors[option.id] = result.error;
  }
  return errors;
}

/**
 * Values for live previews while the student is still typing: invalid inputs
 * fall back to the template default instead of throwing.
 */
export function previewValues(manifest: ProjectManifest, values: FormValues): ResolvedValues {
  const options: Record<string, OptionValue> = {};
  for (const option of manifest.customization.options) {
    const result = validateOptionValue(option, toEngineValue(option, values[option.id]));
    options[option.id] = result.ok ? result.value : option.default;
  }
  return {
    options,
    projectSlug: deriveProjectSlug(String(options.projectName ?? ''), manifest.id),
  };
}

export interface EditPreview {
  file: string;
  label: string;
  /** What the file will contain at that location (escaped as it will be written). */
  snippet: string;
  places: number;
  usesName: boolean;
}

export function previewEdits(manifest: ProjectManifest, values: ResolvedValues): EditPreview[] {
  return manifest.customization.edits.map((edit) => {
    const snippet =
      edit.kind === 'json-set'
        ? `"${parsePointer(edit.pointer).at(-1) ?? ''}": ${JSON.stringify(resolveValueRef(edit.value, values))}`
        : replacementText(edit, values);
    return {
      file: edit.file,
      label: edit.label,
      snippet,
      places: edit.kind === 'replace' ? edit.expectedCount : 1,
      usesName: edit.value.option === 'projectName' || edit.value.option === 'projectSlug',
    };
  });
}

/** Validates everything and computes the final files (no ZIP yet). */
export function planProject(
  manifest: ProjectManifest,
  bundle: TemplateBundle,
  values: FormValues,
  now: Date = new Date(),
): GeneratedProject {
  return generateProject({
    bundle,
    input: toEngineInput(manifest, values),
    ...generationOptions(manifest, todayIso(now)),
  });
}

export interface GeneratedZip {
  project: GeneratedProject;
  zip: Uint8Array;
  fileName: string;
}

export async function buildZip(
  project: GeneratedProject,
  now: Date = new Date(),
): Promise<GeneratedZip> {
  const zip = await packageProject(project, now);
  return { project, zip, fileName: `${project.rootFolder}.zip` };
}

/**
 * Plain facts about what setting a project up involves, from the manifest:
 * what to install, whether it needs the internet, API keys or services.
 */
export function setupFacts(manifest: ProjectManifest): string[] {
  const requiredVariables = manifest.environment.variables.filter((variable) => variable.required);
  const facts = [
    `Install first: ${manifest.prerequisites.map((item) => item.name).join(', ')}`,
    `${manifest.setup.steps.length + 1} setup steps, starting with extracting the ZIP`,
    manifest.network.installNeedsInternet
      ? 'Internet needed once, to download packages'
      : 'No downloads needed to install',
    manifest.network.runsOffline
      ? 'Runs offline after that'
      : 'Needs an internet connection to run',
    requiredVariables.length === 0
      ? 'No API keys, accounts or secrets'
      : `Needs ${requiredVariables.length} environment ${requiredVariables.length === 1 ? 'variable' : 'variables'}: ${requiredVariables.map((variable) => variable.name).join(', ')}`,
  ];
  if (manifest.network.externalServices.length > 0) {
    facts.push(`Uses: ${manifest.network.externalServices.join('; ')}`);
  }
  return facts;
}
