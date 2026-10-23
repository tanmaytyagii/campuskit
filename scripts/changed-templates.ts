/**
 * `pnpm changed-templates [base-ref]` prints the ids of the templates that
 * changed since `base-ref` (default: origin/main), or "all" when the change
 * can affect every generated project. CI uses it to verify only the changed
 * templates on pull requests; pushes to main always verify everything.
 *
 * With GITHUB_OUTPUT set, it also writes `templates` (space-separated ids,
 * empty for all) and `run` (true or false) for later workflow steps.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

import { catalog } from '@campuskit/project-catalog';

import { templatesForChanges } from './lib/changed-templates.ts';

const base = process.argv[2] ?? 'origin/main';
const output = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' });
const changed = output.split('\n').filter(Boolean);
const result = templatesForChanges(
  changed,
  catalog.map((manifest) => manifest.id),
);

const templates = result.kind === 'all' ? '' : result.ids.join(' ');
const run = result.kind === 'all' || result.ids.length > 0;
console.log(result.kind === 'all' ? 'all' : result.ids.join('\n') || '(no templates changed)');

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `templates=${templates}\nrun=${String(run)}\n`);
}
