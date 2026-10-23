/**
 * Reads learning guides (learning/<id>.json and
 * learning/shared-troubleshooting.json) and checks them against the
 * templates they describe. See ../learning.ts for the format.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { BundleFile } from '@campuskit/template-engine';

import {
  findSymbolLine,
  learningGuideSchema,
  sharedTroubleshootingSchema,
  unsafeCommandReason,
  type LearningGuide,
  type SharedTroubleshooting,
  type TroubleshootingEntry,
} from '../learning.ts';
import type { ProjectManifest } from '../schema.ts';

export const SHARED_TROUBLESHOOTING_FILE = 'shared-troubleshooting.json';

export interface LearningProblem {
  file: string;
  path: string;
  message: string;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

function zodProblems(
  file: string,
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): LearningProblem[] {
  return issues.map((issue) => ({
    file,
    path: issue.path.map(String).join('.') || '(root)',
    message: issue.message,
  }));
}

/** Reads every guide and the shared troubleshooting file. A missing folder means no guides. */
export async function readLearningGuides(directory: string): Promise<{
  guides: Map<string, LearningGuide>;
  shared: SharedTroubleshooting | null;
  problems: LearningProblem[];
}> {
  const guides = new Map<string, LearningGuide>();
  const problems: LearningProblem[] = [];
  let shared: SharedTroubleshooting | null = null;
  let files: string[];
  try {
    files = (await readdir(directory)).filter((file) => file.endsWith('.json')).sort();
  } catch {
    return { guides, shared, problems };
  }

  for (const file of files) {
    let data: unknown;
    try {
      data = await readJson(join(directory, file));
    } catch (error) {
      problems.push({ file, path: '(file)', message: `Invalid JSON: ${(error as Error).message}` });
      continue;
    }
    if (file === SHARED_TROUBLESHOOTING_FILE) {
      const parsed = sharedTroubleshootingSchema.safeParse(data);
      if (!parsed.success) problems.push(...zodProblems(file, parsed.error.issues));
      else {
        shared = parsed.data;
        for (const [set, entries] of Object.entries(parsed.data.sets)) {
          problems.push(...checkCommands(file, `sets.${set}`, entries));
        }
      }
      continue;
    }
    const parsed = learningGuideSchema.safeParse(data);
    if (!parsed.success) {
      problems.push(...zodProblems(file, parsed.error.issues));
      continue;
    }
    if (`${parsed.data.templateId}.json` !== file) {
      problems.push({
        file,
        path: 'templateId',
        message: `The file should be named ${parsed.data.templateId}.json`,
      });
      continue;
    }
    guides.set(parsed.data.templateId, parsed.data);
  }
  return { guides, shared, problems };
}

function checkCommands(
  file: string,
  path: string,
  entries: readonly TroubleshootingEntry[],
): LearningProblem[] {
  const problems: LearningProblem[] = [];
  entries.forEach((entry, index) => {
    for (const part of ['diagnose', 'fix'] as const) {
      entry[part].forEach((step, stepIndex) => {
        for (const { command } of step.commands) {
          const reason = unsafeCommandReason(command);
          if (reason) {
            problems.push({
              file,
              path: `${path}.${index}.${part}.${stepIndex}`,
              message: `"${command}" ${reason}; recommend a safe alternative instead`,
            });
          }
        }
      });
    }
  });
  return problems;
}

/** Checks one guide against its manifest and the files the template actually contains. */
export function checkLearningGuide(
  guide: LearningGuide,
  manifest: ProjectManifest,
  files: ReadonlyMap<string, Pick<BundleFile, 'path' | 'encoding' | 'content'>>,
): LearningProblem[] {
  const file = `${guide.templateId}.json`;
  const problems: LearningProblem[] = [];
  const problem = (path: string, message: string) => problems.push({ file, path, message });

  const requireFile = (path: string, where: string) => {
    if (!files.has(path)) {
      problem(where, `"${path}" is not a file in templates/${manifest.id}`);
      return false;
    }
    return true;
  };
  const requireSymbol = (path: string, name: string, where: string) => {
    if (!requireFile(path, where)) return;
    const source = files.get(path);
    if (source?.encoding !== 'utf8' || findSymbolLine(path, source.content, name) === null) {
      problem(where, `"${name}" is not defined in ${path}`);
    }
  };

  guide.architecture.components.forEach((component, index) => {
    const where = `architecture.components.${index}`;
    component.files.forEach((path) => requireFile(path, `${where}.files`));
    component.symbols.forEach((symbol) =>
      requireSymbol(symbol.file, symbol.name, `${where}.symbols`),
    );
  });
  guide.walkthrough.forEach((entry, index) => {
    const where = `walkthrough.${index}`;
    requireFile(entry.file, `${where}.file`);
    entry.symbols.forEach((symbol) => requireSymbol(entry.file, symbol.name, `${where}.symbols`));
    [...entry.related, ...entry.tests].forEach((path) => requireFile(path, `${where}.related`));
  });
  guide.checklist.forEach((item, index) => {
    if (item.file) requireFile(item.file, `checklist.${index}.file`);
  });
  guide.viva.forEach((question, index) => {
    const where = `viva.${index}`;
    question.files.forEach((path) => requireFile(path, `${where}.files`));
    question.symbols.forEach((symbol) =>
      requireSymbol(symbol.file, symbol.name, `${where}.symbols`),
    );
  });

  // The customization preview shows these labels, so they must be the app's own.
  const textFiles = [...files.values()].filter((item) => item.encoding === 'utf8');
  guide.preview.navigation.forEach((label, index) => {
    if (!textFiles.some((item) => item.content.includes(label))) {
      problem(`preview.navigation.${index}`, `The app never shows the label "${label}"`);
    }
  });

  const expectedSet = manifest.template.packageManager === 'npm' ? 'npm-vite' : 'python-streamlit';
  guide.troubleshooting.include.forEach((set, index) => {
    if (set !== expectedSet) {
      problem(
        `troubleshooting.include.${index}`,
        `"${set}" advice doesn't match a ${manifest.template.packageManager} project; use "${expectedSet}"`,
      );
    }
  });
  problems.push(...checkCommands(file, 'troubleshooting.entries', guide.troubleshooting.entries));
  return problems;
}

/**
 * Colour swatches in the generator must be colours the template really uses,
 * because the customization preview paints with them.
 */
export function checkSwatches(
  manifest: ProjectManifest,
  files: ReadonlyMap<string, Pick<BundleFile, 'encoding' | 'content'>>,
): Array<{ path: string; message: string }> {
  const problems: Array<{ path: string; message: string }> = [];
  const sources = [...files.values()]
    .filter((item) => item.encoding === 'utf8')
    .map((item) => item.content.toLowerCase());
  manifest.customization.options.forEach((option, index) => {
    if (option.type !== 'select') return;
    const written = manifest.customization.edits
      .filter((edit) => edit.value.option === option.id && edit.value.map)
      .flatMap((edit) => Object.values(edit.value.map ?? {}).map((value) => value.toLowerCase()));
    for (const choice of option.choices) {
      if (!choice.swatch) continue;
      const swatch = choice.swatch.toLowerCase();
      if (!written.includes(swatch) && !sources.some((source) => source.includes(swatch))) {
        problems.push({
          path: `customization.options.${index}`,
          message: `The swatch ${choice.swatch} for "${choice.label}" is not a colour the template uses`,
        });
      }
    }
  });
  return problems;
}
