import {
  getProjectBySlug,
  isExternalHref,
  resolveRelativeHref,
  type DocReference,
  type ProjectManifest,
} from '@campuskit/project-catalog';
import { useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router';

import { MarkdownView, type LinkTarget } from '../../components/MarkdownView.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { Skeleton } from '../../components/ui/Spinner.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { loadTemplateDoc, templateAssetUrl } from '../../lib/assets.ts';
import { cn } from '../../lib/cn.ts';
import { NotFoundPage } from '../../pages/NotFoundPage.tsx';

type LoadState =
  { status: 'loading' } | { status: 'ready'; markdown: string } | { status: 'error' };

function useTemplateDoc(project: ProjectManifest, doc: DocReference): LoadState {
  const key = `${project.id}/${doc.file}`;
  const [result, setResult] = useState<{ key: string; state: LoadState } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loading = loadTemplateDoc(project.template.directory, doc.file);
    const settle = (state: LoadState) => {
      if (!cancelled) setResult({ key, state });
    };
    if (!loading) queueMicrotask(() => settle({ status: 'error' }));
    else
      loading.then(
        (markdown) => settle({ status: 'ready', markdown }),
        () => settle({ status: 'error' }),
      );
    return () => {
      cancelled = true;
    };
  }, [key, project.template.directory, doc.file]);

  return result?.key === key ? result.state : { status: 'loading' };
}

export function TemplateDocPage() {
  const { slug = '', kind = '' } = useParams();
  const project = getProjectBySlug(slug);
  const doc = project?.docs.find((item) => item.kind === kind);
  if (!project || !doc) return <NotFoundPage />;
  return <TemplateDoc key={`${project.id}-${doc.kind}`} project={project} doc={doc} />;
}

function TemplateDoc({ project, doc }: { project: ProjectManifest; doc: DocReference }) {
  useDocumentTitle(`${doc.title} | ${project.name}`);
  const state = useTemplateDoc(project, doc);

  const resolveLink = (href: string): LinkTarget => {
    if (isExternalHref(href)) return { kind: 'external', href };
    const target = resolveRelativeHref(doc.file, href);
    if (!target || target.startsWith('..')) return { kind: 'text' };
    const linkedDoc = project.docs.find((item) => item.file === target);
    if (linkedDoc)
      return { kind: 'internal', to: `/projects/${project.slug}/docs/${linkedDoc.kind}` };
    return {
      kind: 'internal',
      to: `/projects/${project.slug}/source?file=${encodeURIComponent(target)}`,
    };
  };

  const resolveImage = (src: string): string | undefined => {
    if (isExternalHref(src)) return undefined; // only images that ship with the template are shown
    const target = resolveRelativeHref(doc.file, src);
    return target ? templateAssetUrl(project.template.directory, target) : undefined;
  };

  return (
    <div className="container-page grid gap-10 pt-8 md:pt-12 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside
        aria-label={`${project.name} documents`}
        className="space-y-4 lg:sticky lg:top-24 lg:self-start"
      >
        <Link to={`/projects/${project.slug}`} className="link text-sm">
          Back to {project.name}
        </Link>
        <nav aria-label="Project documents">
          <ul className="space-y-1">
            {project.docs.map((item) => (
              <li key={item.kind}>
                <NavLink
                  to={`/projects/${project.slug}/docs/${item.kind}`}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-md px-3 py-2 text-sm font-medium',
                      isActive ? 'bg-raised text-ink' : 'text-ink-2 hover:text-ink',
                    )
                  }
                >
                  {item.title}
                </NavLink>
              </li>
            ))}
            <li>
              <Link
                to={`/projects/${project.slug}/source`}
                className="block rounded-md px-3 py-2 text-sm font-medium text-ink-2 hover:text-ink"
              >
                Source code
              </Link>
            </li>
          </ul>
        </nav>
        <p className="text-xs text-ink-3">
          From{' '}
          <span className="font-mono">
            {project.template.directory}/{doc.file}
          </span>
          , the same file you get in the ZIP.
        </p>
      </aside>
      <div className="min-w-0 rounded-[18px] border border-line bg-surface p-6 shadow-card sm:p-10">
        {state.status === 'loading' ? (
          <div className="space-y-4" role="status" aria-label="Loading document">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : null}
        {state.status === 'error' ? (
          <Callout tone="danger" title="This document couldn’t be loaded" role="alert">
            Reload the page, or open {doc.file} in the downloaded project.
          </Callout>
        ) : null}
        {state.status === 'ready' ? (
          <MarkdownView
            markdown={state.markdown}
            resolveLink={resolveLink}
            resolveImage={resolveImage}
          />
        ) : null}
      </div>
    </div>
  );
}
