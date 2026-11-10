/**
 * The student's dashboard: figures from their own projects, deadlines, recent activity, the
 * pages they visited, viva preparation across templates and quick actions. Every number comes
 * from what this browser has saved; nothing is estimated or sent anywhere.
 */
import { catalog } from '@campuskit/project-catalog';
import {
  ArrowRight,
  CalendarClock,
  FolderPlus,
  History,
  MessageCircleQuestion,
  Sparkles,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { PageHeader } from '../../components/layout/PageHeader.tsx';
import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { readProjectProgress } from '../../lib/backup.ts';
import { cn } from '../../lib/cn.ts';
import { formatIsoDate, todayIso } from '../../lib/format.ts';
import { useLocale, useT } from '../../lib/i18n.ts';
import { profileStore, useProfile } from '../../lib/profile.ts';
import { readRecent } from '../../lib/recent.ts';
import type { WorkspaceProject } from '../../lib/workspace.ts';
import { StatGrid, StatTile } from '../demo/ui.tsx';
import { addDays, dueDate } from '../viva/logic.ts';
import { projectHref } from '../workspace/ProjectsSection.tsx';
import { useWorkspace } from '../workspace/useWorkspace.ts';

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const card = 'space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6';

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={card}>
      <h2 id={id} className="flex items-center gap-2 type-h3 text-ink">
        <span className="text-violet">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

interface Deadline {
  project: WorkspaceProject;
  title: string;
  due: string;
}

export function DashboardPage() {
  const t = useT();
  const locale = useLocale();
  useDocumentTitle(t('dashboard.title'));
  const workspace = useWorkspace();
  const profile = useProfile();
  const [recent] = useState(readRecent);
  const today = todayIso();
  const soon = addDays(today, 14);

  const active = workspace.projects.filter((project) => !project.archivedAt);
  const archived = workspace.projects.length - active.length;
  const inProgress = active.filter((project) => project.status === 'in-progress').length;
  const done = active.filter((project) => project.status === 'done').length;
  const deadlines: Deadline[] = active
    .flatMap((project) =>
      project.milestones
        .filter((milestone) => !milestone.done && milestone.due)
        .map((milestone) => ({ project, title: milestone.title, due: milestone.due as string })),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  const overdue = deadlines.filter((deadline) => deadline.due < today).length;
  const upcoming = deadlines.filter((deadline) => deadline.due <= soon).length;
  const activity = active
    .flatMap((project) => project.activity.map((entry) => ({ project, ...entry })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const viva = catalog
    .map((project) => {
      const entries = Object.values(readProjectProgress(project.id).viva ?? {});
      return {
        project,
        practised: entries.length,
        confident: entries.filter((entry) => entry.outcome === 'confident').length,
        due: entries.filter((entry) => dueDate(entry) <= today).length,
      };
    })
    .filter((item) => item.practised > 0);

  return (
    // Translated, unlike most pages: it marks its own language (see Layout).
    <div lang={locale}>
      <PageHeader
        eyebrow={t('dashboard.title')}
        title={profile.name ? t('dashboard.welcome', { name: profile.name }) : t('dashboard.yours')}
        description={t('dashboard.description')}
        actions={
          <ButtonLink
            to="/my-projects?new=1"
            icon={<FolderPlus aria-hidden="true" className="size-4" />}
          >
            {t('dashboard.newProject')}
          </ButtonLink>
        }
      />
      <div className="container-page space-y-8 pb-16">
        {profile.onboarded ? null : (
          <Callout title={t('dashboard.newTo')}>
            <p>{t('dashboard.setupText')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ButtonLink
                to="/welcome"
                size="sm"
                icon={<Sparkles aria-hidden="true" className="size-4" />}
              >
                {t('dashboard.setup')}
              </ButtonLink>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => profileStore.update((current) => ({ ...current, onboarded: true }))}
              >
                {t('dashboard.notNow')}
              </Button>
            </div>
          </Callout>
        )}

        <StatGrid>
          <StatTile
            label={t('dashboard.projects')}
            value={active.length}
            detail={archived > 0 ? t('dashboard.archived', { count: archived }) : undefined}
          />
          <StatTile label={t('dashboard.inProgress')} value={inProgress} />
          <StatTile label={t('dashboard.done')} value={done} />
          <StatTile
            label={t('dashboard.deadlines')}
            value={upcoming}
            tone={overdue > 0 ? 'attention' : 'default'}
            detail={overdue > 0 ? t('dashboard.overdue', { count: overdue }) : undefined}
          />
        </StatGrid>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="min-w-0 space-y-6">
            <Section
              id="deadlines-heading"
              title={t('dashboard.upcoming')}
              icon={<CalendarClock aria-hidden="true" className="size-5" />}
            >
              {deadlines.length === 0 ? (
                <p className="text-sm text-ink-2">{t('dashboard.noDeadlines')}</p>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {deadlines.slice(0, 6).map((deadline) => {
                    const late = deadline.due < today;
                    return (
                      <li
                        key={`${deadline.project.id}-${deadline.title}-${deadline.due}`}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2.5 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="block break-words text-ink">{deadline.title}</span>
                          <Link to={projectHref(deadline.project)} className="link text-xs">
                            {deadline.project.title}
                          </Link>
                        </span>
                        <span
                          className={cn(
                            'whitespace-nowrap',
                            late ? 'font-semibold text-danger' : 'text-ink-2',
                          )}
                        >
                          {formatIsoDate(deadline.due)}
                          {late ? t('dashboard.late') : ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section
              id="activity-heading"
              title={t('dashboard.activity')}
              icon={<History aria-hidden="true" className="size-5" />}
            >
              {activity.length === 0 ? (
                <p className="text-sm text-ink-2">{t('dashboard.noActivity')}</p>
              ) : (
                <ol className="space-y-3 border-l border-line pl-4">
                  {activity.map((entry, index) => (
                    <li key={`${entry.project.id}-${entry.at}-${index}`} className="text-sm">
                      <span lang="en" className="block break-words text-ink">
                        {entry.text}
                      </span>
                      <span className="type-meta">
                        <Link to={projectHref(entry.project)} className="link">
                          {entry.project.title}
                        </Link>{' '}
                        ·{' '}
                        <time dateTime={entry.at}>{timeFormatter.format(new Date(entry.at))}</time>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>

          <div className="min-w-0 space-y-6">
            <Section
              id="actions-heading"
              title={t('dashboard.quick')}
              icon={<Sparkles aria-hidden="true" className="size-5" />}
            >
              <ul className="grid gap-2 text-sm">
                {[
                  { to: '/my-projects?new=1', label: t('dashboard.quickNew') },
                  { to: '/projects', label: t('dashboard.quickBrowse') },
                  { to: '/generate', label: t('dashboard.quickGenerate') },
                  { to: '/viva', label: t('dashboard.quickViva') },
                  { to: '/learn/report', label: t('dashboard.quickReport') },
                  { to: '/my-projects', label: t('dashboard.quickBackup') },
                ].map((action) => (
                  <li key={action.to}>
                    <Link
                      to={action.to}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 font-semibold text-ink transition-colors hover:border-violet hover:text-violet"
                    >
                      {action.label}
                      <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              id="recent-heading"
              title={t('dashboard.continue')}
              icon={<History aria-hidden="true" className="size-5" />}
            >
              {recent.filter((page) => page.path !== '/dashboard').length === 0 ? (
                <p className="text-sm text-ink-2">{t('dashboard.noRecent')}</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {recent
                    .filter((page) => page.path !== '/dashboard')
                    .slice(0, 5)
                    .map((page) => (
                      <li key={page.path}>
                        <Link to={page.path} lang="en" className="link break-words">
                          {page.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </Section>

            <Section
              id="viva-heading"
              title={t('dashboard.vivaPrep')}
              icon={<MessageCircleQuestion aria-hidden="true" className="size-5" />}
            >
              {viva.length === 0 ? (
                <p className="text-sm text-ink-2">{t('dashboard.noViva')}</p>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line text-sm">
                  {viva.map(({ project, practised, confident, due }) => (
                    <li key={project.id} className="space-y-0.5 px-3 py-2.5">
                      <Link to={`/projects/${project.slug}/viva`} className="link font-semibold">
                        {project.name}
                      </Link>
                      <p className="text-ink-2">
                        {practised === 1
                          ? t('dashboard.practised.one', { confident })
                          : t('dashboard.practised.other', { count: practised, confident })}
                        {due > 0 ? t('dashboard.dueForReview', { count: due }) : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
