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

/**
 * The files an option writes to, from the manifest's edits. The project name
 * also decides the folder name (projectSlug), so its edits are included.
 */
export function optionFiles(manifest: ProjectManifest, optionId: string): string[] {
  const sources = optionId === 'projectName' ? ['projectName', 'projectSlug'] : [optionId];
  return [
    ...new Set(
      manifest.customization.edits
        .filter((edit) => sources.includes(edit.value.option))
        .map((edit) => edit.file),
    ),
  ];
}

export interface UnavailableOption {
  label: string;
  group: TemplateOption['group'];
  /** Names of the templates that do offer it. */
  offeredBy: string[];
}

/**
 * Names, appearance and sample-data settings that other templates offer but
 * this one doesn't, so students know they aren't missing a hidden control.
 * Behaviour settings are specific to each project and are left out.
 */
export function unavailableOptions(
  manifest: ProjectManifest,
  projects: readonly ProjectManifest[],
): UnavailableOption[] {
  const own = new Set(manifest.customization.options.map((option) => option.id));
  const found = new Map<string, UnavailableOption>();
  for (const project of projects) {
    if (project.id === manifest.id) continue;
    for (const option of project.customization.options) {
      if (own.has(option.id) || option.group === 'behaviour') continue;
      const entry = found.get(option.id) ?? {
        label: option.label,
        group: option.group,
        offeredBy: [],
      };
      entry.offeredBy.push(project.name);
      found.set(option.id, entry);
    }
  }
  return [...found.values()];
}

export interface AppPreviewModel {
  name: string;
  institution: string | null;
  author: string | null;
  /** The accent colour the generated app will use, from the selected theme's swatch. */
  accent: string | null;
  accentLabel: string | null;
  /** Yes/no sample-data settings, e.g. "Include the demo class: Yes". */
  dataNotes: string[];
}

/** What the generated app's header will show, from the same values the generator writes. */
export function appPreviewModel(
  manifest: ProjectManifest,
  values: ResolvedValues,
): AppPreviewModel {
  const text = (id: string): string | null => {
    if (!manifest.customization.options.some((option) => option.id === id)) return null;
    const value = values.options[id];
    return typeof value === 'string' ? value.trim() : '';
  };
  const themed = manifest.customization.options.find(
    (option) => option.type === 'select' && option.choices.some((choice) => choice.swatch),
  );
  const choice =
    themed?.type === 'select'
      ? themed.choices.find((item) => item.value === values.options[themed.id])
      : undefined;
  return {
    name: text('projectName') ?? manifest.name,
    institution: text('institutionName'),
    author: text('authorName'),
    accent: choice?.swatch ?? null,
    accentLabel: choice?.label ?? null,
    dataNotes: manifest.customization.options
      .filter((option) => option.type === 'boolean' && option.group === 'data')
      .map((option) => `${option.label}: ${values.options[option.id] ? 'Yes' : 'No'}`),
  };
}

export interface GeneratorDraft {
  templateId: string;
  values: FormValues;
  step: StepId;
}

/**
 * A saved generator draft, if it is still usable: the template exists, it is
 * the template the address asks for (when it asks for one), and every value
 * has the right type for its option. Anything else falls back to defaults.
 */
export function restoreDraft(
  raw: unknown,
  requestedId: string | null,
  findProject: (id: string) => ProjectManifest | undefined,
): GeneratorDraft | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Partial<GeneratorDraft>;
  if (typeof candidate.templateId !== 'string') return null;
  const manifest = findProject(candidate.templateId);
  if (!manifest || (requestedId && requestedId !== manifest.id)) return null;
  const saved =
    typeof candidate.values === 'object' && candidate.values !== null ? candidate.values : {};
  const values = initialFormValues(manifest);
  for (const option of manifest.customization.options) {
    const value = (saved as Record<string, unknown>)[option.id];
    if (option.type === 'boolean' ? typeof value === 'boolean' : typeof value === 'string') {
      values[option.id] = value as FormValue;
    }
  }
  const step =
    typeof candidate.step === 'string' &&
    (STEP_IDS as readonly string[]).includes(candidate.step) &&
    candidate.step !== 'done'
      ? (candidate.step as StepId)
      : 'details';
  return { templateId: manifest.id, values, step };
}
