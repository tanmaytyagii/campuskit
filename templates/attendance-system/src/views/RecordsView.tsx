import { useId, useState } from 'react';

import { EmptyState } from '../components/EmptyState';
import { useNotify } from '../components/Notices';
import { PercentBar, StatusBadge } from '../components/StatusBadge';
import type { AppConfig } from '../config';
import {
  classNames,
  isInRange,
  matchesSearch,
  sortStudents,
  summarizeStudent,
  type DateRange,
} from '../lib/attendance';
import { downloadTextFile, toCsv } from '../lib/csv';
import { formatDateKey } from '../lib/dates';
import { viewHref } from '../lib/useHashRoute';
import { useAttendance } from '../state/AttendanceContext';
import { ATTENDANCE_STATUSES, STATUS_LABELS, type AttendanceStatus, type Student } from '../types';

interface RecordRow {
  date: string;
  student: Student;
  status: AttendanceStatus;
}

const MAX_ROWS = 300;

export function RecordsView({ config }: { config: AppConfig }) {
  const { data } = useAttendance();
  const notify = useNotify();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [query, setQuery] = useState('');
  const ids = { from: useId(), to: useId(), cls: useId(), status: useId(), search: useId() };

  const rangeError = from && to && from > to ? 'The start date is after the end date.' : null;
  const range: DateRange = rangeError ? {} : { ...(from ? { from } : {}), ...(to ? { to } : {}) };

  const students = sortStudents(data.students).filter(
    (student) =>
      (classFilter === 'all' || student.className === classFilter) && matchesSearch(student, query),
  );

  const rows: RecordRow[] = [];
  const dates = Object.keys(data.attendance)
    .filter((date) => isInRange(date, range))
    .sort((a, b) => (a < b ? 1 : -1));
  for (const date of dates) {
    const marks = data.attendance[date] ?? {};
    for (const student of students) {
      const status = marks[student.id];
      if (status && (statusFilter === 'all' || status === statusFilter))
        rows.push({ date, student, status });
    }
  }

  const filtersActive = Boolean(
    from || to || query || classFilter !== 'all' || statusFilter !== 'all',
  );

  function resetFilters() {
    setFrom('');
    setTo('');
    setClassFilter('all');
    setStatusFilter('all');
    setQuery('');
  }

  function exportCsv() {
    const csv = toCsv(
      ['Date', 'Roll number', 'Name', 'Class', 'Status'],
      rows.map((row) => [
        row.date,
        row.student.rollNumber,
        row.student.name,
        row.student.className,
        STATUS_LABELS[row.status],
      ]),
    );
    downloadTextFile('attendance-records.csv', csv, 'text/csv');
    notify(
      `Exported ${rows.length} ${rows.length === 1 ? 'record' : 'records'} to attendance-records.csv.`,
    );
  }

  if (Object.keys(data.attendance).length === 0) {
    return (
      <EmptyState
        title="No attendance recorded yet"
        action={
          <a className="button button-primary" href={viewHref('mark')}>
            Mark attendance
          </a>
        }
      >
        Records appear here after you save attendance for a date.
      </EmptyState>
    );
  }

  return (
    <div className="stack">
      <fieldset className="panel filters">
        <legend>Filter records</legend>
        <div className="filters-grid">
          <div className="field">
            <label htmlFor={ids.from}>From</label>
            <input
              id={ids.from}
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={ids.to}>To</label>
            <input
              id={ids.to}
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              aria-invalid={rangeError ? true : undefined}
              aria-describedby={rangeError ? `${ids.to}-error` : undefined}
            />
            {rangeError ? (
              <p id={`${ids.to}-error`} className="field-error">
                {rangeError}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor={ids.cls}>Class</label>
            <select
              id={ids.cls}
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
            >
              <option value="all">All classes</option>
              {classNames(data.students).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={ids.status}>Status</label>
            <select
              id={ids.status}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | AttendanceStatus)}
            >
              <option value="all">All statuses</option>
              {ATTENDANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={ids.search}>Student</label>
            <input
              id={ids.search}
              type="search"
              placeholder="Name or roll number"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="filters-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={resetFilters}
            disabled={!filtersActive}
          >
            Reset filters
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            Export CSV
          </button>
        </div>
      </fieldset>

      {rows.length === 0 ? (
        <EmptyState
          title="No records match these filters"
          action={
            <button type="button" className="button button-secondary" onClick={resetFilters}>
              Reset filters
            </button>
          }
        >
          Widen the date range or clear the class, status or student filters.
        </EmptyState>
      ) : (
        <>
          <section className="panel" aria-labelledby="summary-heading">
            <h2 id="summary-heading">Summary for the selected period</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Class</th>
                    <th scope="col">Present</th>
                    <th scope="col">Late</th>
                    <th scope="col">Absent</th>
                    <th scope="col">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const summary = summarizeStudent(
                      student,
                      data.attendance,
                      config.attendanceThreshold,
                      range,
                    );
                    if (summary.total === 0) return null;
                    return (
                      <tr key={student.id}>
                        <td>{student.name}</td>
                        <td className="nowrap">{student.className}</td>
                        <td>{summary.present}</td>
                        <td>{summary.late}</td>
                        <td>{summary.absent}</td>
                        <td>
                          <PercentBar
                            value={summary.percentage}
                            threshold={config.attendanceThreshold}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel" aria-labelledby="records-heading">
            <h2 id="records-heading">Daily records</h2>
            <p className="muted table-caption">
              {rows.length > MAX_ROWS
                ? `Showing the latest ${MAX_ROWS} of ${rows.length} records. Export CSV to get all of them.`
                : `${rows.length} ${rows.length === 1 ? 'record' : 'records'}`}
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Roll no.</th>
                    <th scope="col">Name</th>
                    <th scope="col">Class</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, MAX_ROWS).map((row) => (
                    <tr key={`${row.date}-${row.student.id}`}>
                      <td className="nowrap">{formatDateKey(row.date)}</td>
                      <td className="nowrap">{row.student.rollNumber}</td>
                      <td>{row.student.name}</td>
                      <td className="nowrap">{row.student.className}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
