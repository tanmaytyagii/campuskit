/**
 * One of the student's projects: its details, milestones and deadlines, notes, links and
 * timeline, with editing, duplicating, archiving and restoring. Saved in this browser only.
 */
import { getProjectById } from '@campuskit/project-catalog';
import {
  Archive,
  ArchiveRestore,
  Copy,
  ExternalLink,
  FileText,
  Pencil,
  Pin,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Breadcrumbs } from '../../components/layout/Breadcrumbs.tsx';
import { PageHeader } from '../../components/layout/PageHeader.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { SelectField, TextareaField, TextField } from '../../components/ui/Field.tsx';
import { Meter } from '../../components/ui/Meter.tsx';
import { notify } from '../../components/ui/Toast.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { cn } from '../../lib/cn.ts';
import { formatIsoDate, todayIso } from '../../lib/format.ts';
import {
  addMilestone,
  addResource,
  archiveProject,
  CATEGORY_LABELS,
  deleteProject,
  duplicateProject,
  findProject,
  isSafeUrl,
  LIMITS,
  progressOf,
  removeMilestone,
  removeResource,
  restoreProject,
  setNotes,
  setStatus,
  STATUSES,
  STATUS_LABELS,
  toggleFlag,
  toggleMilestone,
  updateDetails,
  WorkspaceFullError,
  type ProjectStatus,
  type WorkspaceProject,
} from '../../lib/workspace.ts';
import { reportHref, studioHref, vivaHref } from '../learning/links.ts';
import { ProjectForm } from './ProjectForm.tsx';
import { projectHref, STATUS_TONES } from './ProjectsSection.tsx';
import { changeWorkspace, useWorkspace } from './useWorkspace.ts';

const now = () => new Date().toISOString();

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const card = 'space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6';

export function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const workspace = useWorkspace();
  const project = findProject(workspace, projectId);
  useDocumentTitle(project ? project.title : 'Project not found', { remember: Boolean(project) });

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
          Projects are saved in the browser that created them. It may have been deleted, or saved in
          another browser: restore a backup to bring it here.
        </EmptyState>
      </div>
    );

  return <ProjectDetail project={project} />;
}

