/**
 * Screenshots and Markdown documents that live inside the template folders.
 * Vite bundles them at build time, so the website always shows the files
 * that ship in the generated projects.
 */

const screenshotUrls = import.meta.glob<string>(
  '../../../../templates/*/docs/screenshots/*.{png,jpg,jpeg,webp}',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
);

const templateDocLoaders = import.meta.glob<string>(
  ['../../../../templates/*/README.md', '../../../../templates/*/docs/*.md'],
  {
    query: '?raw',
    import: 'default',
  },
);

const PREFIX = '../../../../';

/** URL of an image inside a template, e.g. ("templates/x", "docs/screenshots/a.png"). */
export function templateAssetUrl(templateDirectory: string, file: string): string | undefined {
  return screenshotUrls[`${PREFIX}${templateDirectory}/${file}`];
}

/** Loads a Markdown file from a template, or returns null if it is not bundled. */
export function loadTemplateDoc(templateDirectory: string, file: string): Promise<string> | null {
  const loader = templateDocLoaders[`${PREFIX}${templateDirectory}/${file}`];
  return loader ? loader() : null;
}
