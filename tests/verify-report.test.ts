import { describe, expect, it } from 'vitest';

import {
  codeBlock,
  errorAnnotation,
  escapeData,
  escapeProperty,
  jobSummary,
  type VerifyResult,
} from '../scripts/lib/verify-report.ts';

describe('GitHub Actions reporting for pnpm verify:generated', () => {
  it('escapes workflow command messages and properties the way GitHub reads them', () => {
    // % first, or the escapes themselves would be escaped again.
    expect(escapeData('100%\r\nnext')).toBe('100%25%0D%0Anext');
    expect(escapeProperty('attendance-system (defaults): failed, again')).toBe(
      'attendance-system (defaults)%3A failed%2C again',
    );
  });

  it('writes one error annotation per failure, cut to a readable length', () => {
    const line = errorAnnotation(
      'expense-tracker (customized) failed on win32',
      'npm test\nexited 1',
    );
    expect(line).toBe(
      '::error title=expense-tracker (customized) failed on win32::npm test%0Aexited 1',
    );
    expect(line.split('\n')).toHaveLength(1);
    expect(errorAnnotation('t', 'x'.repeat(5000), 4000)).toHaveLength(
      '::error title=t::'.length + 4000,
    );
  });

  it('fences failure output so backticks in it cannot end the block early', () => {
    expect(codeBlock('plain')).toBe('```text\nplain\n```');
    expect(codeBlock('a ``` b')).toBe('````text\na ``` b\n````');
  });

  it('summarises every result and shows the output of each failure', () => {
    const results: VerifyResult[] = [
      {
        template: 'attendance-system',
        variant: 'defaults',
        ok: true,
        steps: ['npm ci', 'npm test (34 passed)'],
      },
      {
        template: 'student-result-analyzer',
        variant: 'customized',
        ok: false,
        steps: ['a | b'],
        failure: '"python -m pytest" exited with code 1:\nE   AssertionError',
      },
    ];
    const summary = jobSummary(results, 'win32', 'v24.12.0');
    expect(summary).toContain('## Generated projects on win32 (Node v24.12.0)');
    expect(summary).toContain(
      '| attendance-system | defaults | passed | npm ci; npm test (34 passed) |',
    );
    expect(summary).toContain('| student-result-analyzer | customized | **failed** | a \\| b |');
    expect(summary).toContain(
      '### student-result-analyzer (customized)\n\n```text\n"python -m pytest" exited with code 1:\nE   AssertionError\n```',
    );
    expect(summary).not.toContain('### attendance-system');
  });
});
