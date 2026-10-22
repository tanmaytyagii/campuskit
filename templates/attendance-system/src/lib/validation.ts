/** Form validation rules for students. */
import type { Student } from '../types';

export interface StudentInput {
  name: string;
  rollNumber: string;
  className: string;
}

export type StudentErrors = Partial<Record<keyof StudentInput, string>>;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function normalizeStudentInput(input: StudentInput): StudentInput {
  return {
    name: input.name.trim().replace(/\s+/g, ' '),
    rollNumber: input.rollNumber.trim(),
    className: input.className.trim().replace(/\s+/g, ' '),
  };
}

/**
 * Returns an error message per invalid field. `editingId` is the id of the
 * student being edited, so their own roll number doesn't count as a duplicate.
 */
export function validateStudentInput(
  raw: StudentInput,
  students: Student[],
  editingId?: string,
): StudentErrors {
  const input = normalizeStudentInput(raw);
  const errors: StudentErrors = {};

  if (input.name.length < 2) errors.name = 'Enter the student’s name (at least 2 characters).';
  else if (input.name.length > 60) errors.name = 'Keep the name under 60 characters.';
  else if (CONTROL_CHARACTERS.test(input.name))
    errors.name = 'Remove special control characters from the name.';

  if (input.rollNumber.length === 0) errors.rollNumber = 'Enter a roll number.';
  else if (input.rollNumber.length > 20)
    errors.rollNumber = 'Keep the roll number under 20 characters.';
  else if (!/^[\p{L}\p{N} ./_-]+$/u.test(input.rollNumber)) {
    errors.rollNumber = 'Use letters, numbers, spaces, ".", "/", "_" or "-".';
  }

  if (input.className.length === 0)
    errors.className = 'Enter a class or section, for example “Class 10-A”.';
  else if (input.className.length > 40)
    errors.className = 'Keep the class name under 40 characters.';

  if (!errors.rollNumber && !errors.className) {
    const duplicate = students.find(
      (student) =>
        student.id !== editingId &&
        student.className.toLocaleLowerCase() === input.className.toLocaleLowerCase() &&
        student.rollNumber.toLocaleLowerCase() === input.rollNumber.toLocaleLowerCase(),
    );
    if (duplicate)
      errors.rollNumber = `Roll number ${input.rollNumber} is already used by ${duplicate.name} in ${duplicate.className}.`;
  }
  return errors;
}
