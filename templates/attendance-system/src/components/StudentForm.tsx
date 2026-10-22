/** Add or edit a student in a modal dialog. */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import {
  normalizeStudentInput,
  validateStudentInput,
  type StudentErrors,
  type StudentInput,
} from '../lib/validation';
import type { Student } from '../types';

interface StudentFormProps {
  open: boolean;
  /** The student to edit, or null to add a new one. */
  student: Student | null;
  students: Student[];
  classSuggestions: string[];
  onSave: (input: StudentInput) => void;
  onClose: () => void;
}

const EMPTY: StudentInput = { name: '', rollNumber: '', className: '' };

/**
 * The parent gives this component a new `key` every time it opens the form,
 * so React creates a fresh form whose fields start from `student`.
 */
export function StudentForm({
  open,
  student,
  students,
  classSuggestions,
  onSave,
  onClose,
}: StudentFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<StudentInput>(() =>
    student
      ? { name: student.name, rollNumber: student.rollNumber, className: student.className }
      : EMPTY,
  );
  const [errors, setErrors] = useState<StudentErrors>({});
  const titleId = useId();
  const listId = useId();
  const fieldId = useId();

  // Show or hide the native <dialog>, which handles focus and the Escape key.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function update(field: keyof StudentInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateStudentInput(values, students, student?.id);
    setErrors(found);
    const firstInvalid = (Object.keys(found) as Array<keyof StudentInput>)[0];
    if (firstInvalid) {
      document.getElementById(`${fieldId}-${firstInvalid}`)?.focus();
      return;
    }
    onSave(normalizeStudentInput(values));
  }

  const field = (
    name: keyof StudentInput,
    label: string,
    props: { autoComplete?: string; list?: string; placeholder?: string },
  ) => (
    <div className="field">
      <label htmlFor={`${fieldId}-${name}`}>{label}</label>
      <input
        id={`${fieldId}-${name}`}
        value={values[name]}
        onChange={(event) => update(name, event.target.value)}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `${fieldId}-${name}-error` : undefined}
        {...props}
      />
      {errors[name] ? (
        <p id={`${fieldId}-${name}-error`} className="field-error">
          {errors[name]}
        </p>
      ) : null}
    </div>
  );

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <form onSubmit={handleSubmit} noValidate>
        <h2 id={titleId} className="dialog-title">
          {student ? 'Edit student' : 'Add student'}
        </h2>
        {field('name', 'Full name', { autoComplete: 'off', placeholder: 'e.g. Priya Menon' })}
        {field('rollNumber', 'Roll number', { autoComplete: 'off', placeholder: 'e.g. 10A-07' })}
        {field('className', 'Class or section', {
          list: listId,
          autoComplete: 'off',
          placeholder: 'e.g. Class 10-A',
        })}
        <datalist id={listId}>
          {classSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <div className="dialog-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary">
            {student ? 'Save changes' : 'Add student'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
