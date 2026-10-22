import { isExternalHref, resolveRelativeHref } from '@campuskit/project-catalog';
import { useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router';

import { PageHeader } from '../components/layout/PageHeader.tsx';
import { MarkdownView, type LinkTarget } from '../components/MarkdownView.tsx';
import { Callout } from '../components/ui/Callout.tsx';
import { Skeleton } from '../components/ui/Spinner.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { templateAssetUrl } from '../lib/assets.ts';
import { cn } from '../lib/cn.ts';
import {
  DOC_GROUP_LABELS,
  findRepoDocByPath,
  getRepoDoc,
  loadRepoDoc,
  REPO_DOCS,
  type DocGroup,
  type RepoDoc,
} from '../lib/repo-docs.ts';
import { catalog } from '@campuskit/project-catalog';
import { siteConfig } from '../site.config.ts';
import { NotFoundPage } from './NotFoundPage.tsx';

const GROUPS: DocGroup[] = ['guides', 'contributing', 'policies'];

export function DocsIndexPage() {
  useDocumentTitle('Documentation');
  return (
    <>
      <PageHeader
        title="Documentation"
        description="Guides for running and presenting projects, how CampusKit works, and how to contribute a template."
      />
      <div className="container-page space-y-12">
        {GROUPS.map((group) => (
          <section key={group} aria-labelledby={`docs-${group}`}>
            <h2 id={`docs-${group}`} className="heading text-xl text-ink">
              {DOC_GROUP_LABELS[group]}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {REPO_DOCS.filter((doc) => doc.group === group).map((doc) => (
                <li key={doc.slug}>
                  <Link
                    to={`/docs/${doc.slug}`}
                    className="block h-full rounded-xl border border-line bg-surface p-4 hover:border-violet"
                  >
                    <span className="block font-semibold text-ink">{doc.title}</span>
                    <span className="mt-1 block text-sm text-ink-3">{doc.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; markdown: string }
  | { status: 'error'; message: string };

function useRepoDoc(doc: RepoDoc): LoadState {
  const [result, setResult] = useState<{ slug: string; state: LoadState } | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadRepoDoc(doc).then(
      (markdown) => {
        if (!cancelled) setResult({ slug: doc.slug, state: { status: 'ready', markdown } });
      },
      (error: unknown) => {
        if (!cancelled)
          setResult({
            slug: doc.slug,
            state: {
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [doc]);
  return result?.slug === doc.slug ? result.state : { status: 'loading' };
}

/** Maps a link inside a repository document to a page on this site, or to plain text. */
export function resolveRepoLink(fromPath: string, href: string): LinkTarget {
  if (isExternalHref(href)) return { kind: 'external', href };
  const target = resolveRelativeHref(fromPath, href);
  if (!target || target.startsWith('..')) return { kind: 'text' };
  const doc = findRepoDocByPath(target);
  if (doc) return { kind: 'internal', to: `/docs/${doc.slug}` };
  const template = catalog.find(
    (project) =>
      target === project.template.directory || target.startsWith(`${project.template.directory}/`),
  );
  if (template) {
    const file = target.slice(template.template.directory.length + 1);
    return {
      kind: 'internal',
      to: file
        ? `/projects/${template.slug}/source?file=${encodeURIComponent(file)}`
        : `/projects/${template.slug}/source`,
    };
  }
  if (siteConfig.repositoryUrl)
    return { kind: 'external', href: `${siteConfig.repositoryUrl}/blob/main/${target}` };
  return { kind: 'text', note: `${target} in the CampusKit source code` };
}

export function DocPage() {
  const { slug = '' } = useParams();
  const doc = getRepoDoc(slug);
  if (!doc) return <NotFoundPage />;
  return <RepoDocView key={doc.slug} doc={doc} />;
}

function RepoDocView({ doc }: { doc: RepoDoc }) {
  useDocumentTitle(doc.title);
  const state = useRepoDoc(doc);
  const markdown =
    state.status === 'ready'
      ? doc.path === 'LICENSE'
        ? `# MIT License\n\n\`\`\`text\n${state.markdown}\n\`\`\``
        : state.markdown
      : '';

  const resolveImage = (src: string): string | undefined => {
    const target = resolveRelativeHref(doc.path, src);
    if (!target) return undefined;
    const template = catalog.find((project) => target.startsWith(`${project.template.directory}/`));
    return template
      ? templateAssetUrl(
          template.template.directory,
          target.slice(template.template.directory.length + 1),
        )
      : undefined;
  };

  return (
    <div className="container-page grid gap-10 pt-8 md:pt-12 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside aria-label="Documentation" className="lg:sticky lg:top-24 lg:self-start">
        <nav aria-label="All documents" className="space-y-5">
          {GROUPS.map((group) => (
            <div key={group}>
              <p className="px-3 text-xs font-bold text-ink-3">{DOC_GROUP_LABELS[group]}</p>
              <ul className="mt-1 space-y-0.5">
                {REPO_DOCS.filter((item) => item.group === group).map((item) => (
                  <li key={item.slug}>
                    <NavLink
                      to={`/docs/${item.slug}`}
                      className={({ isActive }) =>
                        cn(
                          'block rounded-md px-3 py-1.5 text-sm',
                          isActive
                            ? 'bg-raised font-semibold text-ink'
                            : 'text-ink-2 hover:text-ink',
                        )
                      }
                    >
                      {item.title}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 rounded-[18px] border border-line bg-surface p-6 shadow-card sm:p-10">
        {state.status === 'loading' ? (
          <div className="space-y-4" role="status" aria-label="Loading document">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : null}
        {state.status === 'error' ? (
          <Callout tone="danger" title="This document couldn’t be loaded" role="alert">
            {state.message}
          </Callout>
        ) : null}
        {state.status === 'ready' ? (
          <>
            <MarkdownView
              markdown={markdown}
              resolveLink={(href) => resolveRepoLink(doc.path, href)}
              resolveImage={resolveImage}
            />
            <p className="mt-10 border-t border-line pt-4 text-xs text-ink-3">
              Source: <span className="font-mono">{doc.path}</span> in the CampusKit repository.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
