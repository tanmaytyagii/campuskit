/**
 * The student's own projects on My projects: search, filters and sorting, pinned and favourite
 * projects, progress and deadlines, and the archive (restore, or delete for good).
 */
import { FolderPlus, Pin, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { Badge } from '../../components/ui/Badge.tsx';
import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Checkbox, SelectField, TextField } from '../../components/ui/Field.tsx';
import { Meter } from '../../components/ui/Meter.tsx';
import { notify } from '../../components/ui/Toast.tsx';
import { cn } from '../../lib/cn.ts';
import { formatIsoDate, pluralize, todayIso } from '../../lib/format.ts';
import {
  allTags,
  CATEGORIES,
  CATEGORY_LABELS,
  createProject,
  DEFAULT_QUERY,
  deleteProject,
  findProjects,
  nextDeadline,
  progressOf,
  restoreProject,
  SORTS,
  STATUSES,
  STATUS_LABELS,
  toggleFlag,
  WorkspaceFullError,
  type ProjectQuery,
  type ProjectStatus,
  type SortKey,
  type WorkspaceProject,
} from '../../lib/workspace.ts';
import { ProjectForm } from './ProjectForm.tsx';
import { changeWorkspace, useWorkspace } from './useWorkspace.ts';

export const STATUS_TONES: Record<ProjectStatus, 'neutral' | 'violet' | 'warn' | 'lime'> = {
  planning: 'neutral',
  'in-progress': 'violet',
  review: 'warn',
  done: 'lime',
};

export function projectHref(project: Pick<WorkspaceProject, 'id'>): string {
  return `/my-projects/${project.id}`;
}

const toggleClasses =
  'inline-flex size-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-raised hover:text-ink aria-pressed:text-violet';