function ProjectDetail({ project }: { project: WorkspaceProject }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const archived = project.archivedAt !== null;
  const template = project.templateId ? getProjectById(project.templateId) : undefined;
  const { id } = project;

  function duplicate() {
    try {
      let copyId = '';
      changeWorkspace((state) => {
        const result = duplicateProject(state, id, now());
        if (!result) return state;
        copyId = result.project.id;
        return result.state;
      }, `Duplicated “${project.title}”. You’re now on the copy.`);
      if (copyId) void navigate(projectHref({ id: copyId }));
    } catch (error) {
      if (error instanceof WorkspaceFullError) notify(error.message, 'error');
      else throw error;
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={CATEGORY_LABELS[project.category]}
        title={<span className="break-words">{project.title}</span>}
        description={project.description || undefined}
        actions={
          archived ? (
            <>
              <Button
                icon={<ArchiveRestore aria-hidden="true" className="size-4" />}
                onClick={() =>
                  changeWorkspace(
                    (state) => restoreProject(state, id, now()),
                    `Restored “${project.title}”.`,
                  )
                }
              >
                Restore
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 aria-hidden="true" className="size-4" />}
                onClick={() => setDeleting(true)}
              >
                Delete for good
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                icon={<Pencil aria-hidden="true" className="size-4" />}
                onClick={() => setEditing(true)}
              >
                Edit details
              </Button>
              <ButtonLink
                to={`${projectHref(project)}/docs`}
                variant="secondary"
                icon={<FileText aria-hidden="true" className="size-4" />}
              >
                README and viva sheet
              </ButtonLink>
              <Button
                variant="secondary"
                icon={<Copy aria-hidden="true" className="size-4" />}
                onClick={duplicate}
              >
                Duplicate
              </Button>
              <Button
                variant="ghost"
                icon={<Archive aria-hidden="true" className="size-4" />}
                onClick={() =>
                  changeWorkspace(
                    (state) => archiveProject(state, id, now()),
                    `Archived “${project.title}”. Restore it from the archive on My projects.`,
                  )
                }
              >
                Archive
              </Button>
            </>
          )
        }
      >
        <Breadcrumbs
          items={[{ label: 'My projects', to: '/my-projects' }]}
          current={project.title}
        />
      </PageHeader>

      <div className="container-page grid gap-6 pb-16 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {archived ? (
            <Callout tone="warn" title="This project is archived">
              It’s hidden from your project list and can’t be changed. Restore it to work on it
              again, or delete it for good.
            </Callout>
          ) : null}
          <Milestones project={project} archived={archived} />
          <Notes project={project} archived={archived} />
          <Resources project={project} archived={archived} />
        </div>
        <div className="min-w-0 space-y-6">
          <Overview project={project} archived={archived} template={template} />
          <Timeline project={project} />
        </div>
      </div>

      {editing ? (
        <ProjectForm
          title="Edit details"
          submitLabel="Save changes"
          initial={project}
          onSubmit={(details) => {
            changeWorkspace(
              (state) => updateDetails(state, id, details, now()),
              'Saved the changes.',
            );
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      ) : null}

      <Dialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title={`Delete “${project.title}” for good?`}
        confirmation
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleting(false);
                changeWorkspace((state) => deleteProject(state, id), `Deleted “${project.title}”.`);
                void navigate('/my-projects');
              }}
            >
              Delete for good
            </Button>
          </div>
        }
      >
        <p className="text-ink-2">
          Its notes, milestones, links and timeline are deleted from this browser. This can’t be
          undone, unless the project is in a backup.
        </p>
      </Dialog>
    </>
  );
}

