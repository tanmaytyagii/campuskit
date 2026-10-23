/**
 * `pnpm verify:generated [template-id ...] [--files-only] [--keep]`
 *
 * Checks the projects students actually receive. For every template (or the
 * ones named), it generates two projects the way the website does: one with
 * the default values and one with every option changed, including a project
 * name full of special characters and Unicode. For each one it:
 *
 *  1. packages the ZIP and extracts it with the safe extractor;
 *  2. checks there is one root folder, the extracted files are byte-identical
 *     to what the engine produced, nothing excluded slipped in, hidden project
 *     files were kept and every declared customization was written;
 *  3. checks the manifest's npm commands exist in package.json;
 *  4. installs the dependencies and runs the project's tests and build
 *     (npm), or creates a virtual environment, runs pytest and starts the
 *     Streamlit app until its health check answers (pip).
 *
 * Generated code only runs here, in a temporary folder, never in the browser.
 *
 * Options: --files-only skips step 4; --keep keeps the temporary folders;
 * --record writes the results for this platform to
 * packages/project-catalog/verification/<id>.json, which is what the website
 * shows as the template's verification status (commit the file).
 * Environment: CAMPUSKIT_PYTHON chooses the Python interpreter (default:
 * python on Windows, python3 elsewhere).
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { arch, release, tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  catalog,
  generationOptions,
  PLATFORM_LABELS,
  REPORT_DRAFT_FILE,
  type ProjectManifest,
  type VerificationEntry,
} from '@campuskit/project-catalog';
import {
  platformFromNode,
  STRESS_PROJECT_NAME,
  templateFingerprint,
  writeVerificationEntry,
} from '@campuskit/project-catalog/node';
import {
  base64ToBytes,
  escapeHtml,
  formatJson,
  generateProjectZip,
  getAtPointer,
  getExclusionReason,
  replacementText,
  resolveValueRef,
  utf8Encode,
  type GeneratedProject,
  type OptionValue,
  type TemplateOption,
} from '@campuskit/template-engine';
import { buildTemplateBundle, extractZipArchive } from '@campuskit/template-engine/node';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const GENERATED_ON = new Date('2026-10-21T10:30:00Z');

const args = process.argv.slice(2);
const filesOnly = args.includes('--files-only');
const keep = args.includes('--keep');
const record = args.includes('--record');
const verificationDir = join(repoRoot, 'packages', 'project-catalog', 'verification');
const requested = args.filter((arg) => !arg.startsWith('--'));
const python = process.env.CAMPUSKIT_PYTHON ?? (isWindows ? 'python' : 'python3');

class CheckError extends Error {}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new CheckError(message);
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

const OTHER_TEXT = 'Ünïcode “Test” <School> & Co. ✓';

/** A value different from the default for every option, to exercise every edit. */
function customizedValue(option: TemplateOption): OptionValue {
  switch (option.type) {
    case 'text': {
      const value = option.id === 'projectName' ? STRESS_PROJECT_NAME : OTHER_TEXT;
      return [...value].slice(0, option.maxLength).join('');
    }
    case 'number': {
      const up = option.default + option.step;
      return up <= option.max ? up : option.default - option.step;
    }
    case 'select':
      return (
        [...option.choices].reverse().find((choice) => choice.value !== option.default)?.value ??
        option.default
      );
    case 'boolean':
      return !option.default;
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

interface RunOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
}

function start(command: string, commandArgs: string[], options: RunOptions): ChildProcess {
  return spawn(command, commandArgs, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: ['ignore', 'pipe', 'pipe'],
    // npm is a .cmd script on Windows, which needs a shell.
    shell: isWindows && command === 'npm',
  });
}

function run(command: string, commandArgs: string[], options: RunOptions): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = start(command, commandArgs, options);
    let output = '';
    child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('error', (error) =>
      reject(new CheckError(`Could not run ${command}: ${error.message}`)),
    );
    child.on('close', (code) => {
      if (code === 0) resolvePromise(output);
      else
        reject(
          new CheckError(
            `"${command} ${commandArgs.join(' ')}" exited with code ${code}:\n${output.slice(-3000)}`,
          ),
        );
    });
  });
}

function freePort(): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() =>
        typeof address === 'object' && address
          ? resolvePromise(address.port)
          : reject(new Error('no port')),
      );
    });
  });
}

async function waitForHealth(url: string, child: ChildProcess, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new CheckError(`The app stopped with exit code ${child.exitCode} before it was ready`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new CheckError(`${url} did not answer within ${timeoutMs / 1000} seconds`);
}

// ---------------------------------------------------------------------------
// File checks
// ---------------------------------------------------------------------------

async function listFiles(root: string, directory = root): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(root, absolute)));
    else files.push(relative(root, absolute).split(sep).join('/'));
  }
  return files.sort();
}

