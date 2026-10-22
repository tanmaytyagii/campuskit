import { useId, useState } from 'react';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { useNotify } from '../components/Notices';
import { PercentBar } from '../components/StatusBadge';
import { StudentForm } from '../components/StudentForm';
import type { AppConfig } from '../config';
import { classNames, matchesSearch, sortStudents, summarizeStudent } from '../lib/attendance';
import type { StudentInput } from '../lib/validation';
import { useAttendance } from '../state/AttendanceContext';
import type { Student } from '../types';

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `student-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function StudentsView({ config }: { config: AppConfig }) {
  const { data, dispatch } = useAttendance();
  const notify = useNotify();
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [editing, setEditing] = useState<Student | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  // Changes every time the form opens, so the form starts fresh (see StudentForm).
  const [formKey, setFormKey] = useState(0);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const searchId = useId();
  const classId = useId();

  const classes = classNames(data.students);
  const visible = sortStudents(data.students).filter(
    (student) =>
      (classFilter === 'all' || student.className === classFilter) && matchesSearch(student, query),
  );

  function openForm(student: Student | null) {
    setEditing(student);
    setFormKey((key) => key + 1);
    setFormOpen(true);
  }

  function handleSave(input: StudentInput) {
    if (editing) {
      dispatch({ type: 'student/update', student: { ...editing, ...input } });
      notify(`Saved changes to ${input.name}.`);
    } else {
      dispatch({
        type: 'student/add',
        student: { ...input, id: newId(), createdAt: new Date().toISOString() },
      });
      notify(`Added ${input.name}.`);
    }
    setFormOpen(false);
  }

  function confirmDelete() {
    if (!deleting) return;
    dispatch({ type: 'student/delete', studentId: deleting.id });
    notify(`Deleted ${deleting.name} and their attendance history.`);
    setDeleting(null);
  }

  const deletingMarks = deleting
    ? Object.values(data.attendance).filter((marks) => marks[deleting.id] !== undefined).length
    : 0;

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="field field-inline field-grow">
          <label htmlFor={searchId}>Search</label>
          <input
            id={searchId}
            type="search"
            placeholder="Name or roll number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
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
          className="button button-primary toolbar-end"
          onClick={() => openForm(null)}
        >
          Add student
        </button>
      </div>

      {data.students.length === 0 ? (
        <EmptyState
          title="Your roster is empty"
          action={
            <button type="button" className="button button-primary" onClick={() => openForm(null)}>
              Add student
            </button>
          }
        >
          Add each student with their roll number and class.
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState
          title="No students match your search"
          action={
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setQuery('');
                setClassFilter('all');
              }}
            >
              Clear search and filters
            </button>
          }
        >
          Try a different name, roll number or class.
        </EmptyState>
      ) : (
        <section className="panel" aria-label="Students">
          <p className="muted table-caption">
            Showing {visible.length} of {data.students.length} students
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Roll no.</th>
                  <th scope="col">Name</th>
                  <th scope="col">Class</th>
                  <th scope="col">Attendance</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((student) => {
                  const summary = summarizeStudent(
                    student,
                    data.attendance,
                    config.attendanceThreshold,
                  );
                  return (
                    <tr key={student.id}>
                      <td className="nowrap">{student.rollNumber}</td>
                      <td>{student.name}</td>
                      <td className="nowrap">{student.className}</td>
                      <td>
                        <PercentBar
                          value={summary.percentage}
                          threshold={config.attendanceThreshold}
                        />
                      </td>
                      <td className="row-actions">
                        <button
                          type="button"
                          className="button button-small button-secondary"
                          onClick={() => openForm(student)}
                          aria-label={`Edit ${student.name}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button-small button-ghost-danger"
                          onClick={() => setDeleting(student)}
                          aria-label={`Delete ${student.name}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <StudentForm
        key={formKey}
        open={formOpen}
        student={editing}
        students={data.students}
        classSuggestions={classes}
        onSave={handleSave}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `Delete ${deleting.name}?` : 'Delete student?'}
        message={`This also deletes ${deletingMarks} attendance ${deletingMarks === 1 ? 'mark' : 'marks'} for this student. It can’t be undone.`}
        confirmLabel="Delete student"
        tone="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
