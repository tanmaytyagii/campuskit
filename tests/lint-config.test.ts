/**
 * eslint-plugin-jsx-a11y does not yet list ESLint 10 as a supported peer, so
 * pnpm-workspace.yaml allows it explicitly. This test proves the plugin (and
 * the React hooks rules) still report problems under our configuration, so a
 * silent break would fail CI instead of quietly disabling the checks.
 */
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: new URL('..', import.meta.url).pathname });

// Template files are linted without type information, so a virtual file there needs no tsconfig.
const FILE = 'templates/attendance-system/src/lint-probe.tsx';

async function ruleIds(code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: FILE });
  return (result?.messages ?? []).map((message) => message.ruleId ?? message.message).sort();
}

describe('lint configuration', () => {
  it('reports accessibility problems in JSX', async () => {
    const ids = await ruleIds(
      'export function Probe() {\n  return <div onClick={() => undefined}><img src="cat.png" /></div>;\n}\n',
    );
    expect(ids).toEqual(
      expect.arrayContaining([
        'jsx-a11y/alt-text',
        'jsx-a11y/click-events-have-key-events',
        'jsx-a11y/no-static-element-interactions',
      ]),
    );
  });

  it('reports hooks that break the rules of hooks', async () => {
    const ids = await ruleIds(
      "import { useState } from 'react';\nexport function Probe({ show }: { show: boolean }) {\n  if (show) {\n    const [value] = useState(0);\n    return <p>{value}</p>;\n  }\n  return null;\n}\n",
    );
    expect(ids).toContain('react-hooks/rules-of-hooks');
  });

  it('accepts accessible, well-formed components', async () => {
    const ids = await ruleIds(
      'import { useState } from \'react\';\nexport function Probe() {\n  const [count, setCount] = useState(0);\n  return (\n    <button type="button" onClick={() => setCount(count + 1)}>\n      Clicked {count} times\n    </button>\n  );\n}\n',
    );
    expect(ids).toEqual([]);
  });
});