function expectedBytes(file: GeneratedProject['files'][number]): Uint8Array {
  return file.encoding === 'utf8' ? utf8Encode(file.content) : base64ToBytes(file.content);
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

function checkManifestCommands(manifest: ProjectManifest, packageJson: string | undefined) {
  if (manifest.template.packageManager !== 'npm') return;
  check(packageJson, 'package.json is missing');
  const scripts = (JSON.parse(packageJson) as { scripts?: Record<string, string> }).scripts ?? {};
  const commands = [
    ...manifest.setup.steps.flatMap((step) => step.commands),
    ...manifest.testing.commands,
  ];
  for (const { command } of commands) {
    const match = /^npm (?:run (\S+)|(test|start))\b/.exec(command);
    const script = match?.[1] ?? match?.[2];
    if (script)
      check(
        scripts[script],
        `The manifest documents "${command}" but package.json has no "${script}" script`,
      );
  }
}

async function checkFiles(
  manifest: ProjectManifest,
  project: GeneratedProject,
  extractDir: string,
  bundlePaths: string[],
) {
  const root = project.rootFolder;
  const topLevel = await readdir(extractDir);
  check(
    topLevel.length === 1 && topLevel[0] === root,
    `Expected one root folder "${root}", found: ${topLevel.join(', ')}`,
  );

  const projectDir = join(extractDir, root);
  const extracted = await listFiles(projectDir);
  const expected = project.files.map((file) => file.path).sort();
  check(
    extracted.join('\n') === expected.join('\n'),
    `The extracted files differ from the generated ones.\nOnly in the ZIP: ${extracted.filter((path) => !expected.includes(path)).join(', ') || 'none'}\nMissing: ${expected.filter((path) => !extracted.includes(path)).join(', ') || 'none'}`,
  );
  for (const file of project.files) {
    const onDisk = new Uint8Array(await readFile(join(projectDir, file.path)));
    check(sameBytes(onDisk, expectedBytes(file)), `${file.path} was not extracted byte for byte`);
  }

  for (const path of extracted) {
    check(
      getExclusionReason(path) === null,
      `${path} must not be in a generated project (${getExclusionReason(path)})`,
    );
  }
  for (const path of bundlePaths.filter((item) =>
    item.split('/').some((segment) => segment.startsWith('.')),
  )) {
    check(extracted.includes(path), `The hidden project file ${path} was dropped`);
  }
  check(extracted.includes('GETTING_STARTED.md'), 'GETTING_STARTED.md is missing');
  check(extracted.includes(REPORT_DRAFT_FILE), `${REPORT_DRAFT_FILE} is missing`);

  const text = async (path: string) => readFile(join(projectDir, path), 'utf8');
  for (const edit of manifest.customization.edits) {
    if (edit.kind === 'json-set') {
      const document = JSON.parse(await text(edit.file)) as unknown;
      const actual = getAtPointer(document, edit.pointer);
      const wanted = resolveValueRef(edit.value, project.values);
      check(
        actual === wanted,
        `${edit.file} ${edit.pointer} is ${JSON.stringify(actual)}, expected ${JSON.stringify(wanted)} ("${edit.label}")`,
      );
      check(
        formatJson(document) === (await text(edit.file)),
        `${edit.file} is not formatted the way the engine writes JSON`,
      );
    } else {
      const content = await text(edit.file);
      const written = replacementText(edit, project.values);
      const count = content.split(written).length - 1;
      check(
        count >= edit.expectedCount,
        `${edit.file} contains "${written}" ${count} time(s), expected ${edit.expectedCount} ("${edit.label}")`,
      );
    }
  }

  const guide = await text('GETTING_STARTED.md');
  check(
    guide.includes(`cd ${root}`),
    'GETTING_STARTED.md does not tell students to cd into the project folder',
  );
  for (const step of manifest.setup.steps) {
    for (const command of step.commands)
      check(guide.includes(command.command), `GETTING_STARTED.md is missing "${command.command}"`);
  }
  checkManifestCommands(
    manifest,
    extracted.includes('package.json') ? await text('package.json') : undefined,
  );
}

// ---------------------------------------------------------------------------
// Running the generated projects
// ---------------------------------------------------------------------------

async function checkPythonVersion(): Promise<void> {
  const output = await run(python, ['--version'], { cwd: repoRoot });
  const match = /Python (\d+)\.(\d+)/.exec(output);
  check(
    match && (Number(match[1]) > 3 || (Number(match[1]) === 3 && Number(match[2]) >= 11)),
    `${python} is ${output.trim()}; Python 3.11 or newer is required`,
  );
}

async function runNpmProject(projectDir: string, project: GeneratedProject): Promise<string[]> {
  const steps: string[] = [];
  await run('npm', ['ci', '--include=dev', '--no-audit', '--no-fund'], { cwd: projectDir });
  steps.push('npm ci');
  const testOutput = await run('npm', ['test'], { cwd: projectDir, env: { CI: 'true' } });
  const summary = /Tests\s+(\d+) passed/.exec(testOutput);
  steps.push(`npm test (${summary ? `${summary[1]} passed` : 'passed'})`);
  await run('npm', ['run', 'build'], { cwd: projectDir });
  const html = await readFile(join(projectDir, 'dist', 'index.html'), 'utf8');
  const title = `<title>${escapeHtml(String(project.values.options.projectName))}</title>`;
  check(html.includes(title), `The built index.html does not contain ${title}`);
  steps.push('npm run build');
  return steps;
}

async function runPipProject(projectDir: string): Promise<string[]> {
  const steps: string[] = [];
  await run(python, ['-m', 'venv', '.venv'], { cwd: projectDir });
  const venvPython = isWindows
    ? join(projectDir, '.venv', 'Scripts', 'python.exe')
    : join(projectDir, '.venv', 'bin', 'python');
  steps.push('python -m venv .venv');
  await run(
    venvPython,
    ['-m', 'pip', 'install', '--disable-pip-version-check', '-q', '-r', 'requirements-dev.txt'],
    { cwd: projectDir },
  );
  steps.push('pip install -r requirements-dev.txt');
  const testOutput = await run(venvPython, ['-m', 'pytest', '-q', '-p', 'no:cacheprovider'], {
    cwd: projectDir,
  });
  const summary = /(\d+) passed/.exec(testOutput);
  steps.push(`python -m pytest (${summary ? `${summary[1]} passed` : 'passed'})`);

  if (existsSync(join(projectDir, 'app.py'))) {
    const port = await freePort();
    const app = start(
      venvPython,
      [
        '-m',
        'streamlit',
        'run',
        'app.py',
        '--server.headless',
        'true',
        '--server.port',
        String(port),
      ],
      {
        cwd: projectDir,
      },
    );
    try {
      await waitForHealth(`http://localhost:${port}/_stcore/health`, app, 90_000);
      steps.push('streamlit run app.py (health check answered)');
    } finally {
      app.kill();
    }
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface Result {
  template: string;
  variant: 'defaults' | 'customized';
  ok: boolean;
  details: string[];
  /** What passed, for the verification record. */
  steps: string[];
  failure?: string;
}

async function verify(
  manifest: ProjectManifest,
  variant: 'defaults' | 'customized',
): Promise<Result> {
  const details: string[] = [];
  const workDir = await mkdtemp(join(tmpdir(), `campuskit-${manifest.id}-${variant}-`));
  let ok = false;
  let failure: string | undefined;
  try {
    const { bundle, skipped } = await buildTemplateBundle(
      join(repoRoot, manifest.template.directory),
      {
        templateId: manifest.id,
        templateVersion: manifest.version,
      },
    );
    if (skipped.length > 0) {
      details.push(
        `skipped in the template folder: ${skipped.map((item) => item.path).join(', ')}`,
      );
    }
    const input =
      variant === 'defaults'
        ? {}
        : Object.fromEntries(
            manifest.customization.options.map((option) => [option.id, customizedValue(option)]),
          );
    const { project, zip } = await generateProjectZip({
      bundle,
      input,
      ...generationOptions(manifest, '2026-10-21'),
      date: GENERATED_ON,
    });
    details.push(
      `${project.rootFolder}.zip: ${project.files.length} files, ${(zip.length / 1024).toFixed(0)} KB, ${project.excluded.length} excluded`,
    );

    const extractDir = join(workDir, 'extracted');
    await extractZipArchive(zip, extractDir);
    await checkFiles(
      manifest,
      project,
      extractDir,
      bundle.files.map((file) => file.path),
    );
    details.push('files, customizations and exclusions checked');

    if (!filesOnly) {
      const projectDir = join(extractDir, project.rootFolder);
      const steps =
        manifest.template.packageManager === 'npm'
          ? await runNpmProject(projectDir, project)
          : await runPipProject(projectDir);
      details.push(...steps);
    }
    ok = true;
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    details.push(`FAILED: ${failure}`);
    if (!(error instanceof CheckError) && error instanceof Error && error.stack)
      details.push(error.stack);
  } finally {
    if (ok && !keep) await rm(workDir, { recursive: true, force: true });
    else details.push(`files kept in ${workDir}`);
  }
  const steps = details
    .filter((line) => !line.startsWith('FAILED: ') && !line.startsWith('files kept in '))
    .filter((line) => !line.includes('\n'))
    .map((line) => line.slice(0, 200));
  return { template: manifest.id, variant, ok, details, steps, failure };
}

// ---------------------------------------------------------------------------
// Verification records
// ---------------------------------------------------------------------------

/** Runs a `--version` style command and returns just the version number (tools may also print warnings). */
async function versionOf(command: string, commandArgs: string[]): Promise<string | undefined> {
  try {
    const output = await run(command, commandArgs, { cwd: repoRoot });
    return /\b\d+\.\d+(?:\.\d+)?\b/.exec(output)?.[0];
  } catch {
    return undefined;
  }
}

async function describeOs(): Promise<string> {
  if (process.platform === 'darwin') {
    const version = await versionOf('sw_vers', ['-productVersion']);
    return `macOS ${version ?? release()} (${arch()})`;
  }
  if (process.platform === 'linux') {
    try {
      const osRelease = await readFile('/etc/os-release', 'utf8');
      const name = /^PRETTY_NAME="?([^"\n]+)"?$/m.exec(osRelease)?.[1];
      if (name) return `${name} (${arch()})`;
    } catch {
      // fall through
    }
    return `Linux ${release()} (${arch()})`;
  }
  return `Windows ${release()} (${arch()})`;
}

async function recordResults(manifest: ProjectManifest, results: Result[]): Promise<void> {
  const platform = platformFromNode(process.platform);
  if (!platform) {
    console.log(`  (not recorded: ${process.platform} is not a supported platform)`);
    return;
  }
  const { bundle } = await buildTemplateBundle(join(repoRoot, manifest.template.directory), {
    templateId: manifest.id,
    templateVersion: manifest.version,
  });
  const pythonVersion =
    manifest.template.packageManager === 'pip' ? await versionOf(python, ['--version']) : undefined;
  const npmVersion =
    manifest.template.packageManager === 'npm' ? await versionOf('npm', ['--version']) : undefined;
  const now = new Date();
  const entry: VerificationEntry = {
    platform,
    verifiedOn: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    templateVersion: manifest.version,
    fingerprint: templateFingerprint(manifest, bundle.files),
    environment: {
      os: (await describeOs()).slice(0, 80),
      node: process.version.replace(/^v/, ''),
      ...(npmVersion ? { npm: npmVersion } : {}),
      ...(pythonVersion ? { python: pythonVersion } : {}),
    },
    runs: results.map((result) => ({
      variant: result.variant,
      passed: result.ok,
      steps: result.steps,
      ...(result.failure ? { failure: result.failure.slice(0, 2000) } : {}),
    })),
  };
  await writeVerificationEntry(verificationDir, manifest.id, entry);
  console.log(
    `  → recorded ${results.every((result) => result.ok) ? 'a passing' : 'a FAILED'} ${PLATFORM_LABELS[platform]} verification in packages/project-catalog/verification/${manifest.id}.json`,
  );
}

const unknown = requested.filter((id) => !catalog.some((manifest) => manifest.id === id));
if (unknown.length > 0) {
  console.error(
    `Unknown template id(s): ${unknown.join(', ')}. Known: ${catalog.map((manifest) => manifest.id).join(', ')}`,
  );
  process.exit(1);
}
if (record && filesOnly) {
  console.error('--record needs the full verification; it cannot be combined with --files-only.');
  process.exit(1);
}
const manifests = catalog.filter(
  (manifest) => requested.length === 0 || requested.includes(manifest.id),
);

if (!filesOnly && manifests.some((manifest) => manifest.template.packageManager === 'pip')) {
  try {
    await checkPythonVersion();
  } catch (error) {
    console.error(
      `\n${(error as Error).message}\nInstall Python 3.11+ or set CAMPUSKIT_PYTHON, or run with --files-only.\n`,
    );
    process.exit(1);
  }
}

const results: Result[] = [];
const recordFailures: string[] = [];
for (const manifest of manifests) {
  const templateResults: Result[] = [];
  for (const variant of ['defaults', 'customized'] as const) {
    process.stdout.write(`\n${manifest.id} (${variant})\n`);
    const result = await verify(manifest, variant);
    for (const line of result.details) console.log(`  ${result.ok ? '✓' : '•'} ${line}`);
    templateResults.push(result);
  }
  results.push(...templateResults);
  if (record) {
    try {
      await recordResults(manifest, templateResults);
    } catch (error) {
      recordFailures.push(manifest.id);
      console.error(`  ✗ could not record the result: ${(error as Error).message}`);
    }
  }
}

const failed = results.filter((result) => !result.ok);
if (recordFailures.length > 0) {
  console.error(`\nCould not write verification records for: ${recordFailures.join(', ')}`);
  process.exitCode = 1;
}
console.log(
  `\n${results.length - failed.length} of ${results.length} generated projects verified${filesOnly ? ' (files only)' : ''}.`,
);
if (failed.length > 0) {
  console.error(
    `Failed: ${failed.map((result) => `${result.template} (${result.variant})`).join(', ')}\n`,
  );
  process.exit(1);
}