function Overview({
  project,
  archived,
  template,
}: {
  project: WorkspaceProject;
  archived: boolean;
  template: ReturnType<typeof getProjectById>;
}) {
  const { id } = project;
  return (
    <section aria-labelledby="overview-heading" className={card}>
      <div className="flex items-start justify-between gap-3">
        <h2 id="overview-heading" className="type-h3 text-ink">
          Overview
        </h2>
        {archived ? null : (
          <div className="flex gap-1">
            <button
              type="button"
              aria-pressed={project.pinned}
              aria-label="Pin this project"
              className="inline-flex size-9 items-center justify-center rounded-lg text-ink-3 hover:bg-raised hover:text-ink aria-pressed:text-violet"
              onClick={() => changeWorkspace((state) => toggleFlag(state, id, 'pinned'))}
            >
              <Pin aria-hidden="true" className={cn('size-4', project.pinned && 'fill-current')} />
            </button>
            <button
              type="button"
              aria-pressed={project.favorite}
              aria-label="Favourite this project"
              className="inline-flex size-9 items-center justify-center rounded-lg text-ink-3 hover:bg-raised hover:text-ink aria-pressed:text-violet"
              onClick={() => changeWorkspace((state) => toggleFlag(state, id, 'favorite'))}
            >
              <Star
                aria-hidden="true"
                className={cn('size-4', project.favorite && 'fill-current')}
              />
            </button>
          </div>
        )}
      </div>
      {archived ? (
        <p>
          <Badge tone={STATUS_TONES[project.status]}>{STATUS_LABELS[project.status]}</Badge>
        </p>
      ) : (
        <SelectField
          label="Status"
          value={project.status}
          onChange={(event) =>
            changeWorkspace((state) =>
              setStatus(state, id, event.target.value as ProjectStatus, now()),
            )
          }
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
      )}
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-ink-2">Technology stack</dt>
          <dd className="mt-1">
            {project.stack.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {project.stack.map((item) => (
                  <li key={item}>
                    <Badge>{item}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-ink-3">Not set</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink-2">Tags</dt>
          <dd className="mt-1">
            {project.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <li key={tag}>
                    <Badge tone="outline">{tag}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-ink-3">None</span>
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-2">Created</dt>
          <dd className="text-ink">{timeFormatter.format(new Date(project.createdAt))}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-2">Last changed</dt>
          <dd className="text-ink">{timeFormatter.format(new Date(project.updatedAt))}</dd>
        </div>
      </dl>
      {template ? (
        <div className="space-y-2 border-t border-line pt-4">
          <h3 className="font-semibold text-ink">From the {template.name} template</h3>
          <ul className="space-y-1.5 text-sm">
            <li>
              <Link to={studioHref(template)} className="link">
                Learning studio
              </Link>
            </li>
            <li>
              <Link to={vivaHref(template)} className="link">
                Viva questions
              </Link>
            </li>
            <li>
              <Link to={`/projects/${template.slug}`} className="link">
                Template documentation
              </Link>
            </li>
            <li>
              <Link to={reportHref(template)} className="link">
                Report workspace
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Milestones({ project, archived }: { project: WorkspaceProject; archived: boolean }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState<string | undefined>();
  const progress = progressOf(project);
  const today = todayIso();
  const { id } = project;
  const titleId = useId();

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Enter what the milestone is.');
      document.getElementById(titleId)?.focus();
      return;
    }
    changeWorkspace((state) => addMilestone(state, id, { title, due: due || null }, now()));
    setTitle('');
    setDue('');
    setError(undefined);
    document.getElementById(titleId)?.focus();
  }

  return (
    <section aria-labelledby="milestones-heading" className={card}>
      <h2 id="milestones-heading" className="type-h3 text-ink">
        Milestones
      </h2>
      {progress.total > 0 ? (
        <dl>
          <Meter
            label="Progress"
            value={`${progress.done} of ${progress.total} done`}
            share={progress.done / progress.total}
          />
        </dl>
      ) : (
        <p className="text-sm text-ink-2">
          Break the project into steps, such as “Database schema” or “First demo to the guide”, with
          a deadline if it has one.
        </p>
      )}
      {project.milestones.length > 0 ? (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {project.milestones.map((milestone) => {
            const overdue = !milestone.done && milestone.due !== null && milestone.due < today;
            const checkboxId = `milestone-${milestone.id}`;
            return (
              <li key={milestone.id} className="flex items-center gap-3 px-3 py-2.5">
                <input
                  id={checkboxId}
                  type="checkbox"
                  className="size-5 shrink-0 accent-violet"
                  checked={milestone.done}
                  disabled={archived}
                  onChange={() =>
                    changeWorkspace((state) => toggleMilestone(state, id, milestone.id, now()))
                  }
                />
                <label htmlFor={checkboxId} className="min-w-0 flex-1 text-sm">
                  <span
                    className={cn(
                      'block break-words text-ink',
                      milestone.done && 'line-through text-ink-3',
                    )}
                  >
                    {milestone.title}
                  </span>
                  {milestone.due ? (
                    <span className={cn('type-meta block', overdue && 'font-semibold text-danger')}>
                      Due {formatIsoDate(milestone.due)}
                      {overdue ? ', overdue' : ''}
                    </span>
                  ) : null}
                </label>
                {archived ? null : (
                  <button
                    type="button"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-raised hover:text-danger"
                    aria-label={`Remove milestone ${milestone.title}`}
                    onClick={() =>
                      changeWorkspace((state) => removeMilestone(state, id, milestone.id, now()))
                    }
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      {archived ? null : (
        <form
          noValidate
          onSubmit={add}
          aria-label="Add a milestone"
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end"
        >
          <TextField
            id={titleId}
            label="New milestone"
            autoComplete="off"
            maxLength={LIMITS.title}
            value={title}
            error={error}
            onChange={(event) => {
              setTitle(event.target.value);
              setError(undefined);
            }}
          />
          <TextField
            label="Due date"
            type="date"
            optional
            value={due}
            onChange={(event) => setDue(event.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
            icon={<Plus aria-hidden="true" className="size-4" />}
          >
            Add
          </Button>
        </form>
      )}
    </section>
  );
}

function Notes({ project, archived }: { project: WorkspaceProject; archived: boolean }) {
  const { id } = project;
  return (
    <section aria-labelledby="notes-heading" className={card}>
      <h2 id="notes-heading" className="type-h3 text-ink">
        Notes
      </h2>
      <TextareaField
        label="Notes for this project"
        font="sans"
        rows={8}
        readOnly={archived}
        maxLength={LIMITS.notes}
        description={`Ideas, decisions, questions for your guide. Saved in this browser as you type (up to ${LIMITS.notes.toLocaleString('en-GB')} characters).`}
        value={project.notes}
        onChange={(event) =>
          changeWorkspace((state) => setNotes(state, id, event.target.value, now()))
        }
      />
      <p className="type-meta" aria-live="polite">
        {project.notes.length.toLocaleString('en-GB')} characters
      </p>
    </section>
  );
}

function Resources({ project, archived }: { project: WorkspaceProject; archived: boolean }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | undefined>();
  const urlId = useId();
  const { id } = project;

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = url.trim();
    if (!isSafeUrl(address)) {
      setError('Enter a web address that starts with https:// or http://.');
      document.getElementById(urlId)?.focus();
      return;
    }
    changeWorkspace((state) => addResource(state, id, { title, url: address }, now()));
    setTitle('');
    setUrl('');
    setError(undefined);
  }

  return (
    <section aria-labelledby="resources-heading" className={card}>
      <h2 id="resources-heading" className="type-h3 text-ink">
        Resources
      </h2>
      {project.resources.length > 0 ? (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {project.resources.map((resource) => (
            <li key={resource.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link min-w-0 flex-1 break-words"
              >
                {resource.title}
                <ExternalLink aria-hidden="true" className="ml-1 inline size-3.5" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              {archived ? null : (
                <button
                  type="button"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-raised hover:text-danger"
                  aria-label={`Remove link ${resource.title}`}
                  onClick={() =>
                    changeWorkspace((state) => removeResource(state, id, resource.id, now()))
                  }
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-2">
          Links you keep coming back to: documentation, tutorials, your repository.
        </p>
      )}
      {archived ? null : (
        <form
          noValidate
          onSubmit={add}
          aria-label="Add a link"
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end"
        >
          <TextField
            label="Link title"
            optional
            autoComplete="off"
            maxLength={LIMITS.title}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <TextField
            id={urlId}
            label="Web address"
            type="url"
            autoComplete="off"
            placeholder="https://"
            value={url}
            error={error}
            onChange={(event) => {
              setUrl(event.target.value);
              setError(undefined);
            }}
          />
          <Button
            type="submit"
            variant="secondary"
            icon={<Plus aria-hidden="true" className="size-4" />}
          >
            Add
          </Button>
        </form>
      )}
    </section>
  );
}

function Timeline({ project }: { project: WorkspaceProject }) {
  return (
    <section aria-labelledby="timeline-heading" className={card}>
      <h2 id="timeline-heading" className="type-h3 text-ink">
        Activity
      </h2>
      <ol className="space-y-3 border-l border-line pl-4">
        {project.activity.slice(0, 30).map((entry, index) => (
          <li key={`${entry.at}-${index}`} className="text-sm">
            <span className="block break-words text-ink">{entry.text}</span>
            <time dateTime={entry.at} className="type-meta">
              {timeFormatter.format(new Date(entry.at))}
            </time>
          </li>
        ))}
      </ol>
      {project.activity.length > 30 ? (
        <p className="type-meta">The 30 most recent of {project.activity.length} entries.</p>
      ) : null}
    </section>
  );
}
