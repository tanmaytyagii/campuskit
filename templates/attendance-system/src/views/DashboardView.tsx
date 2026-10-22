import { EmptyState } from '../components/EmptyState';
import { PercentBar } from '../components/StatusBadge';
import type { AppConfig } from '../config';
import {
  attendancePercentage,
  countsForDate,
  overallCounts,
  recordedDates,
  summarizeClasses,
  summarizeStudents,
} from '../lib/attendance';
import { formatDateKey, todayKey } from '../lib/dates';
import { viewHref } from '../lib/useHashRoute';
import { useAttendance } from '../state/AttendanceContext';

export function DashboardView({ config }: { config: AppConfig }) {
  const { data } = useAttendance();
  const { students, attendance } = data;
  const today = todayKey();

  if (students.length === 0) {
    return (
      <EmptyState
        title="No students yet"
        action={
          <a className="button button-primary" href={viewHref('students')}>
            Add your first student
          </a>
        }
      >
        Add the students in your class, then mark attendance each day. You can also load the demo
        class from Settings.
      </EmptyState>
    );
  }

  const overall = overallCounts(students, attendance);
  const overallPercentage = attendancePercentage(overall);
  const summaries = summarizeStudents(students, attendance, config.attendanceThreshold);
  const below = summaries
    .filter((summary) => summary.belowThreshold)
    .sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0));
  const todayCounts = countsForDate(students, attendance, today);
  const days = recordedDates(attendance).length;
  const classes = summarizeClasses(students, attendance);

  return (
    <div className="stack">
      <section className="panel today" aria-labelledby="today-heading">
        <div>
          <h2 id="today-heading">Today, {formatDateKey(today, 'long')}</h2>
          {todayCounts.total === 0 ? (
            <p className="muted">Attendance for today hasn’t been marked yet.</p>
          ) : (
            <p>
              {todayCounts.present} present, {todayCounts.late} late, {todayCounts.absent} absent
              {todayCounts.unmarked > 0 ? `, ${todayCounts.unmarked} not marked` : ''}.
            </p>
          )}
        </div>
        <a className="button button-primary" href={viewHref('mark')}>
          {todayCounts.total === 0 ? 'Mark today’s attendance' : 'Review today’s attendance'}
        </a>
      </section>

      <section aria-label="Summary" className="stats">
        <div className="stat">
          <span className="stat-label">Students</span>
          <span className="stat-value">{students.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">School days recorded</span>
          <span className="stat-value">{days}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Overall attendance</span>
          <span className="stat-value">
            {overallPercentage === null ? '—' : `${overallPercentage.toFixed(1)}%`}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Below {config.attendanceThreshold}%</span>
          <span className={`stat-value${below.length > 0 ? ' stat-value-warn' : ''}`}>
            {below.length}
          </span>
        </div>
      </section>

      <div className="grid-2">
        <section className="panel" aria-labelledby="attention-heading">
          <h2 id="attention-heading">Below the {config.attendanceThreshold}% threshold</h2>
          {below.length === 0 ? (
            <p className="muted">
              {days === 0
                ? 'Mark attendance to see who needs attention.'
                : 'Every student is at or above the threshold.'}
            </p>
          ) : (
            <ul className="attention-list">
              {below.map((summary) => (
                <li key={summary.student.id}>
                  <span className="attention-name">
                    <strong>{summary.student.name}</strong>
                    <span className="muted">{summary.student.className}</span>
                  </span>
                  <PercentBar value={summary.percentage} threshold={config.attendanceThreshold} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel" aria-labelledby="classes-heading">
          <h2 id="classes-heading">Attendance by class</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Class</th>
                  <th scope="col">Students</th>
                  <th scope="col">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((item) => (
                  <tr key={item.className}>
                    <td>{item.className}</td>
                    <td>{item.studentCount}</td>
                    <td>
                      <PercentBar value={item.percentage} threshold={config.attendanceThreshold} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
