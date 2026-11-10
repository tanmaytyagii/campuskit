/**
 * `pnpm demo:fixtures:students`
 *
 * The Demo Studio simulates the Student Management System (a Flask app) in the browser. This
 * script runs the template's real Python code (scripts/python/sms_parity.py) on recorded
 * cases and saves the results; the website's tests check the simulation against them. Run it
 * after changing validation.py, repository.py, db.py or schema.sql in the template.
 *
 * Python comes from CAMPUSKIT_PYTHON (default: python on Windows, python3 elsewhere), with the
 * template's requirements.txt (Flask) installed.
 */
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format, resolveConfig } from 'prettier';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const python =
  process.env.CAMPUSKIT_PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const target = join(repoRoot, 'apps/web/src/features/demo/demos/students/sms.fixture.json');

const result = spawnSync(
  python,
  [
    join(repoRoot, 'scripts/python/sms_parity.py'),
    join(repoRoot, 'templates/student-management-system'),
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
    `Could not run the template's code with ${python}: ${result.error?.message ?? result.stderr}\n` +
      'Install its requirements (pip install -r templates/student-management-system/requirements.txt) ' +
      'or set CAMPUSKIT_PYTHON to a Python that has them.',
  );
  process.exit(1);
}
JSON.parse(result.stdout); // stops here if the output isn't JSON
const options = await resolveConfig(target);
await writeFile(target, await format(result.stdout, { ...options, filepath: target }));
console.log(`Wrote ${target.slice(repoRoot.length + 1)}`);
