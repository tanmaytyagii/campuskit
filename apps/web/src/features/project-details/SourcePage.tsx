import { getProjectBySlug, type ProjectManifest } from '@campuskit/project-catalog';
import { formatBytes, type BundleFile } from '@campuskit/template-engine';
import { Check, Copy, Download, FileCode, Folder, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { MarkdownView } from '../../components/MarkdownView.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { Skeleton, Spinner } from '../../components/ui/Spinner.tsx';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard.ts';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { useTemplateBundle } from '../../hooks/useTemplateBundle.ts';
import { cn } from '../../lib/cn.ts';
import { downloadFile } from '../../lib/download.ts';
import { NotFoundPage } from '../../pages/NotFoundPage.tsx';
import { buildFileTree, imageMimeType, type TreeFolder } from './file-tree.ts';

function Tree({ folder, selected, slug }: { folder: TreeFolder; selected: string; slug: string }) {
  return (
    <ul className="space-y-0.5">
      {folder.children.map((node) =>
        node.kind === 'folder' ? (
          <li key={node.path}>
            <details open={selected.startsWith(`${node.path}/`) || node.path.split('/').length < 2}>
              <summary className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-ink-2 hover:bg-raised">
                <Folder aria-hidden="true" className="size-4 shrink-0 text-violet" />
                {node.name}
              </summary>
              <div className="ml-3 border-l border-line pl-2">
                <Tree folder={node} selected={selected} slug={slug} />
              </div>
            </details>
          </li>
        ) : (
          <li key={node.path}>
            <Link
              to={`/projects/${slug}/source?file=${encodeURIComponent(node.path)}`}
              replace
              aria-current={node.path === selected ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1 font-mono text-[0.8rem]',
                node.path === selected
                  ? 'bg-violet-soft font-medium text-violet'
                  : 'text-ink-2 hover:bg-raised hover:text-ink',
              )}
            >
              <FileCode aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{node.name}</span>
            </Link>
          </li>
        ),
      )}
    </ul>
  );
}

function FileViewer({ file, project }: { file: BundleFile; project: ProjectManifest }) {
  const [rendered, setRendered] = useState(true);
  const { state, copy } = useCopyToClipboard();
  const image = file.encoding === 'base64' ? imageMimeType(file.path) : undefined;
  const isMarkdown = file.path.endsWith('.md') && file.encoding === 'utf8';
  const lines = file.encoding === 'utf8' ? file.content.replace(/\n$/, '').split('\n') : [];

  function downloadSingle() {
    if (file.encoding === 'utf8')
      downloadFile(file.content, file.path.split('/').pop() ?? 'file.txt', 'text/plain');
    else {
      const bytes = Uint8Array.from(atob(file.content), (char) => char.charCodeAt(0));
      downloadFile(
        bytes,
        file.path.split('/').pop() ?? 'file',
        image ?? 'application/octet-stream',
      );
    }
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-[18px] border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-raised px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate font-mono text-sm font-medium text-ink">
          {file.path}
        </h2>
        <span className="text-xs text-ink-3">{formatBytes(file.size)}</span>
        {isMarkdown ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setRendered((value) => !value)}
            aria-pressed={!rendered}
          >
            {rendered ? 'Show source' : 'Show formatted'}
          </Button>
        ) : null}
        {file.encoding === 'utf8' ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void copy(file.content)}
            icon={
              state === 'copied' ? (
                <Check aria-hidden="true" className="size-3.5" />
              ) : (
                <Copy aria-hidden="true" className="size-3.5" />
              )
            }
          >
            {state === 'copied' ? 'Copied' : 'Copy'}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          onClick={downloadSingle}
          icon={<Download aria-hidden="true" className="size-3.5" />}
        >
          Download file
        </Button>
      </div>
      {image ? (
        <div className="bg-sunken p-4">
          <img
            src={`data:${image};base64,${file.content}`}
            alt={`Contents of ${file.path}`}
            className="mx-auto max-h-[70vh] rounded-lg border border-line"
          />
        </div>
      ) : isMarkdown && rendered ? (
        <div className="p-6 sm:p-8">
          <MarkdownView markdown={file.content} headingOffset={1} />
        </div>
      ) : file.encoding === 'utf8' ? (
        <div
          role="region"
          aria-label={`Source of ${file.path}`}
          tabIndex={0}
          className="max-h-[75vh] overflow-auto bg-code-bg text-code-ink"
        >
          <pre className="py-3 text-[0.8rem] leading-6">
            <code>
              {lines.map((line, index) => (
                <span key={index} className="grid grid-cols-[3.5rem_1fr]">
                  <span aria-hidden="true" className="select-none pr-4 text-right text-code-ink/40">
                    {index + 1}
                  </span>
                  <span className="whitespace-pre pr-4">{line || ' '}</span>
                </span>
              ))}
            </code>
          </pre>
        </div>
      ) : (
        <p className="p-6 text-sm text-ink-3">
          This is a binary file. Use “Download file” to open it.
        </p>
      )}
      <p className="border-t border-line px-4 py-2 text-xs text-ink-3">
        Part of {project.name} {project.version}. Generated copies also get a GETTING_STARTED.md
        with your own setup steps.
      </p>
    </div>
  );
}

