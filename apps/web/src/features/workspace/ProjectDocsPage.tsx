/**
 * The documentation studio for one of the student's projects: a README and a viva preparation
 * sheet drafted from the project's own details, with what's missing listed first, a preview,
 * and downloads as Markdown and Word, or printing (and so PDF).
 */
import { getProjectById } from '@campuskit/project-catalog';
import { Download, FileText, Printer } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { Breadcrumbs } from '../../components/layout/Breadcrumbs.tsx';
import { PageHeader } from '../../components/layout/PageHeader.tsx';
import { MarkdownView } from '../../components/MarkdownView.tsx';
import { PrintDocument, usePrinting } from '../../components/PrintDocument.tsx';
import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { notify } from '../../components/ui/Toast.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { useLearningGuide } from '../../hooks/useLearningGuide.ts';
import { readProjectProgress } from '../../lib/backup.ts';
import { cn } from '../../lib/cn.ts';
import { downloadFile } from '../../lib/download.ts';
import { pluralize, todayIso } from '../../lib/format.ts';
import { findProject, type WorkspaceProject } from '../../lib/workspace.ts';
import {
  DOCUMENTS,
  projectReadme,
  vivaSheet,
  type DocumentKind,
  type DraftDocument,
} from './project-docs.ts';
import { projectHref } from './ProjectsSection.tsx';
import { useWorkspace } from './useWorkspace.ts';

export function ProjectDocsPage() {
  const { projectId = '' } = useParams();
  const project = findProject(useWorkspace(), projectId);
  useDocumentTitle(project ? `Documents: ${project.title}` : 'Project not found', {
    remember: Boolean(project),
  });
  if (!project)
    return (
      <div className="container-page py-12">
        <EmptyState
          title="This project isn’t in this browser"
          actions={
            <ButtonLink to="/my-projects" size="sm">
              Go to My projects
            </ButtonLink>
          }
        >
          Projects are saved in the browser that created them. Restore a backup to bring one here.
        </EmptyState>
      </div>
    );
  return <ProjectDocs project={project} />;
}

function fileSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'project'
  );
}

function ProjectDocs({ project }: { project: WorkspaceProject }) {
  const today = todayIso();
  const [kind, setKind] = useState<DocumentKind>('readme');
  const [printing, print] = usePrinting();
  const template = project.templateId ? getProjectById(project.templateId) : undefined;
  const guide = useLearningGuide(kind === 'viva' ? template : undefined);
  const waiting = kind === 'viva' && template !== undefined && guide.status === 'loading';

  const draft: DraftDocument =
    kind === 'readme'
      ? projectReadme(project, template, today)
      : vivaSheet(
          project,
          template && guide.status === 'ready'
            ? {
                manifest: template,
                guide: guide.loaded.guide,
                progress: { version: 1, questions: readProjectProgress(template.id).viva ?? {} },
              }
            : undefined,
          today,
        );
  const baseName = `${fileSlug(project.title)}-${kind === 'readme' ? 'readme' : 'viva-sheet'}`;

  async function downloadDocx() {
    try {
      const { DOCX_MIME_TYPE, markdownToDocx } = await import('../../lib/docx.ts');
      downloadFile(
        await markdownToDocx(draft.markdown, {
          title: `${DOCUMENTS[kind]}: ${project.title}`,
          date: today,
        }),
        `${baseName}.docx`,
        DOCX_MIME_TYPE,
      );
    } catch {
      notify('The Word file couldn’t be made. Download the Markdown file instead.', 'error');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Documentation studio"
        title={<span className="break-words">Documents for {project.title}</span>}
        description="Drafted from what you’ve entered for this project, and from its template if it started from one. Nothing is made up: parts with no details yet are marked “To write”."
      >
        <Breadcrumbs
          items={[
            { label: 'My projects', to: '/my-projects' },
            { label: project.title, to: projectHref(project) },
          ]}
          current="Documents"
        />
      </PageHeader>
      <div className="container-page space-y-6 pb-16">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-2 text-sm font-semibold text-ink">Document</legend>
          {(Object.keys(DOCUMENTS) as DocumentKind[]).map((id) => (
            <label
              key={id}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet',
                kind === id
                  ? 'border-violet bg-violet-soft text-ink'
                  : 'border-line bg-surface text-ink-2 hover:bg-raised',
              )}
            >
              <input
                type="radio"
                name="document"
                value={id}
                checked={kind === id}
                onChange={() => setKind(id)}
                className="accent-violet"
              />
              {DOCUMENTS[id]}
            </label>
          ))}
        </fieldset>

        {waiting ? (
          <p role="status" className="type-meta">
            Loading the template’s viva questions…
          </p>
        ) : (
          <>
            {draft.missing.length > 0 ? (
              <Callout
                tone="warn"
                title={`${pluralize(draft.missing.length, 'part')} still to write`}
              >
                <ul className="list-disc space-y-1 pl-5">
                  {draft.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-2">
                  Add details on the{' '}
                  <Link to={projectHref(project)} className="link">
                    project page
                  </Link>
                  , or write them in the downloaded file.
                </p>
              </Callout>
            ) : (
              <Callout tone="success" title="Every part has details">
                Read it through before you hand it in: it’s a draft from your notes.
              </Callout>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                icon={<FileText aria-hidden="true" className="size-4" />}
                onClick={() => void downloadDocx()}
              >
                Download as Word (.docx)
              </Button>
              <Button
                variant="secondary"
                icon={<Download aria-hidden="true" className="size-4" />}
                onClick={() => downloadFile(draft.markdown, `${baseName}.md`, 'text/markdown')}
              >
                Markdown (.md)
              </Button>
              <Button
                variant="secondary"
                icon={<Printer aria-hidden="true" className="size-4" />}
                onClick={print}
              >
                Print or save as PDF
              </Button>
            </div>

            <section
              aria-labelledby="preview-heading"
              className="rounded-2xl border border-line bg-surface p-6 shadow-card"
            >
              <h2 id="preview-heading" className="type-h3 mb-4 text-ink">
                Preview: {DOCUMENTS[kind]}
              </h2>
              <MarkdownView markdown={draft.markdown} headingOffset={2} />
            </section>
          </>
        )}
      </div>
      <PrintDocument markdown={draft.markdown} printing={printing} />
    </>
  );
}
