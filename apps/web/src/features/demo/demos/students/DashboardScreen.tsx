/** The template's home page (dashboard.html): figures that are all SQL queries over the tables. */
import { Database } from 'lucide-react';

import { Button } from '../../../../components/ui/Button.tsx';
import { EmptyState } from '../../../../components/ui/EmptyState.tsx';
import { cn } from '../../../../lib/cn.ts';
import {
  highlightClasses,
  rowHeaderClasses,
  ScreenHeading,
  StatGrid,
  StatTile,
  TableRegion,
  tableClasses,
  tdClasses,
  theadClasses,
  thClasses,
} from '../../ui.tsx';
import { statistics } from './model.ts';
import { fullName, rateLabel, today, type Props } from './shared.tsx';

export function DashboardScreen({ state, highlight, selectFeature }: Props) {
  const stats = statistics(state, today());
  return (
    <div className="space-y-6">
      <ScreenHeading
        title="Dashboard"
        description="Each figure is calculated by a SQL query (COUNT, SUM, GROUP BY) when the page opens, so it always agrees with the tables."
      />
      <div className={highlightClasses(highlight === 'dashboard-figures')}>
        <StatGrid>
          <StatTile
            label="Students"
            value={stats.students}
            detail={`${stats.by_status.active} active`}
          />
          <StatTile label="Courses" value={stats.courses} />
          <StatTile label="Enrollments" value={stats.enrollments} />
          <StatTile
            label="Attendance, last 30 days"
            value={
              stats.attendance_rate === null
                ? 'No marks yet'
                : `${stats.attendance_rate.toFixed(1)}%`
            }
            detail={`${stats.marks_last_30_days} marks`}
          />
        </StatGrid>
      </div>

      {stats.students === 0 && stats.courses === 0 ? (
        <EmptyState
          icon={<Database aria-hidden="true" className="size-6" />}
          title="No data yet"
          actions={
            <>
              <Button size="sm" onClick={() => selectFeature('courses')}>
                Add a course
              </Button>
              <Button size="sm" variant="secondary" onClick={() => selectFeature('students')}>
                Add a student
              </Button>
            </>
          }
        >
          This is how the app starts with sample data turned off. Start by adding a course, then add
          students and enroll them.
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="sms-newest-heading" className="space-y-3">
            <h3 id="sms-newest-heading" className="font-semibold text-ink">
              Newest students
            </h3>
            {stats.newest.length > 0 ? (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {stats.newest.map((student) => (
                  <li key={student.id} className="px-4 py-2.5 text-sm">
                    <span className="font-semibold text-ink">{fullName(student)}</span>{' '}
                    <span className="whitespace-nowrap text-ink-3">
                      {student.roll_number} · {student.class_name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-2">No students yet.</p>
            )}
            <Button size="sm" variant="ghost" onClick={() => selectFeature('students')}>
              All students
            </Button>
          </section>
          <section aria-labelledby="sms-courses-heading" className="space-y-3">
            <h3 id="sms-courses-heading" className="font-semibold text-ink">
              Attendance by course
            </h3>
            <TableRegion label="Attendance by course table">
              <table className={tableClasses}>
                <caption className="sr-only">Students and attendance in each course</caption>
                <thead className={theadClasses}>
                  <tr>
                    <th scope="col" className={thClasses}>
                      Course
                    </th>
                    <th scope="col" className={cn(thClasses, 'text-right')}>
                      Students
                    </th>
                    <th scope="col" className={cn(thClasses, 'text-right')}>
                      Attendance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {stats.by_course.length > 0 ? (
                    stats.by_course.map((course) => (
                      <tr key={course.id}>
                        <th scope="row" className={rowHeaderClasses}>
                          {course.code}{' '}
                          <span className="font-normal text-ink-3">{course.title}</span>
                        </th>
                        <td className={cn(tdClasses, 'text-right')}>{course.students}</td>
                        <td className={cn(tdClasses, 'text-right whitespace-nowrap')}>
                          {rateLabel(course.attended, course.marked)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className={tdClasses}>
                        No courses yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableRegion>
          </section>
        </div>
      )}
    </div>
  );
}
