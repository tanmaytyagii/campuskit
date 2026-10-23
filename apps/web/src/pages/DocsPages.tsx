import { isExternalHref, resolveRelativeHref } from '@campuskit/project-catalog';
import { ArrowRight, BookOpen, ChevronDown, FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

const GROUP_DESCRIPTIONS: Record<DocGroup, string> = {
  guides: 'Run, present and explain a project you started from a template.',
  contributing: 'Set up the repository, add a template and see how CampusKit is built.',
  policies: 'Security, conduct and the licences that cover CampusKit.',
};

export function DocsIndexPage() {
  useDocumentTitle('Documentation');
  return (
    <>
      <PageHeader
        eyebrow="Docs"
        title="Documentation"
        description="Guides for running and presenting projects, how CampusKit works, and how to contribute a template."
      />
      <div className="container-page divide-y divide-line">
        {GROUPS.map((group) => (
          <section
            key={group}
            aria-labelledby={`docs-${group}`}
            className="grid gap-6 py-10 first:pt-0 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-12"
          >
            <div className="space-y-2">
              <h2 id={`docs-${group}`} className="type-h3 text-ink">
                {DOC_GROUP_LABELS[group]}
              </h2>
              <p className="text-sm text-ink-2">{GROUP_DESCRIPTIONS[group]}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {REPO_DOCS.filter((doc) => doc.group === group).map((doc) => (
                <li key={doc.slug}>
                  <Link
                    to={`/docs/${doc.slug}`}
                    className="group flex h-full items-start gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-violet"
                  >
                    <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-3" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink group-hover:text-violet">
                        {doc.title}
                      </span>
                      <span className="mt-1 block text-sm text-ink-2">{doc.description}</span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-violet motion-reduce:transition-none"
                    />
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

/** Every document, grouped; the current one is marked. */
function DocsNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="All documents" className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group}>
          <p className="type-eyebrow px-3">{DOC_GROUP_LABELS[group]}</p>
          <ul className="mt-2 space-y-0.5">
            {REPO_DOCS.filter((item) => item.group === group).map((item) => (
              <li key={item.slug}>
                <NavLink
                  to={`/docs/${item.slug}`}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-md px-3 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-violet-soft font-semibold text-violet'
                        : 'text-ink-2 hover:bg-raised hover:text-ink',
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
  const menu = useRef<HTMLDetailsElement>(null);
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
    <div className="container-page grid gap-6 pt-8 md:pt-12 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10">
      {/* Phones and tablets: the list of documents folds away above the article. */}
      <details ref={menu} className="group rounded-xl border border-line bg-surface lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <BookOpen aria-hidden="true" className="size-4 text-violet" />
            All documents
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-ink-2 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <div className="border-t border-line p-3">
          <DocsNav onNavigate={() => menu.current?.removeAttribute('open')} />
        </div>
      </details>
      <aside
        aria-label="Documentation"
        className="hidden lg:sticky lg:top-24 lg:block lg:self-start"
      >
        <DocsNav />
      </aside>
      <div className="min-w-0 rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-10">
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
            <p className="type-eyebrow mb-3 text-violet">{DOC_GROUP_LABELS[doc.group]}</p>
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