export function ProjectsSection() {
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const [query, setQuery] = useState<ProjectQuery>(DEFAULT_QUERY);
  const [creating, setCreating] = useState(false);
  const [params, setParams] = useSearchParams();
  // "New project" elsewhere (the palette, the dashboard) links here with ?new=1.
  const wantsNew = params.get('new') === '1';
  const [handledNew, setHandledNew] = useState(false);
  if (wantsNew !== handledNew) {
    setHandledNew(wantsNew);
    if (wantsNew) setCreating(true);
  }
  function closeForm() {
    setCreating(false);
    if (wantsNew)
      setParams(
        (current) => {
          current.delete('new');
          return current;
        },
        { replace: true },
      );
  }
  const [deleting, setDeleting] = useState<WorkspaceProject | null>(null);

  const shown = findProjects(workspace, query);
  const inView = workspace.projects.filter(
    (project) => Boolean(project.archivedAt) === query.archived,
  );
  const tags = allTags(workspace);
  const filtered =
    query.search !== '' ||
    query.status !== 'all' ||
    query.category !== 'all' ||
    query.tag !== '' ||
    query.favorites;
  const set = (changes: Partial<ProjectQuery>) =>
    setQuery((current) => ({ ...current, ...changes }));
  const today = todayIso();

  function create(details: Parameters<typeof createProject>[1]) {
    try {
      let id = '';
      changeWorkspace((state) => {
        const result = createProject(state, details, new Date().toISOString());
        id = result.project.id;
        return result.state;
      }, `Created “${details.title.trim()}”.`);
      setCreating(false);
      if (id) void navigate(projectHref({ id }));
    } catch (error) {
      if (error instanceof WorkspaceFullError) notify(error.message, 'error');
      else throw error;
    }
  }

  return (
    <section aria-labelledby="workspace-heading" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl space-y-1">
          <h2 id="workspace-heading" className="type-h2 text-ink">
            Projects
          </h2>
          <p className="text-ink-2">
            Your own projects, with their status, milestones, notes and links. Start from scratch or
            from a CampusKit template.
          </p>
        </div>
        <Button
          icon={<FolderPlus aria-hidden="true" className="size-4" />}
          onClick={() => setCreating(true)}
        >
          New project
        </Button>
      </div>

      {workspace.projects.length === 0 ? (
        <EmptyState
          icon={<FolderPlus aria-hidden="true" className="size-6" />}
          title="No projects yet"
          actions={
            <>
              <Button size="sm" onClick={() => setCreating(true)}>
                Create a project
              </Button>
              <ButtonLink to="/projects" size="sm" variant="secondary">
                Browse templates
              </ButtonLink>
            </>
          }
        >
          Track a project you’re building: its status, milestones and deadlines, notes and the links
          you need. Everything stays in this browser.
        </EmptyState>
      ) : (
        <>
          <div
            role="search"
            aria-label="Find your projects"
            className="@container rounded-2xl border border-line bg-surface p-4"
          >
            <div className="grid gap-3 @md:grid-cols-2 @3xl:grid-cols-4">
              <TextField
                type="search"
                label="Search"
                placeholder="Title, description, tag or technology"
                value={query.search}
                containerClassName="@md:col-span-2 @3xl:col-span-4"
                onChange={(event) => set({ search: event.target.value })}
              />
              <SelectField
                label="Status"
                value={query.status}
                onChange={(event) => set({ status: event.target.value as ProjectQuery['status'] })}
              >
                <option value="all">Any status</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Category"
                value={query.category}
                onChange={(event) =>
                  set({ category: event.target.value as ProjectQuery['category'] })
                }
              >
                <option value="all">All categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Tag"
                value={query.tag}
                disabled={tags.length === 0}
                onChange={(event) => set({ tag: event.target.value })}
              >
                <option value="">{tags.length === 0 ? 'No tags yet' : 'Any tag'}</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Sort by"
                value={query.sort}
                onChange={(event) => set({ sort: event.target.value as SortKey })}
              >
                {Object.entries(SORTS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Checkbox
                label="Favourites only"
                checked={query.favorites}
                onChange={(event) => set({ favorites: event.target.checked })}
              />
              <Checkbox
                label="Show the archive"
                checked={query.archived}
                onChange={(event) => set({ archived: event.target.checked })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="type-meta">
              {`Showing ${shown.length} of ${pluralize(inView.length, query.archived ? 'archived project' : 'project')}`}
            </p>
            {filtered ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setQuery({ ...DEFAULT_QUERY, archived: query.archived })}
              >
                Clear the filters
              </Button>
            ) : null}
          </div>

          {shown.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-2">
              {query.archived && inView.length === 0
                ? 'The archive is empty. Archived projects appear here, ready to restore or delete.'
                : 'No projects match these filters.'}
            </p>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {shown.map((project) => (
                <li key={project.id}>
                  <ProjectCard
                    project={project}
                    today={today}
                    onDelete={() => setDeleting(project)}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {creating ? (
        <ProjectForm
          title="New project"
          submitLabel="Create project"
          initial={{
            title: '',
            description: '',
            category: 'web',
            status: 'planning',
            tags: [],
            stack: [],
            templateId: null,
          }}
          onSubmit={create}
          onClose={closeForm}
        />
      ) : null}

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete “${deleting.title}” for good?` : 'Delete project?'}
        confirmation
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!deleting) return;
                const { id, title } = deleting;
                setDeleting(null);
                changeWorkspace((state) => deleteProject(state, id), `Deleted “${title}”.`);
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
    </section>
  );
}

function ProjectCard({
  project,
  today,
  onDelete,
}: {
  project: WorkspaceProject;
  today: string;
  onDelete: () => void;
}) {
  const progress = progressOf(project);
  const deadline = nextDeadline(project);
  const overdue = deadline !== null && deadline < today;
  const headingId = `project-${project.id}`;
  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        'flex h-full flex-col gap-4 rounded-2xl border bg-surface p-5 shadow-card',
        project.pinned ? 'border-violet/60' : 'border-line',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 id={headingId} className="type-h3 break-words text-ink">
            <Link to={projectHref(project)} className="hover:text-violet">
              {project.title}
            </Link>
          </h3>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <Badge tone={STATUS_TONES[project.status]}>{STATUS_LABELS[project.status]}</Badge>
            <span>{CATEGORY_LABELS[project.category]}</span>
          </p>
        </div>
        {project.archivedAt ? null : (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              className={toggleClasses}
              aria-pressed={project.pinned}
              aria-label={`Pin ${project.title}`}
              onClick={() => changeWorkspace((state) => toggleFlag(state, project.id, 'pinned'))}
            >
              <Pin aria-hidden="true" className={cn('size-4', project.pinned && 'fill-current')} />
            </button>
            <button
              type="button"
              className={toggleClasses}
              aria-pressed={project.favorite}
              aria-label={`Favourite ${project.title}`}
              onClick={() => changeWorkspace((state) => toggleFlag(state, project.id, 'favorite'))}
            >
              <Star
                aria-hidden="true"
                className={cn('size-4', project.favorite && 'fill-current')}
              />
            </button>
          </div>
        )}
      </div>
      {project.description ? (
        <p className="line-clamp-2 text-sm text-ink-2">{project.description}</p>
      ) : null}
      <dl className="space-y-3">
        <Meter
          label="Milestones"
          value={progress.total === 0 ? 'None yet' : `${progress.done} of ${progress.total} done`}
          share={progress.total ? progress.done / progress.total : 0}
        />
        <div className="flex justify-between gap-3 text-sm">
          <dt className="text-ink-2">Next deadline</dt>
          <dd className={cn('font-semibold', overdue ? 'text-danger' : 'text-ink')}>
            {deadline ? `${formatIsoDate(deadline)}${overdue ? ' (overdue)' : ''}` : 'None'}
          </dd>
        </div>
      </dl>
      {project.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {project.tags.map((tag) => (
            <li key={tag}>
              <Badge tone="outline">{tag}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
      {project.archivedAt ? (
        <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              changeWorkspace(
                (state) => restoreProject(state, project.id, new Date().toISOString()),
                `Restored “${project.title}”.`,
              )
            }
          >
            Restore <span className="sr-only">{project.title}</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            Delete for good <span className="sr-only">{project.title}</span>
          </Button>
        </div>
      ) : null}
    </article>
  );
}
