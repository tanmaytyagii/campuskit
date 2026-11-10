/**
 * Backing up progress to a JSON file and restoring it, with a preview of what a file holds
 * before anything changes. Files are made and read in the browser and never uploaded.
 */
import { getProjectById } from '@campuskit/project-catalog';
import { Download, Upload } from 'lucide-react';
import { useId, useState, type ChangeEvent } from 'react';

import { Button } from '../../components/ui/Button.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import {
  backupFileName,
  createBackup,
  MAX_BACKUP_BYTES,
  parseBackup,
  readProjectProgress,
  restoreBackup,
  workspaceMerge,
  type ProgressBackup,
} from '../../lib/backup.ts';
import { downloadFile } from '../../lib/download.ts';
import { formatIsoDate, pluralize, todayIso } from '../../lib/format.ts';
import { LIMITS, workspaceStore } from '../../lib/workspace.ts';
import { describeProgress } from './summary.ts';

interface Pending {
  backup: ProgressBackup;
  unknownProjects: string[];
  fileName: string;
}

export function BackupPanel({
  hasSaved,
  onRestored,
}: {
  hasSaved: boolean;
  /** How many templates' progress and how many of the student's projects were restored. */
  onRestored: (counts: { templates: number; projects: number }) => void;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  function download() {
    const today = todayIso();
    downloadFile(
      `${JSON.stringify(createBackup(today), null, 2)}\n`,
      backupFileName(today),
      'application/json',
    );
  }

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Cleared, so choosing the same file again (after fixing it, say) is noticed.
    input.value = '';
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setError('This file is too large to be a CampusKit progress file.');
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setError('This file couldn’t be read. Choose it again, or download a new backup.');
      return;
    }
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const incoming = parsed.backup.workspace ?? [];
    if (
      Object.keys(parsed.backup.projects).length === 0 &&
      incoming.length === 0 &&
      !parsed.backup.profile
    ) {
      setError('This backup has nothing this version of CampusKit can restore.');
      return;
    }
    if (workspaceMerge(workspaceStore.getSnapshot().projects, incoming).total > LIMITS.projects) {
      setError(
        `Restoring this backup would make more than ${LIMITS.projects} projects. Delete some archived projects first.`,
      );
      return;
    }
    setError(null);
    setPending({ ...parsed, fileName: file.name });
  }

  function restore() {
    if (!pending) return;
    const restored = restoreBackup(pending.backup);
    setPending(null);
    onRestored({ templates: restored.length, projects: pending.backup.workspace?.length ?? 0 });
  }

  const projects = pending ? Object.entries(pending.backup.projects) : [];
  const incoming = pending?.backup.workspace ?? [];
  const merge = workspaceMerge(workspaceStore.getSnapshot().projects, incoming);

  return (
    <section
      aria-labelledby="backup-heading"
      className="space-y-6 rounded-2xl border border-line bg-surface p-6 shadow-card md:p-8"
    >
      <div className="max-w-3xl space-y-2">
        <h2 id="backup-heading" className="type-h2 text-ink">
          Back up and restore
        </h2>
        <p className="text-ink-2">
          Your progress is saved in this browser only. A backup is a small file you keep: restore it
          in another browser or on another computer. It is made and read on your computer, never
          uploaded.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-semibold text-ink">Download a backup</h3>
          <p className="text-sm text-ink-2">
            Your projects, with their notes, milestones and links, and for every template you’ve
            started: checklist ticks, viva ratings, the guided demo record, readiness confirmations
            and your report draft. Typed viva answers are never saved, so they aren’t in it. The
            file contains your notes and report text, so keep it private.
          </p>
          <Button
            onClick={download}
            disabled={!hasSaved}
            icon={<Download aria-hidden="true" className="size-4" />}
          >
            Download backup
          </Button>
          {hasSaved ? null : <p className="type-meta">Nothing to back up yet.</p>}
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold text-ink">Restore a backup</h3>
          <p className="text-sm text-ink-2">
            Choose a file downloaded from this page. You’ll see what it contains before anything
            changes.
          </p>
          <label
            htmlFor={inputId}
            className="flex items-center gap-2 text-sm font-semibold text-ink"
          >
            <Upload aria-hidden="true" className="size-4" />
            Backup file (.json)
          </label>
          <input
            id={inputId}
            type="file"
            accept=".json,application/json"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => void choose(event)}
            className="block w-full text-sm text-ink-2 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-line-strong file:bg-surface file:px-3 file:py-2 file:font-semibold file:text-ink hover:file:bg-raised"
          />
          {error ? (
            <p id={errorId} role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Restore this backup?"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button onClick={restore}>Restore this backup</Button>
          </div>
        }
      >
        {pending ? (
          <div className="space-y-4 text-sm text-ink-2">
            <p>
              <span className="font-semibold text-ink break-all">{pending.fileName}</span>, exported
              on {formatIsoDate(pending.backup.exportedOn)}.
            </p>
            {incoming.length > 0 ? (
              <div className="rounded-xl border border-line p-3">
                <p className="font-semibold text-ink">Your projects</p>
                <p className="mt-1">
                  {pluralize(incoming.length, 'project')} in the file: {merge.added} new,{' '}
                  {merge.replaced} replacing a project with the same identity in this browser
                  {merge.replacedWithOlder > 0
                    ? ` (for ${merge.replacedWithOlder}, the copy in the file is older than this browser’s)`
                    : ''}
                  . Projects that are only in this browser are kept.
                </p>
              </div>
            ) : null}
            {pending.backup.profile ? (
              <p className="rounded-xl border border-line p-3">
                <span className="font-semibold text-ink">Your profile</span>: replaces the name,
                level and interests saved in this browser.
              </p>
            ) : null}
            {projects.length > 0 ? (
              <h3 className="font-semibold text-ink">Template progress</h3>
            ) : null}
            <ul className="space-y-3">
              {projects.map(([id, project]) => {
                const now = describeProgress(readProjectProgress(id));
                return (
                  <li key={id} className="rounded-xl border border-line p-3">
                    <p className="font-semibold text-ink">{getProjectById(id)?.name ?? id}</p>
                    <p className="mt-1">
                      <span className="font-medium text-ink">In the file: </span>
                      {describeProgress(project).join(' · ') || 'no saved progress'}
                    </p>
                    <p className="mt-0.5">
                      <span className="font-medium text-ink">In this browser now: </span>
                      {now.join(' · ') || 'no saved progress'}
                    </p>
                  </li>
                );
              })}
            </ul>
            {pending.unknownProjects.length > 0 ? (
              <p>
                Left out, because this version of CampusKit doesn’t have{' '}
                {pending.unknownProjects.length === 1 ? 'it' : 'them'}:{' '}
                {pending.unknownProjects.join(', ')}.
              </p>
            ) : null}
            <p className="font-medium text-ink">
              {projects.length > 0
                ? `Restoring replaces this browser’s progress for ${projects.length === 1 ? 'this template' : 'these templates'}; other templates aren’t changed. `
                : ''}
              {merge.replaced > 0
                ? 'Replaced projects can’t be brought back unless they are in another backup.'
                : ''}
            </p>
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}
