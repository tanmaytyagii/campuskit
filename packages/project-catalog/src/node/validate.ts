/**
 * Validates the catalog against the files on disk. Run with
 * `pnpm validate:catalog`; CI runs it on every change.
 *
 * Checks, for every manifest:
 *  - JSON syntax and the manifest schema (unknown keys, wrong types, ...);
 *  - unique ids and slugs, and that every manifest file is registered;
 *  - the template folder exists and matches the id;
 *  - required files exist (README, LICENSE, docs, screenshots, lockfiles);
 *  - relative links in the template's Markdown files point to real files;
 *  - every customization edit applies cleanly, with the defaults and with
 *    a stress-test name full of special characters and Unicode;
 *  - the template folder contains no credential files (.env, keys, ...);
 *  - verification records are well formed and belong to a template.
 *
 * It also works out each template's status (verified, awaiting verification,
 * ...). An out-of-date or failed verification is a warning, not an error:
 * contributors can't always run every platform, and the site then shows the
 * template as awaiting verification instead of verified.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';

import {
  generateProject,
  isCanonicalJson,
  isSecretPath,
  type BundleFile,
} from '@campuskit/template-engine';
import { buildTemplateBundle } from '@campuskit/template-engine/node';

import { checkManifests, type RawManifest } from '../catalog.ts';
import { extractMarkdownLinks, resolveRelativeHref } from '../markdown-links.ts';
import type { ProjectManifest } from '../schema.ts';
import { generationOptions } from '../generation.ts';
import { PLATFORM_LABELS, templateStatus, type TemplateStatus } from '../verification.ts';
import { templateFingerprint } from './fingerprint.ts';
import { readVerificationRecords } from './records.ts';

export interface CatalogIssue {
  manifest: string;
  path: string;
  message: string;
}

export interface CatalogReport {
  issues: CatalogIssue[];
  /** Problems that don't fail validation, such as an out-of-date verification. */
  warnings: CatalogIssue[];
  manifests: ProjectManifest[];
  /** Number of files bundled per template id. */
  fileCounts: Record<string, number>;
  /** Fingerprint of each template's files and generation settings. */
  fingerprints: Record<string, string>;
  statuses: Record<string, TemplateStatus>;
}

/** A project name that exercises every escaping rule. */
export const STRESS_PROJECT_NAME = `Riya & Sam's <Lab> "App" *v2* | उपस्थिति ✓`;

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp)$/i;

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

export async function readManifestFiles(
  manifestsDir: string,
): Promise<{ raw: RawManifest[]; issues: CatalogIssue[] }> {
  const issues: CatalogIssue[] = [];
  const raw: RawManifest[] = [];
  const files = (await readdir(manifestsDir)).filter((file) => file.endsWith('.json')).sort();
  for (const file of files) {
    try {
      raw.push({
        file,
        data: JSON.parse(await readFile(join(manifestsDir, file), 'utf8')) as unknown,
      });
    } catch (error) {
      issues.push({
        manifest: file,
        path: '(file)',
        message: `Invalid JSON: ${(error as Error).message}`,
      });
    }
  }
  return { raw, issues };
}

function checkTemplateFiles(
  manifest: ProjectManifest,
  files: Map<string, BundleFile>,
  issue: (path: string, message: string) => void,
) {
  const requireFile = (path: string, why: string) => {
    if (!files.has(path))
      issue(
        path,
        `${why} "${path}" is missing from the template (or excluded by the safety rules)`,
      );
  };

  requireFile(manifest.license.file, 'License file');
  for (const doc of manifest.docs) requireFile(doc.file, `Document "${doc.title}"`);
  for (const shot of manifest.media.screenshots) {
    requireFile(shot.file, 'Screenshot');
    const file = files.get(shot.file);
    if (file && (!IMAGE_EXTENSIONS.test(shot.file) || file.encoding !== 'base64')) {
      issue(shot.file, 'Screenshots must be PNG, JPEG or WebP images');
    }
  }
  if (manifest.template.packageManager === 'npm') {
    requireFile('package.json', 'npm project file');
    requireFile('package-lock.json', 'npm lockfile');
  } else {
    requireFile('requirements.txt', 'pip requirements file');
  }

  // Every relative link in every Markdown file must point to a file in the template.
  for (const file of files.values()) {
    if (!file.path.endsWith('.md') || file.encoding !== 'utf8') continue;
    for (const link of extractMarkdownLinks(file.content)) {
      const target = resolveRelativeHref(file.path, link.href);
      if (target === null) continue;
      if (target === '..' || target.startsWith('../')) {
        issue(file.path, `Line ${link.line}: link "${link.href}" points outside the template`);
      } else if (
        !files.has(target) &&
        ![...files.keys()].some((path) => path.startsWith(`${target}/`))
      ) {
        issue(file.path, `Line ${link.line}: broken link "${link.href}" (no file ${target})`);
      }
    }
  }

  // JSON files edited with json-set must already be in the format the engine writes back.
  const jsonFiles = new Set(
    manifest.customization.edits
      .filter((edit) => edit.kind === 'json-set')
      .map((edit) => edit.file),
  );
  for (const path of jsonFiles) {
    const file = files.get(path);
    if (file && !isCanonicalJson(file.content)) {
      issue(
        path,
        'Format this JSON file with 2-space indentation and a final newline so generated copies match it',
      );
    }
  }
}

