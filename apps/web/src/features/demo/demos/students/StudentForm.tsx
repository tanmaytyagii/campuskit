/** The add and edit form (students/form.html), checked like validate_student() in validation.py. */
import { useId, useState, type FormEvent } from 'react';

import { Button } from '../../../../components/ui/Button.tsx';
import { Dialog } from '../../../../components/ui/Dialog.tsx';
import { SelectField, TextField } from '../../../../components/ui/Field.tsx';
import { STATUSES, validateStudent, type Student, type StudentValues } from './model.ts';
import { focusFirstError, fullName, STATUS_LABELS, today } from './shared.tsx';

const FIELDS = [
  'roll_number',
  'first_name',
  'last_name',
  'email',
  'class_name',
  'admission_date',
  'status',
] as const;
type FieldName = (typeof FIELDS)[number];
type FormValues = Record<FieldName, string>;

/** A value the database refused, reported against its field. */
export interface Refusal {
  field: string;
  message: string;
}

export function StudentForm({
  student,
  classes,
  onSubmit,
  onClose,
}: {
  student: Student | null;
  classes: string[];
  /** Saves the checked values; returns the refusal when a unique value is already taken. */
  onSubmit: (values: StudentValues) => Refusal | null;
  onClose: () => void;
}) {
  const [values, setValues] = useState<FormValues>(() => ({
    roll_number: student?.roll_number ?? '',
    first_name: student?.first_name ?? '',
    last_name: student?.last_name ?? '',
    email: student?.email ?? '',
    class_name: student?.class_name ?? '',
    admission_date: student?.admission_date ?? today(),
    status: student?.status ?? 'active',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formId = useId();
  const listId = useId();

  function change(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: '' }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const checked = validateStudent(values, today());
    let found = checked.errors;
    if (Object.keys(found).length === 0) {
      const refusal = onSubmit(checked.values);
      if (!refusal) return;
      found = { [refusal.field]: refusal.message };
    }
    setErrors(found);
    focusFirstError(form, FIELDS, found);
  }

  const text = (name: FieldName) => ({
    name,
    autoComplete: 'off',
    value: values[name],
    error: errors[name] || undefined,
    onChange: (event: { target: { value: string } }) => change(name, event.target.value),
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={student ? `Edit ${fullName(student)}` : 'Add a student'}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {student ? 'Save changes' : 'Add student'}
          </Button>
        </div>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-4">
        <TextField
          label="Roll number"
          description="Unique for each student, for example 24CS001."
          {...text('roll_number')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First name" {...text('first_name')} />
          <TextField label="Last name" {...text('last_name')} />
        </div>
        <TextField label="Email" type="email" optional {...text('email')} />
        <TextField
          label="Class or section"
          description="For example BCA 1-A."
          list={listId}
          {...text('class_name')}
        />
        <datalist id={listId}>
          {classes.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <TextField label="Admission date" type="date" max={today()} {...text('admission_date')} />
        <SelectField
          name="status"
          label="Status"
          value={values.status}
          error={errors.status || undefined}
          onChange={(event) => change('status', event.target.value)}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
        <p className="type-meta">
          Checked with the rules of validate_student() in the template’s studentms/validation.py.
          The database refuses a roll number or email that another student already has.
        </p>
      </form>
    </Dialog>
  );
}