export function SourcePage() {
  const { slug = '' } = useParams();
  const project = getProjectBySlug(slug);
  if (!project) return <NotFoundPage />;
  return <ProjectSource key={project.id} project={project} />;
}

function ProjectSource({ project }: { project: ProjectManifest }) {
  useDocumentTitle(`Source code | ${project.name}`);
  const [params] = useSearchParams();
  const bundle = useTemplateBundle(project.id);
  const requested = params.get('file') ?? 'README.md';
  const tree = useMemo(
    () => (bundle.status === 'ready' ? buildFileTree(bundle.bundle.files) : null),
    [bundle],
  );
  const file =
    bundle.status === 'ready'
      ? (bundle.bundle.files.find((item) => item.path === requested) ?? null)
      : null;

  return (
    <div className="container-page pt-8 md:pt-12">
      <div className="mb-6 space-y-2">
        <Link to={`/projects/${project.slug}`} className="link text-sm">
          Back to {project.name}
        </Link>
        <h1 className="display text-3xl text-ink md:text-4xl">Source code</h1>
        <p className="max-w-3xl text-ink-2">
          Every file in the <span className="font-mono text-[0.95em]">{project.id}</span> template,
          exactly as it goes into the ZIP. Dependencies are not included; they are installed by{' '}
          {project.template.packageManager}.
        </p>
      </div>

      {bundle.status === 'loading' || bundle.status === 'idle' ? (
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <Skeleton className="h-96" />
          <div className="space-y-3">
            <Spinner label="Loading the template files…" />
            <Skeleton className="h-96" />
          </div>
        </div>
      ) : null}

      {bundle.status === 'error' ? (
        <Callout tone="danger" title="The source files couldn’t be loaded" role="alert">
          <p>{bundle.message}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={bundle.retry}
            icon={<RotateCcw aria-hidden="true" className="size-4" />}
          >
            Try again
          </Button>
        </Callout>
      ) : null}

      {bundle.status === 'ready' && tree ? (
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav
            aria-label="Files"
            className="max-h-[80vh] overflow-auto rounded-xl border border-line bg-surface p-3 lg:sticky lg:top-24"
          >
            <p className="mb-2 px-2 text-xs text-ink-3">
              {bundle.bundle.files.length} files,{' '}
              {formatBytes(bundle.bundle.files.reduce((sum, item) => sum + item.size, 0))}
            </p>
            <Tree folder={tree} selected={file?.path ?? ''} slug={project.slug} />
          </nav>
          {file ? (
            <FileViewer key={file.path} file={file} project={project} />
          ) : (
            <Callout tone="warn" title="File not found">
              {requested} is not part of this template. Choose a file from the list.
            </Callout>
          )}
        </div>
      ) : null}
    </div>
  );
}