function checkGeneration(
  manifest: ProjectManifest,
  bundle: Parameters<typeof generateProject>[0]['bundle'],
  issue: (path: string, message: string) => void,
) {
  const attempts: Array<{ label: string; input: Record<string, unknown> }> = [
    { label: 'default values', input: {} },
    {
      label: 'a name with special characters and Unicode',
      input: { projectName: STRESS_PROJECT_NAME },
    },
  ];
  for (const attempt of attempts) {
    try {
      generateProject({
        bundle,
        input: attempt.input,
        ...generationOptions(manifest, '2026-01-01'),
      });
    } catch (error) {
      issue(
        'customization',
        `Generating with ${attempt.label} failed: ${(error as Error).message}`,
      );
    }
  }
}

export async function validateCatalog(options: {
  repoRoot: string;
  manifestsDir: string;
  registeredFiles: readonly string[];
  /** Folder with verification records; defaults to ../verification next to the manifests. */
  verificationDir?: string;
}): Promise<CatalogReport> {
  const { raw, issues } = await readManifestFiles(options.manifestsDir);
  const warnings: CatalogIssue[] = [];
  const fileCounts: Record<string, number> = {};
  const fingerprints: Record<string, string> = {};
  const statuses: Record<string, TemplateStatus> = {};
  const verificationDir =
    options.verificationDir ?? join(options.manifestsDir, '..', 'verification');
  const { records, problems: recordProblems } = await readVerificationRecords(verificationDir);
  for (const problem of recordProblems) {
    issues.push({
      manifest: `verification/${problem.file}`,
      path: '(file)',
      message: problem.message,
    });
  }

  const registered = new Set(options.registeredFiles);
  for (const entry of raw) {
    if (!registered.has(entry.file)) {
      issues.push({
        manifest: entry.file,
        path: '(file)',
        message: 'This manifest is not registered in packages/project-catalog/src/registry.ts',
      });
    }
  }
  for (const file of registered) {
    if (!raw.some((entry) => entry.file === file)) {
      issues.push({
        manifest: file,
        path: '(file)',
        message: 'Registered in src/registry.ts but the file does not exist',
      });
    }
  }

  const { manifests, problems } = checkManifests(raw);
  issues.push(...problems);

  for (const manifest of manifests) {
    const name = `${manifest.id}.json`;
    const issue = (path: string, message: string) => issues.push({ manifest: name, path, message });
    const directory = join(options.repoRoot, manifest.template.directory);

    if (basename(manifest.template.directory) !== manifest.id) {
      issue('template.directory', `The template folder should be templates/${manifest.id}`);
    }
    if (!(await isDirectory(directory))) {
      issue('template.directory', `Folder ${manifest.template.directory} does not exist`);
      continue;
    }

    let built;
    try {
      built = await buildTemplateBundle(directory, {
        templateId: manifest.id,
        templateVersion: manifest.version,
      });
    } catch (error) {
      issue('template.directory', `The template could not be bundled: ${(error as Error).message}`);
      continue;
    }
    const { bundle } = built;
    for (const skipped of built.skipped) {
      if (isSecretPath(skipped.path)) {
        issue(
          skipped.path,
          'Credential files must not be committed with a template. Delete it (and rotate the secret if it was real); document variables in manifest "environment" and ship a .env.example instead',
        );
      }
    }
    fileCounts[manifest.id] = bundle.files.length;
    const files = new Map(bundle.files.map((file) => [file.path, file]));
    checkTemplateFiles(manifest, files, issue);
    checkGeneration(manifest, bundle, issue);

    const fingerprint = templateFingerprint(manifest, bundle.files);
    fingerprints[manifest.id] = fingerprint;
    const status = templateStatus(manifest, records.get(manifest.id) ?? null, fingerprint);
    statuses[manifest.id] = status;
    const rerun = `run "pnpm verify:generated ${manifest.id} --record" on that platform`;
    for (const entry of status.outdated) {
      warnings.push({
        manifest: name,
        path: `verification (${PLATFORM_LABELS[entry.platform]})`,
        message: `The ${entry.verifiedOn} verification no longer matches the template (it changed since); ${rerun}`,
      });
    }
    for (const entry of status.current.filter((item) => item.runs.some((run) => !run.passed))) {
      warnings.push({
        manifest: name,
        path: `verification (${PLATFORM_LABELS[entry.platform]})`,
        message: `The ${entry.verifiedOn} verification failed; fix the template, then ${rerun}`,
      });
    }
  }

  for (const templateId of records.keys()) {
    if (!manifests.some((manifest) => manifest.id === templateId)) {
      issues.push({
        manifest: `verification/${templateId}.json`,
        path: 'templateId',
        message: `No manifest has the id "${templateId}"; delete the record or fix its templateId`,
      });
    }
  }

  return { issues, warnings, manifests, fileCounts, fingerprints, statuses };
}
