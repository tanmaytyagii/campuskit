import { useId, useRef, useState, type ChangeEvent } from 'react';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { useNotify } from '../components/Notices';
import { THEMES, type AppConfig } from '../config';
import { downloadTextFile } from '../lib/csv';
import { createDemoData, createEmptyData } from '../lib/demo-data';
import { todayKey } from '../lib/dates';
import { STORAGE_KEY, validateData } from '../lib/storage';
import { useAttendance } from '../state/AttendanceContext';
import type { AttendanceData } from '../types';

type PendingAction =
  { kind: 'demo' } | { kind: 'clear' } | { kind: 'import'; data: AttendanceData; fileName: string };

export function SettingsView({ config }: { config: AppConfig }) {
  const { data, dispatch } = useAttendance();
  const notify = useNotify();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const importId = useId();

  const markCount = Object.values(data.attendance).reduce(
    (sum, marks) => sum + Object.keys(marks).length,
    0,
  );

  function exportBackup() {
    const fileName = `attendance-backup-${todayKey()}.json`;
    downloadTextFile(fileName, `${JSON.stringify(data, null, 2)}\n`, 'application/json');
    notify(`Downloaded ${fileName}.`);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setImportError('That file is larger than 5 MB. Choose a backup exported from this app.');
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const result = validateData(parsed);
      if (typeof result === 'string') setImportError(`That file can’t be imported: ${result}.`);
      else setPending({ kind: 'import', data: result, fileName: file.name });
    } catch {
      setImportError('That file is not valid JSON. Choose a backup exported from this app.');
    }
  }

  function confirmPending() {
    if (!pending) return;
    if (pending.kind === 'demo') {
      dispatch({ type: 'data/replace', data: createDemoData() });
      notify('Loaded the demo class.');
    } else if (pending.kind === 'clear') {
      dispatch({ type: 'data/replace', data: createEmptyData() });
      notify('Deleted all students and attendance.');
    } else {
      dispatch({ type: 'data/replace', data: pending.data });
      notify(`Imported ${pending.fileName}.`);
    }
    setPending(null);
  }

  const dialogText: Record<
    PendingAction['kind'],
    { title: string; message: string; confirm: string }
  > = {
    demo: {
      title: 'Replace your data with the demo class?',
      message:
        'Your current students and attendance will be replaced. Export a backup first if you want to keep them.',
      confirm: 'Load demo data',
    },
    clear: {
      title: 'Delete all data?',
      message:
        'Every student and attendance mark will be deleted from this browser. This can’t be undone.',
      confirm: 'Delete all data',
    },
    import: {
      title: 'Replace your data with this backup?',
      message:
        'Your current students and attendance will be replaced by the contents of the backup file.',
      confirm: 'Import backup',
    },
  };
  const text = pending ? dialogText[pending.kind] : null;

  return (
    <div className="stack">
      <section className="panel" aria-labelledby="config-heading">
        <h2 id="config-heading">App configuration</h2>
        <p className="muted">
          These values come from <code>src/app.config.json</code>. Edit that file and restart the
          app to change them.
        </p>
        <dl className="details">
          <div>
            <dt>App name</dt>
            <dd>{config.appName}</dd>
          </div>
          <div>
            <dt>Institution</dt>
            <dd>{config.institutionName || <span className="muted">Not set</span>}</dd>
          </div>
          <div>
            <dt>Attendance threshold</dt>
            <dd>{config.attendanceThreshold}%</dd>
          </div>
          <div>
            <dt>Accent colour</dt>
            <dd>
              <span
                className="swatch"
                style={{ background: THEMES[config.theme].accent }}
                aria-hidden="true"
              />{' '}
              {config.theme}
            </dd>
          </div>
          <div>
            <dt>Demo data on first run</dt>
            <dd>{config.seedDemoData ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </section>

      <section className="panel" aria-labelledby="data-heading">
        <h2 id="data-heading">Your data</h2>
        <p>
          {data.students.length} {data.students.length === 1 ? 'student' : 'students'} and{' '}
          {markCount} attendance {markCount === 1 ? 'mark' : 'marks'} are saved in this browser
          only, under the localStorage key <code>{STORAGE_KEY}</code>. Nothing is uploaded anywhere.
        </p>
        <div className="button-row">
          <button type="button" className="button button-secondary" onClick={exportBackup}>
            Export backup (JSON)
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => fileInput.current?.click()}
          >
            Import backup
          </button>
          <input
            ref={fileInput}
            id={importId}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            tabIndex={-1}
            aria-label="Choose a backup file to import"
            onChange={handleImport}
          />
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setPending({ kind: 'demo' })}
          >
            Load demo data
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={() => setPending({ kind: 'clear' })}
          >
            Delete all data
          </button>
        </div>
        {importError ? (
          <p className="field-error" role="alert">
            {importError}
          </p>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="reset-heading">
        <h2 id="reset-heading">Resetting data without the app</h2>
        <p>
          If the app won’t open, you can remove its saved data from your browser’s developer tools:
          open DevTools (F12), go to <strong>Application</strong> (Chrome, Edge) or{' '}
          <strong>Storage</strong> (Firefox), choose <strong>Local Storage</strong>, select this
          site and delete the <code>{STORAGE_KEY}</code> entry. Reload the page afterwards.
        </p>
      </section>

      <ConfirmDialog
        open={pending !== null}
        title={text?.title ?? ''}
        message={text?.message ?? ''}
        confirmLabel={text?.confirm ?? 'Confirm'}
        tone={pending?.kind === 'clear' ? 'danger' : 'default'}
        onCancel={() => setPending(null)}
        onConfirm={confirmPending}
      />
    </div>
  );
}
