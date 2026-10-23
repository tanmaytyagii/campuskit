/**
 * Builds the setup instructions for a project, either for the template as
 * published (project page) or for a specific generated copy (after a ZIP is
 * generated, and inside it as GETTING_STARTED.md).
 */
import type {
  OptionValue,
  ResolvedValues,
  SetupGuide,
  SetupStep,
  TemplateOption,
} from '@campuskit/template-engine';

import type { ProjectManifest } from './schema.ts';

/** The report draft every generated project includes (see generation.ts). */
export const REPORT_DRAFT_FILE = 'docs/PROJECT_REPORT_DRAFT.md';

function folderStep(folder: string): SetupStep {
  return {
    title: 'Extract the ZIP and open a terminal in the project folder',
    commands: [{ command: `cd ${folder}`, platform: 'all' }],
    note: 'On Windows, right-click the ZIP and choose “Extract All…”. On macOS, double-click it. Then open a terminal in the extracted folder.',
  };
}

/** The steps shown on a project page, starting from the template folder name. */
export function setupSteps(manifest: ProjectManifest, folder: string = manifest.id): SetupStep[] {
  return [
    folderStep(folder),
    ...manifest.setup.steps.map((step) => ({ ...step, commands: [...step.commands] })),
  ];
}

export function formatOptionValue(option: TemplateOption, value: OptionValue): string {
  switch (option.type) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'select':
      return option.choices.find((choice) => choice.value === value)?.label ?? String(value);
    case 'number':
      return option.unit ? `${String(value)} ${option.unit}` : String(value);
    case 'text':
      return String(value);
  }
}

export function buildSetupGuide(
  manifest: ProjectManifest,
  values: ResolvedValues,
  generatedOn: string,
): SetupGuide {
  const projectName = String(values.options.projectName ?? manifest.name);
  return {
    projectName,
    folderName: values.projectSlug,
    templateId: manifest.id,
    templateName: manifest.name,
    templateVersion: manifest.version,
    generatedOn,
    prerequisites: manifest.prerequisites.map((item) => ({ ...item })),
    steps: setupSteps(manifest, values.projectSlug),
    notes: [...manifest.setup.notes],
    choices: manifest.customization.options.map((option) => ({
      label: option.label,
      value: formatOptionValue(option, values.options[option.id] ?? option.default),
    })),
    environment: manifest.environment.variables.map((variable) => ({ ...variable })),
    limitations: [...manifest.limitations],
    documents: [
      ...manifest.docs.map((doc) => ({ title: doc.title, path: doc.file })),
      { title: 'Project report draft (edit before you submit)', path: REPORT_DRAFT_FILE },
    ],
  };
}
