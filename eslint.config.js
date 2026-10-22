// @ts-check
/**
 * One ESLint configuration for the whole repository.
 *
 * - Platform code (web app, packages, scripts, tests) is linted with
 *   type information from its tsconfig files.
 * - Template code is linted without type information, because each template
 *   is a standalone project with its own dependencies.
 * - Every React file is checked for accessibility (jsx-a11y) and the rules of
 *   hooks, including the React Compiler rules shipped with react-hooks v7.
 */
import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const platformFiles = [
  'apps/**/*.{ts,tsx}',
  'packages/**/*.ts',
  'scripts/**/*.ts',
  'tests/**/*.ts',
  '*.ts',
];
const templateFiles = ['templates/**/*.{ts,tsx}'];

export default defineConfig(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/coverage/',
      '**/playwright-report/',
      '**/test-results/',
      '**/.venv/',
      '**/.scratch/',
    ],
  },
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  js.configs.recommended,
  {
    files: platformFiles,
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './apps/web/tsconfig.node.json', './packages/*/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Command-line scripts report progress on stdout.
    files: ['scripts/**/*.ts', 'packages/*/scripts/**/*.ts', 'apps/web/vite-plugins/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: templateFiles,
    extends: [tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['**/*.tsx'],
    extends: [jsxA11y.flatConfigs.recommended, reactHooks.configs.flat['recommended-latest']],
    rules: {
      // Template cards wrap their text in nested spans; look deep enough to find it.
      'jsx-a11y/label-has-associated-control': ['error', { depth: 4 }],
      // Scrollable regions and code blocks must be focusable so keyboard users can scroll them.
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        { tags: ['pre'], roles: ['tabpanel', 'region'], allowExpressionValues: true },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: { globals: globals.node },
  },
);
