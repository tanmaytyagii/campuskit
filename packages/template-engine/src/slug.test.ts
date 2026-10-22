import { describe, expect, it } from 'vitest';

import { deriveProjectSlug, slugify } from './slug.ts';

describe('slugify', () => {
  it.each([
    ['Student Attendance System', 'student-attendance-system'],
    ['  My   App!!  ', 'my-app'],
    ['Ünïcödé Café', 'unicode-cafe'],
    ['Riya & Sam', 'riya-and-sam'],
    ['C++ / Python 2026', 'c-python-2026'],
    ['---', ''],
  ])('turns %j into %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('caps the length without leaving a trailing hyphen', () => {
    const slug = slugify('a very long project name that keeps going and going and going forever');
    expect(slug.length).toBeLessThanOrEqual(48);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('deriveProjectSlug', () => {
  it('falls back to the template id for names without ASCII letters', () => {
    expect(deriveProjectSlug('उपस्थिति प्रबंधन', 'attendance-system')).toBe('attendance-system');
    expect(deriveProjectSlug('🎓📚', 'expense-tracker')).toBe('expense-tracker');
  });

  it('keeps the ASCII part of mixed-script names', () => {
    expect(deriveProjectSlug('Attendance उपस्थिति 2026', 'attendance-system')).toBe(
      'attendance-2026',
    );
  });

  it('avoids Windows device names', () => {
    expect(deriveProjectSlug('CON', 'x')).toBe('con-project');
    expect(deriveProjectSlug('Aux', 'x')).toBe('aux-project');
  });
});
