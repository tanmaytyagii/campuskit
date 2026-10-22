import { useId, useMemo, useState } from 'react';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { useNotify } from '../components/Notices';
import { classNames, sortStudents } from '../lib/attendance';
import { formatDateKey, isValidDateKey, todayKey } from '../lib/dates';
import { viewHref } from '../lib/useHashRoute';
import { useAttendance } from '../state/AttendanceContext';
import { ATTENDANCE_STATUSES, STATUS_LABELS, type AttendanceStatus } from '../types';

type Draft = Record<string, AttendanceStatus>;

export function MarkAttendanceView() {
  const { data, dispatch } = useAttendance();
  const notify = useNotify();
  const today = todayKey();
  const [date, setDate] = useState(today);
  const [dateInput, setDateInput] = useState(today);
  const [classFilter, setClassFilter] = useState('all');
  const [draft, setDraft] = useState<Draft>(() => ({ ...(data.attendance[today] ?? {}) }));
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const dateId = useId();
  const classId = useId();

  const saved = data.attendance[date] ?? {};
  const classes = classNames(data.students);
  const visible = useMemo(
    () =>
      sortStudents(data.students).filter(
        (student) => classFilter === 'all' || student.className === classFilter,
      ),
    [data.students, classFilter],
  );

  const changedIds = visible
    .filter((student) => draft[student.id] !== saved[student.id])
    .map((student) => student.id);
  const hasChanges = changedIds.length > 0;
  const markedCount = visible.filter((student) => draft[student.id]).length;
  const dateError = !isValidDateKey(dateInput)
    ? 'Enter a valid date.'
    : dateInput > today
      ? 'Attendance can’t be marked for a future date.'
      : null;

  function switchDate(next: string) {
    setDate(next);
    setDraft({ ...(data.attendance[next] ?? {}) });
  }

  function requestDate(next: string) {
    setDateInput(next);
    if (!isValidDateKey(next) || next > today || next === date) return;
    if (hasChanges) setPendingDate(next);
    else switchDate(next);
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    setDraft((current) => ({ ...current, [studentId]: status }));
  }

  function markAllPresent() {
    setDraft((current) => {
      const next = { ...current };
      for (const student of visible) next[student.id] = 'present';
      return next;
    });
  }

  function save() {
    const marks: Draft = {};
    for (const student of visible) {
      const status = draft[student.id];
      if (status) marks[student.id] = status;
    }
    dispatch({ type: 'attendance/save', date, marks });
    notify(`Attendance saved for ${formatDateKey(date)}.`);
  }

  if (data.students.length === 0) {
    return (
      <EmptyState
        title="Add students before marking attendance"
        action={
          <a className="button button-primary" href={viewHref('students')}>
            Go to Students
          </a>
        }
      >
        Attendance is marked for the students in your roster.
      </EmptyState>
    );
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="field field-inline">
          <label htmlFor={dateId}>Date</label>
          <input
            id={dateId}
            type="date"
            value={dateInput}
            max={today}
            onChange={(event) => requestDate(event.target.value)}
            aria-invalid={dateError ? true : undefined}
            aria-describedby={dateError ? `${dateId}-error` : undefined}
          />
          {dateError ? (
            <p id={`${dateId}-error`} className="field-error">
              {dateError}
            </p>
          ) : null}
        </div>
        <div className="field field-inline">
          <label htmlFor={classId}>Class</label>
          <select
            id={classId}
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
          >
            <option value="all">All classes</option>
            {classes.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="button button-secondary toolbar-end"
          onClick={markAllPresent}
        >
          Mark all present
        </button>
      </div>

      <p className="muted" aria-live="polite">
        {Object.keys(saved).length > 0
          ? `Editing saved attendance for ${formatDateKey(date, 'long')}.`
          : `No attendance saved yet for ${formatDateKey(date, 'long')}.`}
      </p>

      <ul className="mark-list">
        {visible.map((student) => (
          <li key={student.id} className="mark-row">
            <fieldset>
              <legend>
                <span className="mark-name">{student.name}</span>
                <span className="muted mark-meta">
                  {student.rollNumber}, {student.className}
                </span>
              </legend>
              <div className="segmented">
                {ATTENDANCE_STATUSES.map((status) => (
                  <label key={status} className={`segment segment-${status}`}>
                    <input
                      type="radio"
                      name={`status-${student.id}`}
                      value={status}
                      checked={draft[student.id] === status}
                      onChange={() => setStatus(student.id, status)}
                    />
                    <span>{STATUS_LABELS[status]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ul>

      <div className="save-bar">
        <span className="save-bar-status">
          <span>
            {markedCount} of {visible.length} marked
          </span>
          {hasChanges ? <strong className="unsaved">Unsaved changes</strong> : null}
        </span>
        <div className="save-bar-actions">
          <button
            type="button"
            className="button button-secondary"
            disabled={!hasChanges}
            onClick={() => setDraft({ ...saved })}
          >
            Undo changes
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={!hasChanges}
            onClick={save}
          >
            Save attendance
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDate !== null}
        title="Discard unsaved changes?"
        message={`You have unsaved marks for ${formatDateKey(date)}. Switching to another date will discard them.`}
        confirmLabel="Discard and switch"
        tone="danger"
        onCancel={() => {
          setPendingDate(null);
          setDateInput(date);
        }}
        onConfirm={() => {
          if (pendingDate) switchDate(pendingDate);
          setPendingDate(null);
        }}
      />
    </div>
  );
}
