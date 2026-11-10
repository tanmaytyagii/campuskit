import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

import type { MessageKey } from '../../i18n/en.ts';
import { useLocale, useT } from '../../lib/i18n.ts';
import { siteConfig } from '../../site.config.ts';
import { Wordmark } from './Wordmark.tsx';

const COLUMNS: Array<{ title: MessageKey; links: Array<{ to: string; label: MessageKey }> }> = [
  {
    title: 'footer.use',
    links: [
      { to: '/projects', label: 'footer.gallery' },
      { to: '/demos', label: 'footer.demos' },
      { to: '/generate', label: 'footer.generator' },
      { to: '/compare', label: 'footer.compare' },
      { to: '/dashboard', label: 'footer.dashboard' },
      { to: '/learn', label: 'footer.learn' },
      { to: '/my-projects', label: 'footer.myProjects' },
      { to: '/viva', label: 'footer.viva' },
      { to: '/learn/report', label: 'footer.submission' },
      { to: '/docs/prepare-for-your-viva', label: 'footer.vivaGuide' },
    ],
  },
  {
    title: 'footer.documentation',
    links: [
      { to: '/settings', label: 'footer.settings' },
      { to: '/assistant', label: 'footer.assistant' },
      { to: '/docs', label: 'footer.allDocs' },
      { to: '/docs/contributing', label: 'footer.contributing' },
      { to: '/docs/adding-a-template', label: 'footer.addingTemplate' },
      { to: '/docs/security', label: 'footer.security' },
    ],
  },
  {
    title: 'footer.legal',
    links: [
      { to: '/docs/license', label: 'footer.license' },
      { to: '/docs/third-party-notices', label: 'footer.notices' },
      { to: '/docs/code-of-conduct', label: 'footer.conduct' },
      { to: '/docs/using-templates-honestly', label: 'footer.honest' },
    ],
  },
];

export function SiteFooter() {
  const t = useT();
  const locale = useLocale();
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="col-span-2 space-y-3 md:col-span-1">
          <Wordmark />
          <p className="max-w-xs text-sm text-ink-3">
            {locale === 'en' ? `${siteConfig.tagline} ` : null}
            {t('footer.tagline')}
          </p>
          {siteConfig.repositoryUrl ? (
            <a
              className="link inline-flex items-center gap-1 text-sm"
              href={siteConfig.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('footer.repository')}
              <ExternalLink aria-hidden="true" className="size-3.5" />
              <span className="sr-only">{t('footer.newTab')}</span>
            </a>
          ) : null}
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={t(column.title)}>
            <h2 className="type-eyebrow text-ink">{t(column.title)}</h2>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-ink-2 underline-offset-4 transition-colors hover:text-violet hover:underline"
                  >
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-xs text-ink-3">
          {t('footer.note')}
          {locale === 'en' ? null : ` ${t('english.only')}`}
        </p>
      </div>
    </footer>
  );
}
