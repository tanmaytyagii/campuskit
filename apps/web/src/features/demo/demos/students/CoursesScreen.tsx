/** The course list (courses/list.html) and the add form, checked like validate_course(). */
import { BookOpen, Plus } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';

import { Button } from '../../../../components/ui/Button.tsx';
import { Dialog } from '../../../../components/ui/Dialog.tsx';
import { EmptyState } from '../../../../components/ui/EmptyState.tsx';
import { TextField } from '../../../../components/ui/Field.tsx';
import { cn } from '../../../../lib/cn.ts';
import {
  rowHeaderClasses,
  ScreenHeading,
  TableRegion,
  tableClasses,
  tdClasses,
  theadClasses,
  thClasses,
} from '../../ui.tsx';
import { createCourse, validateCourse, type CourseValues, type SmsState } from './model.ts';
import { focusFirstError, LastStatement, type Props } from './shared.tsx';

const FIELDS = ['code', 'title', 'credits', 'description'] as const;
type FieldName = (typeof FIELDS)[number];

export function CoursesScreen({ state, update }: Props) {
  const [adding, setAdding] = useState<number | null>(null);
  const courses = [...state.courses].sort((a, b) => (a.code < b.code ? -1 : 1));

  function save(values: CourseValues & { credits: number }): string | null {
    const run = (current: SmsState) => createCourse(current, values);
    const outcome = run(state);
    if ('error' in outcome) {
      update((current) => run(current).state, outcome.error.message);
      return outcome.error.message;
    }
    update((current) => run(current).state, `Added ${values.code} ${values.title}.`);
    setAdding(null);
    return null;
  }

  return (
    <div className="space-y-5">
      <ScreenHeading
        title="Courses"
        description="Each course with the number of students taking it: a LEFT JOIN with enrollments, grouped by course."
        actions={
          <Button
            size="sm"
            icon={<Plus aria-hidden="true" className="size-4" />}
            onClick={() => setAdding(Date.now())}
          >
            Add a course
          </Button>
        }
      />
      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen aria-hidden="true" className="size-6" />}
          title="No courses yet"
          actions={
            <Button size="sm" onClick={() => setAdding(Date.now())}>
              Add the first one
            </Button>
          }
        >
          Students are enrolled in courses, and attendance is marked for each course.
        </EmptyState>
      ) : (
        <TableRegion label="Courses">
          <table className={tableClasses}>
            <thead className={theadClasses}>
              <tr>
                <th scope="col" className={thClasses}>
                  Code
                </th>
                <th scope="col" className={thClasses}>
                  Title
                </th>
                <th scope="col" className={cn(thClasses, 'text-right')}>
                  Credits
                </th>
                <th scope="col" className={cn(thClasses, 'text-right')}>
                  Students
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {courses.map((course) => (
                <tr key={course.id}>
                  <th scope="row" className={cn(rowHeaderClasses, 'font-mono text-xs')}>
                    {course.code}
                  </th>
                  <td className={tdClasses}>
                    <span className="text-ink">{course.title}</span>
                    {course.description ? (
                      <span className="type-meta block">{course.description}</span>
                    ) : null}
                  </td>
                  <td className={cn(tdClasses, 'text-right')}>{course.credits}</td>
                  <td className={cn(tdClasses, 'text-right')}>
                    {state.enrollments.filter((row) => row.course_id === course.id).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableRegion>
      )}
      <LastStatement state={state} />
      {adding !== null ? (
        <CourseForm key={adding} onSubmit={save} onClose={() => setAdding(null)} />
      ) : null}
    </div>
  );
}

function CourseForm({
  onSubmit,
  onClose,
}: {
  /** Saves the checked values; returns the message when the code is already taken. */
  onSubmit: (values: CourseValues & { credits: number }) => string | null;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<FieldName, string>>({
    code: '',
    title: '',
    credits: '3',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const checked = validateCourse(values);
    const { credits } = checked.values;
    let found = checked.errors;
    if (Object.keys(found).length === 0 && credits !== null) {
      const refused = onSubmit({ ...checked.values, credits });
      if (!refused) return;
      found = { code: refused };
    }
    setErrors(found);
    focusFirstError(form, FIELDS, found);
  }

  const input = (name: FieldName) => ({
    name,
    autoComplete: 'off',
    value: values[name],
    error: errors[name] || undefined,
    onChange: (event: { target: { value: string } }) => {
      const { value } = event.target;
      setValues((current) => ({ ...current, [name]: value }));
      if (errors[name]) setErrors((current) => ({ ...current, [name]: '' }));
    },
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Add a course"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Add course
          </Button>
        </div>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-4">
        <TextField
          label="Course code"
          description="2 to 4 letters and 2 to 4 digits, for example CS101."
          {...input('code')}
        />
        <TextField label="Title" {...input('title')} />
        <TextField
          label="Credits"
          type="number"
          min={1}
          max={10}
          step={1}
          inputMode="numeric"
          {...input('credits')}
        />
        <TextField label="Description" optional {...input('description')} />
        <p className="type-meta">
          Checked with the rules of validate_course() in studentms/validation.py. The schema’s CHECK
          constraint also keeps credits from 1 to 10, and UNIQUE refuses a code already in use.
        </p>
      </form>
    </Dialog>
  );
}
