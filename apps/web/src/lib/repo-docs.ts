/**
 * Repository documents shown on the website (/docs/...). They are the same
 * Markdown files contributors read in the repository, imported at build time.
 */

const loaders = import.meta.glob<string>(
  ['../../../../*.md', '../../../../LICENSE', '../../../../docs/**/*.md'],
  {
    query: '?raw',
    import: 'default',
  },
);

export type DocGroup = 'guides' | 'contributing' | 'policies';

export interface RepoDoc {
  slug: string;
  title: string;
  description: string;
  /** Path relative to the repository root. */
  path: string;
  group: DocGroup;
}

export const DOC_GROUP_LABELS: Record<DocGroup, string> = {
  guides: 'Guides for students',
  contributing: 'Contributing to CampusKit',
  policies: 'Policies and licences',
};

export const REPO_DOCS: readonly RepoDoc[] = [
  {
    slug: 'run-a-react-project',
    title: 'Run a React project',
    description:
      'Install Node.js, run npm install and npm run dev, and fix the most common errors.',
    path: 'docs/guides/run-a-react-project.md',
    group: 'guides',
  },
  {
    slug: 'run-a-python-project',
    title: 'Run a Python project',
    description: 'Install Python, create a virtual environment and start a Streamlit app.',
    path: 'docs/guides/run-a-python-project.md',
    group: 'guides',
  },
  {
    slug: 'prepare-for-your-viva',
    title: 'Prepare for your viva',
    description:
      'How to understand, demonstrate and explain a project you started from a template.',
    path: 'docs/guides/prepare-for-your-viva.md',
    group: 'guides',
  },
  {
    slug: 'using-templates-honestly',
    title: 'Using templates honestly',
    description: 'What to disclose, what to change and how to keep your work your own.',
    path: 'docs/guides/using-templates-honestly.md',
    group: 'guides',
  },
  {
    slug: 'contributing',
    title: 'Contributing',
    description: 'Set up the repository, run the checks and open a pull request.',
    path: 'CONTRIBUTING.md',
    group: 'contributing',
  },
  {
    slug: 'adding-a-template',
    title: 'Adding a template',
    description: 'Write a manifest, declare customization edits and pass validation.',
    path: 'docs/adding-a-template.md',
    group: 'contributing',
  },
  {
    slug: 'new-project-checklist',
    title: 'New project checklist',
    description: 'Everything a template needs before it can be published.',
    path: 'docs/new-project-checklist.md',
    group: 'contributing',
  },
  {
    slug: 'architecture',
    title: 'Architecture',
    description: 'How the web app, the catalog and the template engine fit together.',
    path: 'docs/architecture.md',
    group: 'contributing',
  },
  {
    slug: 'design-system',
    title: 'Design system',
    description: 'Colours, type, spacing, motion and the components the website is built from.',
    path: 'docs/design-system.md',
    group: 'contributing',
  },
  {
    slug: 'template-engine',
    title: 'Template engine',
    description: 'Options, edits, escaping, exclusion rules and ZIP safety in detail.',
    path: 'docs/template-engine.md',
    group: 'contributing',
  },
  {
    slug: 'deployment',
    title: 'Deployment',
    description: 'Publish the static site on GitHub Pages, Netlify or any static host.',
    path: 'docs/deployment.md',
    group: 'contributing',
  },
  {
    slug: 'security',
    title: 'Security policy',
    description: 'How to report a vulnerability and what CampusKit protects against.',
    path: 'SECURITY.md',
    group: 'policies',
  },
  {
    slug: 'code-of-conduct',
    title: 'Code of conduct',
    description: 'How we expect everyone in the community to behave.',
    path: 'CODE_OF_CONDUCT.md',
    group: 'policies',
  },
  {
    slug: 'license',
    title: 'MIT License',
    description: 'The licence for CampusKit and every template it publishes.',
    path: 'LICENSE',
    group: 'policies',
  },
  {
    slug: 'third-party-notices',
    title: 'Third-party notices',
    description: 'Fonts, icons and libraries used by CampusKit and their licences.',
    path: 'THIRD_PARTY_NOTICES.md',
    group: 'policies',
  },
];

export function getRepoDoc(slug: string): RepoDoc | undefined {
  return REPO_DOCS.find((doc) => doc.slug === slug);
}

export function findRepoDocByPath(path: string): RepoDoc | undefined {
  return REPO_DOCS.find((doc) => doc.path === path);
}

export function loadRepoDoc(doc: RepoDoc): Promise<string> {
  const loader = loaders[`../../../../${doc.path}`];
  if (!loader) return Promise.reject(new Error(`${doc.path} is not included in this build`));
  return loader();
}

/** True when every registered document exists in the build (checked by tests). */
export function missingRepoDocs(): string[] {
  return REPO_DOCS.filter((doc) => !loaders[`../../../../${doc.path}`]).map((doc) => doc.path);
}
