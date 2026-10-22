/**
 * `pnpm check:repo` — repository hygiene checks that CI runs on every change:
 *
 *  - no secrets, keys, environment files or generated output are committed;
 *  - no empty or unexpectedly large files;
 *  - the files an open-source project needs are present;
 *  - every relative link and image in the repository's Markdown resolves;
 *  - every `pnpm <script>` mentioned in the documentation and the CI
 *    workflows exists in package.json.
 *
 * Folders that are ignored by .gitignore (node_modules, dist, virtual
 * environments, caches) are skipped, so the checks see what would be
 * committed. Template-internal links are checked by `pnpm validate:catalog`.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  extractMarkdownLinks,
  isExternalHref,
  resolveRelativeHref,
} from '@campuskit/project-catalog';
import { getExclusionReason, looksLikeText } from '@campuskit/template-engine';

export interface RepoProblem {
  file: string;
  message: string;
}

/** Generated or local-only folders, all listed in .gitignore. */
const SKIPPED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'playwright-report',
  'test-results',
  'blob-report',
  '.vite',
  '.cache',
  '.scratch',
  '.venv',
  'venv',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
]);

const REQUIRED_FILES = [
  'README.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'THIRD_PARTY_NOTICES.md',
  '.gitignore',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy-pages.yml',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/new_project.yml',
  'docs/adding-a-template.md',
  'docs/new-project-checklist.md',
];

/** Real credential formats. Test fixtures use obviously fake values that don't match these. */
const SECRET_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/, 'a private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'an AWS access key id'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, 'a GitHub token'],
  [/\bgithub_pat_[A-Za-z0-9_]{40,}\b/, 'a GitHub token'],
  [/\bnpm_[A-Za-z0-9]{36}\b/, 'an npm token'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, 'a Slack token'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'a Google API key'],
  [/\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}/, 'an AI service API key'],
];

const MAX_FILE_BYTES = 1024 * 1024;
const LARGE_FILE_ALLOWLIST = [/^pnpm-lock\.yaml$/, /(^|\/)package-lock\.json$/];

/** pnpm's own commands: `pnpm <name>` runs these instead of a package.json script of that name. */
const PNPM_RESERVED = new Set([
  'ci',
  'install',
  'add',
  'remove',
  'update',
  'link',
  'unlink',
  'publish',
  'pack',
  'store',
  'exec',
  'dlx',
  'licenses',
  'why',
  'list',
  'outdated',
  'init',
  'deploy',
  'doctor',
  'config',
  'env',
  'setup',
  'server',
  'root',
  'bin',
  'audit',
  'import',
  'rebuild',
  'prune',
  'fetch',
  'patch',
]);

/** Package-manager commands that are not scripts in package.json. */
const PNPM_BUILT_INS = new Set([
  'audit',
  'install',
  'i',
  'add',
  'remove',
  'exec',
  'dlx',
  'licenses',
  'run',
  'why',
  'update',
  'outdated',
  'store',
  'list',
]);

async function walk(root: string, directory = root): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) files.push(...(await walk(root, absolute)));
    } else if (entry.isFile()) {
      files.push(relative(root, absolute).split(sep).join('/'));
    }
  }
  return files.sort();
}

/** Relative links and images in Markdown, including HTML `src`, `srcset` and `href` attributes. */
function markdownTargets(markdown: string): Array<{ href: string; line: number }> {
  const targets = extractMarkdownLinks(markdown).map((link) => ({
    href: link.href,
    line: link.line,
  }));
  let inFence = false;
  markdown.split(/\r?\n/).forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) return;
    for (const match of line.matchAll(/\b(?:src|srcset|href)="([^"]+)"/g)) {
      targets.push({ href: (match[1] ?? '').split(/\s+/)[0] ?? '', line: index + 1 });
    }
  });
  return targets;
}

