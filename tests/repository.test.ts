/**
 * Runs the repository hygiene checks (scripts/check-repo.ts) as part of
 * `pnpm test`, so a broken documentation link, a committed secret or a
 * documented command that doesn't exist fails the test suite.
 */
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { checkRepository } from '../scripts/check-repo.ts';

describe('repository', () => {
  it('has no secrets, generated files, broken links or undocumented commands', async () => {
    const repoRoot = fileURLToPath(new URL('..', import.meta.url));
    expect(await checkRepository(repoRoot)).toEqual([]);
  });
});
