/**
 * `pnpm demo:fixtures`
 *
 * The Demo Studio's result analyzer is a TypeScript port of the template's
 * Python code. This script runs the real Python code (the template's
 * `analyzer` package, which needs pandas) on the sample files and a set of
 * edge cases, and saves the results; the website's tests compare the port
 * with them. Run it after changing anything in
 * templates/student-result-analyzer/analyzer/ or its sample data.
 *
 * Python comes from CAMPUSKIT_PYTHON (default: python on Windows, python3
 * elsewhere); install the template's requirements into it first.
 */
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format, resolveConfig } from 'prettier';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const python =
  process.env.CAMPUSKIT_PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const target = join(repoRoot, 'apps/web/src/features/demo/demos/results/analyzer.fixture.json');

const result = spawnSync(
  python,
  [
    join(repoRoot, 'scripts/python/analyzer_parity.py'),
    join(repoRoot, 'templates/student-result-analyzer'),
  ],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    // Don't leave a __pycache__ folder inside the template.
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONIOENCODING: 'utf-8' },
    maxBuffer: 20 * 1024 * 1024,
  },
);
if (result.error || result.status !== 0) {
  console.error(
    `Could not run the analyzer with ${python}: ${result.error?.message ?? result.stderr}\n` +
      'Install the template’s requirements (pip install -r templates/student-result-analyzer/requirements.txt) ' +
      'or set CAMPUSKIT_PYTHON to a Python that has them.',
  );
  process.exit(1);
}
// Python's own JSON text is formatted rather than parsed and written again: JSON.stringify
// would turn the -0.0 that pandas produces for a score of "-0" into 0.
JSON.parse(result.stdout); // stops here if the output isn't JSON
// Formatted with the repository's Prettier settings, so `pnpm format:check` accepts the file.
const options = await resolveConfig(target);
await writeFile(target, await format(result.stdout, { ...options, filepath: target }));
console.log(`Wrote ${target.slice(repoRoot.length + 1)}`);