/** The code in a document: fenced blocks and inline code in Markdown, `run:` commands in workflows. */
function codeOf(file: string, text: string): string[] {
  if (file.endsWith('.yml')) {
    return [...text.matchAll(/^\s*(?:-\s*)?run:\s*(.+)$/gm)].map((match) => match[1] ?? '');
  }
  const code: string[] = [];
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    else if (inFence) code.push(line);
    else for (const match of line.matchAll(/`([^`]+)`/g)) code.push(match[1] ?? '');
  }
  return code;
}

/** `pnpm <name>` commands in code. */
function pnpmScripts(file: string, text: string): string[] {
  return codeOf(file, text).flatMap((code) =>
    [...code.matchAll(/(?:^|[\s;&|(])pnpm\s+(?!-)([a-z][a-z0-9:-]*)/g)].map(
      (match) => match[1] ?? '',
    ),
  );
}

export async function checkRepository(repoRoot: string): Promise<RepoProblem[]> {
  const problems: RepoProblem[] = [];
  const files = await walk(repoRoot);
  const fileSet = new Set(files);
  const isDirectory = (path: string) => files.some((file) => file.startsWith(`${path}/`));

  for (const required of REQUIRED_FILES) {
    if (!fileSet.has(required))
      problems.push({ file: required, message: 'required file is missing' });
  }

  const rootPackage = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const scripts = new Set(Object.keys(rootPackage.scripts ?? {}));
  for (const script of scripts) {
    if (PNPM_RESERVED.has(script)) {
      problems.push({
        file: 'package.json',
        message: `the "${script}" script can't be run as "pnpm ${script}" because pnpm has its own ${script} command`,
      });
    }
  }

  for (const file of files) {
    const absolute = join(repoRoot, file);
    const reason = getExclusionReason(file);
    if (reason) problems.push({ file, message: `must not be committed (${reason})` });

    const size = (await stat(absolute)).size;
    if (size === 0) problems.push({ file, message: 'empty file' });
    if (size > MAX_FILE_BYTES && !LARGE_FILE_ALLOWLIST.some((pattern) => pattern.test(file))) {
      problems.push({ file, message: `larger than ${MAX_FILE_BYTES / 1024} KB` });
    }

    const bytes = new Uint8Array(await readFile(absolute));
    if (!looksLikeText(bytes)) continue;
    const text = new TextDecoder().decode(bytes);
    // Invisible bidirectional controls can make code read differently from how it runs ("Trojan Source").
    if (/[\u202a-\u202e\u2066-\u2069]/.test(text)) {
      problems.push({
        file,
        message: 'contains invisible bidirectional control characters; write them as \\u escapes',
      });
    }
    // This file defines the patterns, so it would match its own descriptions.
    if (file !== 'scripts/check-repo.ts') {
      for (const [pattern, what] of SECRET_PATTERNS) {
        if (pattern.test(text)) problems.push({ file, message: `looks like it contains ${what}` });
      }
    }

    const isDoc = file.endsWith('.md') && !file.startsWith('templates/');
    if (isDoc) {
      for (const { href, line } of markdownTargets(text)) {
        if (!href || isExternalHref(href) || href.startsWith('#')) continue;
        const target = resolveRelativeHref(file, href);
        if (target === null) continue;
        if (target === '..' || target.startsWith('../') || href.startsWith('/')) {
          problems.push({
            file,
            message: `line ${line}: link "${href}" must be relative and stay inside the repository`,
          });
        } else if (!fileSet.has(target) && !isDirectory(target)) {
          problems.push({ file, message: `line ${line}: broken link "${href}"` });
        }
      }
    }

    if (isDoc || file.startsWith('.github/workflows/')) {
      for (const script of pnpmScripts(file, text)) {
        if (!PNPM_BUILT_INS.has(script) && !scripts.has(script)) {
          problems.push({
            file,
            message: `mentions "pnpm ${script}", but package.json has no "${script}" script`,
          });
        }
      }
    }
  }
  return problems;
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const problems = await checkRepository(repoRoot);
  if (problems.length > 0) {
    console.error(`\nRepository check failed with ${problems.length} problem(s):\n`);
    for (const problem of problems) console.error(`  ✗ ${problem.file}: ${problem.message}`);
    console.error('');
    process.exit(1);
  }
  console.log(
    '\nRepository check OK: no secrets or generated files, links and documented commands resolve.\n',
  );
}
