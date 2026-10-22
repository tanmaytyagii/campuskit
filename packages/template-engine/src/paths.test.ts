import { describe, expect, it } from 'vitest';

import {
  assertSafeRelativePath,
  getExclusionReason,
  isExcludedPath,
  isSafeRelativePath,
  UnsafePathError,
} from './paths.ts';

describe('assertSafeRelativePath', () => {
  it.each([
    'README.md',
    'src/App.tsx',
    '.gitignore',
    '.streamlit/config.toml',
    'docs/screenshots/dashboard.png',
    'data/sample_results.csv',
    'package-lock.json',
  ])('accepts ordinary template path %s', (path) => {
    expect(() => assertSafeRelativePath(path)).not.toThrow();
  });

  it.each([
    ['../escape.txt', 'parent directory'],
    ['src/../../escape.txt', 'nested parent directory'],
    ['./README.md', 'current directory segment'],
    ['/etc/passwd', 'absolute POSIX path'],
    ['C:/Windows/system.ini', 'drive letter'],
    ['c:evil.txt', 'drive-relative path'],
    ['src\\..\\evil.txt', 'backslash separators'],
    ['src//App.tsx', 'empty segment'],
    ['src/', 'trailing slash'],
    ['', 'empty path'],
    ['src/con.txt', 'Windows device name'],
    ['AUX', 'Windows device name without extension'],
    ['notes.', 'trailing dot'],
    ['ünïcode.txt', 'non-ASCII name'],
    ['src/evil\u0000.txt', 'NUL byte'],
    ['what?.txt', 'reserved punctuation'],
    ['a'.repeat(201), 'overlong path'],
  ])('rejects %s (%s)', (path) => {
    expect(() => assertSafeRelativePath(path)).toThrow(UnsafePathError);
    expect(isSafeRelativePath(path)).toBe(false);
  });

  it('explains why a path was rejected', () => {
    expect(() => assertSafeRelativePath('../x')).toThrow(
      /"\." and "\.\." segments are not allowed/,
    );
  });
});

describe('exclusion policy', () => {
  it.each([
    'node_modules/react/index.js',
    'dist/index.html',
    'build/output.js',
    'coverage/lcov.info',
    '.git/config',
    '.venv/bin/python',
    'src/__pycache__/app.cpython-313.pyc',
    '.env',
    '.env.local',
    '.env.production',
    '.streamlit/secrets.toml',
    '.npmrc',
    'certs/server.pem',
    'keys/deploy.key',
    'id_ed25519',
    'data/students.sqlite',
    'debug.log',
    'tsconfig.tsbuildinfo',
    '.DS_Store',
    '.vscode/settings.json',
  ])('excludes %s', (path) => {
    expect(isExcludedPath(path)).toBe(true);
    expect(getExclusionReason(path)).toMatch(/excluded/);
  });

  it.each([
    '.gitignore',
    '.env.example',
    '.env.sample',
    '.streamlit/config.toml',
    '.editorconfig',
    'src/build-info.ts',
  ])('keeps %s', (path) => {
    expect(isExcludedPath(path)).toBe(false);
  });
});
