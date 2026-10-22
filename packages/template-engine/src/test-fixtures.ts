/** Shared fixtures for the engine's unit tests (not exported from the package). */
import type { SetupGuide } from './instructions.ts';
import type { ResolvedValues } from './options.ts';
import type { BundleFile, CustomizationSpec, TemplateBundle } from './spec.ts';

export function textFile(path: string, content: string): BundleFile {
  return { path, encoding: 'utf8', content, size: new TextEncoder().encode(content).length };
}

export const sampleSpec: CustomizationSpec = {
  options: [
    {
      id: 'projectName',
      label: 'Project name',
      group: 'identity',
      type: 'text',
      required: true,
      default: 'Demo Planner',
      minLength: 3,
      maxLength: 60,
    },
    {
      id: 'institutionName',
      label: 'Institution',
      group: 'identity',
      type: 'text',
      required: false,
      default: '',
      minLength: 2,
      maxLength: 80,
    },
    {
      id: 'theme',
      label: 'Accent colour',
      group: 'appearance',
      type: 'select',
      default: 'violet',
      choices: [
        { value: 'violet', label: 'Violet', swatch: '#6D28D9' },
        { value: 'teal', label: 'Teal', swatch: '#0F766E' },
      ],
    },
    {
      id: 'passMark',
      label: 'Pass mark',
      group: 'behaviour',
      type: 'number',
      default: 40,
      min: 0,
      max: 100,
      step: 1,
      integer: true,
    },
    { id: 'demoData', label: 'Include demo data', group: 'data', type: 'boolean', default: true },
  ],
  edits: [
    {
      kind: 'json-set',
      label: 'package name',
      file: 'package.json',
      pointer: '/name',
      value: { option: 'projectSlug' },
    },
    {
      kind: 'json-set',
      label: 'app name',
      file: 'src/config.json',
      pointer: '/appName',
      value: { option: 'projectName' },
    },
    {
      kind: 'json-set',
      label: 'institution',
      file: 'src/config.json',
      pointer: '/institution',
      value: { option: 'institutionName' },
    },
    {
      kind: 'json-set',
      label: 'theme',
      file: 'src/config.json',
      pointer: '/theme',
      value: { option: 'theme' },
    },
    {
      kind: 'json-set',
      label: 'pass mark',
      file: 'src/config.json',
      pointer: '/passMark',
      value: { option: 'passMark' },
    },
    {
      kind: 'json-set',
      label: 'demo data',
      file: 'src/config.json',
      pointer: '/demoData',
      value: { option: 'demoData' },
    },
    {
      kind: 'replace',
      label: 'page title',
      file: 'index.html',
      find: 'Demo Planner',
      escape: 'html',
      expectedCount: 1,
      value: { option: 'projectName' },
    },
    {
      kind: 'replace',
      label: 'README title',
      file: 'README.md',
      find: 'Demo Planner',
      escape: 'markdown',
      expectedCount: 2,
      value: { option: 'projectName' },
    },
    {
      kind: 'replace',
      label: 'README institution',
      file: 'README.md',
      find: 'Example School',
      escape: 'markdown',
      expectedCount: 1,
      value: { option: 'institutionName', whenEmpty: 'your institution' },
    },
    {
      kind: 'replace',
      label: 'Streamlit colour',
      file: '.streamlit/config.toml',
      find: '#6D28D9',
      escape: 'none',
      expectedCount: 1,
      value: { option: 'theme', map: { violet: '#6D28D9', teal: '#0F766E' } },
    },
  ],
};

export function sampleBundle(extraFiles: BundleFile[] = []): TemplateBundle {
  return {
    schemaVersion: 1,
    templateId: 'demo-planner',
    templateVersion: '1.0.0',
    files: [
      textFile(
        'package.json',
        `${JSON.stringify({ name: 'demo-planner', private: true, version: '1.0.0' }, null, 2)}\n`,
      ),
      textFile(
        'src/config.json',
        `${JSON.stringify(
          {
            appName: 'Demo Planner',
            institution: 'Example School',
            theme: 'violet',
            passMark: 40,
            demoData: true,
          },
          null,
          2,
        )}\n`,
      ),
      textFile('index.html', '<!doctype html>\n<title>Demo Planner</title>\n'),
      textFile('README.md', '# Demo Planner\n\nDemo Planner is set up for Example School.\n'),
      textFile('.streamlit/config.toml', '[theme]\nprimaryColor = "#6D28D9"\n'),
      textFile('.gitignore', 'node_modules/\n.env\n'),
      textFile('.env.example', 'EXAMPLE_SETTING=1\n'),
      { path: 'docs/logo.png', encoding: 'base64', content: 'iVBORw0KGgo=', size: 8 },
      ...extraFiles,
    ],
  };
}

export function sampleGuide(values: ResolvedValues): SetupGuide {
  return {
    projectName: String(values.options.projectName),
    folderName: values.projectSlug,
    templateId: 'demo-planner',
    templateName: 'Demo Planner',
    templateVersion: '1.0.0',
    generatedOn: '2026-10-21',
    prerequisites: [{ name: 'Node.js', version: '22.12+', url: 'https://nodejs.org/' }],
    steps: [
      {
        title: 'Install dependencies',
        commands: [
          { command: `cd ${values.projectSlug}`, platform: 'all' },
          { command: 'npm install', platform: 'all' },
        ],
      },
      { title: 'Start the app', commands: [{ command: 'npm run dev', platform: 'all' }] },
    ],
    notes: ['Data is stored in your browser only.'],
    choices: [{ label: 'Project name', value: String(values.options.projectName) }],
  };
}
