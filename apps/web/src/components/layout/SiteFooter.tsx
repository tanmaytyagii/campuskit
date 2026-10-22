import { Link } from 'react-router';

import { siteConfig } from '../../site.config.ts';
import { Wordmark } from './Wordmark.tsx';

const COLUMNS = [
  {
    title: 'Use CampusKit',
    links: [
      { to: '/projects', label: 'Project gallery' },
      { to: '/generate', label: 'Project generator' },
      { to: '/learn', label: 'Learning center' },
      { to: '/docs/prepare-for-your-viva', label: 'Viva preparation' },
    ],
  },
  {
    title: 'Documentation',
    links: [
      { to: '/docs', label: 'All documentation' },
      { to: '/docs/contributing', label: 'Contributing' },
      { to: '/docs/adding-a-template', label: 'Adding a template' },
      { to: '/docs/security', label: 'Security policy' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/docs/license', label: 'MIT License' },
      { to: '/docs/third-party-notices', label: 'Third-party notices' },
      { to: '/docs/code-of-conduct', label: 'Code of conduct' },
      { to: '/docs/using-templates-honestly', label: 'Using templates honestly' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-xs text-sm text-ink-3">
            {siteConfig.tagline} Free, open-source project templates for school and college
            students.
          </p>
          {siteConfig.repositoryUrl ? (
            <a
              className="link text-sm"
              href={siteConfig.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Source code repository
            </a>
          ) : null}
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-bold text-ink">{column.title}</h2>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-ink-2 hover:text-violet hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-xs text-ink-3">
          CampusKit and its templates are released under the MIT License. Templates are starting
          points: follow your institution’s rules and make sure you can explain everything you
          submit.
        </p>
      </div>
    </footer>
  );
}
