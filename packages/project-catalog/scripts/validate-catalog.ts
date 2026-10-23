/**
 * `pnpm validate:catalog` — checks every manifest against the files on disk.
 * Exits with code 1 when any problem is found, so CI fails loudly.
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REGISTERED_MANIFESTS } from '../src/registry.ts';
import { validateCatalog } from '../src/node/validate.ts';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageDir, '..', '..');

const report = await validateCatalog({
  repoRoot,
  manifestsDir: join(packageDir, 'manifests'),
  registeredFiles: REGISTERED_MANIFESTS.map((entry) => entry.file),
});

if (report.issues.length > 0) {
  console.error(`\nCatalog validation failed with ${report.issues.length} problem(s):\n`);
  for (const issue of report.issues)
    console.error(`  ✗ ${issue.manifest} › ${issue.path}: ${issue.message}`);
  console.error('');
  process.exit(1);
}

console.log(`\nCatalog OK: ${report.manifests.length} projects validated.`);
for (const manifest of report.manifests) {
  console.log(
    `  ✓ ${manifest.id} (${report.fileCounts[manifest.id] ?? 0} template files, ${manifest.customization.edits.length} edits): ${report.statuses[manifest.id]?.label ?? 'unknown status'}`,
  );
}
if (report.warnings.length > 0) {
  console.log(`\n${report.warnings.length} warning(s):\n`);
  for (const warning of report.warnings)
    console.log(`  ! ${warning.manifest} › ${warning.path}: ${warning.message}`);
}
console.log('');
