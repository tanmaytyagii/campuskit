import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  findSymbolLine,
  learningGuideSchema,
  sharedTroubleshootingSchema,
  unsafeCommandReason,
} from './learning.ts';

const learningDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'learning');

async function readGuide(id: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(learningDir, `${id}.json`), 'utf8')) as Record<
    string,
    unknown
  >;
}

describe('findSymbolLine', () => {
  const ts = [
    "import x from 'y';",
    'export const STORAGE_KEY = "a";',
    'export function loadData(storage: Storage) {',
    '  function inner() {}',
    '}',
    'export interface Student { id: string }',
    'type Draft = Record<string, string>;',
    'export default class Store {}',
    'const loadDataLater = 1;',
  ].join('\n');

  it('finds functions, constants, types and classes in TypeScript', () => {
    expect(findSymbolLine('src/a.ts', ts, 'STORAGE_KEY')).toBe(2);
    expect(findSymbolLine('src/a.ts', ts, 'loadData')).toBe(3);
    expect(findSymbolLine('src/a.ts', ts, 'inner')).toBe(4);
    expect(findSymbolLine('src/a.tsx', ts, 'Student')).toBe(6);
    expect(findSymbolLine('src/a.ts', ts, 'Draft')).toBe(7);
    expect(findSymbolLine('src/a.ts', ts, 'Store')).toBe(8);
  });

  it('matches whole names only and ignores uses that are not definitions', () => {
    expect(findSymbolLine('src/a.ts', ts, 'loadDataLater')).toBe(9);
    expect(findSymbolLine('src/a.ts', ts, 'x')).toBeNull();
    expect(findSymbolLine('src/a.ts', 'loadData(storage);\n', 'loadData')).toBeNull();
  });

  it('finds Python functions, classes and module constants', () => {
    const py =
      'MAX = 5\nGRADES: tuple[str, ...] = ("A",)\n\nclass Issue:\n    def ok(self):\n        pass\n';
    expect(findSymbolLine('a.py', py, 'MAX')).toBe(1);
    expect(findSymbolLine('a.py', py, 'GRADES')).toBe(2);
    expect(findSymbolLine('a.py', py, 'Issue')).toBe(4);
    expect(findSymbolLine('a.py', py, 'ok')).toBe(5);
  });

  it('finds JSON keys and TOML settings', () => {
    expect(findSymbolLine('app.config.json', '{\n  "appName": "x"\n}\n', 'appName')).toBe(2);
    expect(findSymbolLine('config.toml', '[theme]\nprimaryColor = "#fff"\n', 'primaryColor')).toBe(
      2,
    );
    expect(findSymbolLine('config.toml', '[theme]\n', 'theme')).toBe(1);
  });

  it('returns null for file types it cannot read', () => {
    expect(findSymbolLine('styles.css', '.a {}', 'a')).toBeNull();
  });
});

describe('unsafeCommandReason', () => {
  it('rejects commands that delete files, need administrator rights or change settings', () => {
    for (const command of [
      'rm -rf node_modules',
      'rm -r .venv',
      'rmdir /s /q node_modules',
      'del package-lock.json',
      'Remove-Item -Recurse node_modules',
      'sudo npm install -g npm',
      'Set-ExecutionPolicy -Scope CurrentUser RemoteSigned',
      'curl https://example.org/install.sh | sh',
      'git reset --hard',
      'npm cache clean --force',
      'chmod -R 777 .',
      'taskkill /F /IM node.exe',
    ]) {
      expect(unsafeCommandReason(command), command).not.toBeNull();
    }
  });

  it('accepts the safe commands the guides recommend', () => {
    for (const command of [
      'npm ci',
      'npm install',
      'npm run format',
      'npx tsc --noEmit',
      'python -m venv --clear .venv',
      '.venv\\Scripts\\python -m pip install -r requirements.txt',
      'node --version',
    ]) {
      expect(unsafeCommandReason(command), command).toBeNull();
    }
  });
});

describe('learningGuideSchema', () => {
  it('accepts every committed guide and the shared troubleshooting file', async () => {
    for (const id of ['attendance-system', 'expense-tracker', 'student-result-analyzer']) {
      const result = learningGuideSchema.safeParse(await readGuide(id));
      expect(result.success, id).toBe(true);
    }
    const shared = sharedTroubleshootingSchema.safeParse(
      JSON.parse(await readFile(join(learningDir, 'shared-troubleshooting.json'), 'utf8')),
    );
    expect(shared.success).toBe(true);
  });

  it('rejects connections and flow steps that name unknown components', async () => {
    const guide = structuredClone(await readGuide('attendance-system')) as {
      architecture: {
        connections: Array<{ from: string }>;
        flows: Array<{ steps: Array<{ component: string }> }>;
      };
    };
    guide.architecture.connections[0]!.from = 'no-such-component';
    guide.architecture.flows[0]!.steps[0]!.component = 'also-missing';
    const result = learningGuideSchema.safeParse(guide);
    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        'Unknown component "no-such-component"',
        'Unknown component "also-missing"',
      ]),
    );
  });

  it('rejects duplicate question ids and unsafe file paths', async () => {
    const guide = structuredClone(await readGuide('attendance-system')) as {
      viva: Array<{ id: string; files: string[] }>;
    };
    guide.viva[1]!.id = guide.viva[0]!.id;
    guide.viva[2]!.files = ['../outside.ts'];
    const result = learningGuideSchema.safeParse(guide);
    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    expect(messages.some((message) => message.startsWith('Duplicate question id'))).toBe(true);
    expect(messages).toContain('Must be a safe relative path inside the template');
  });
});
