import { describe, expect, it } from 'vitest';

import {
  getDefaultValues,
  OptionValidationError,
  resolveValues,
  safeResolveValues,
} from './options.ts';
import { sampleSpec } from './test-fixtures.ts';

describe('resolveValues', () => {
  it('fills in defaults and derives the project slug', () => {
    const values = resolveValues(sampleSpec, {}, 'demo-planner');
    expect(values.options).toEqual(getDefaultValues(sampleSpec));
    expect(values.projectSlug).toBe('demo-planner');
  });

  it('trims and NFC-normalises text', () => {
    const decomposed = 'Café Club'; // "é" written as e + combining accent
    const values = resolveValues(sampleSpec, { projectName: `   ${decomposed}  ` }, 'demo-planner');
    expect(values.options.projectName).toBe('Café Club');
    expect(values.projectSlug).toBe('cafe-club');
  });

  it('accepts special characters and Unicode in names', () => {
    const name = `Riya & Sam's <Attendance> "App" — उपस्थिति`;
    const values = resolveValues(sampleSpec, { projectName: name }, 'demo-planner');
    expect(values.options.projectName).toBe(name);
  });

  it.each([
    [{ projectName: '' }, 'projectName', /required/],
    [{ projectName: 'ab' }, 'projectName', /at least 3/],
    [{ projectName: 'x'.repeat(61) }, 'projectName', /at most 60/],
    [{ projectName: 'Line\nbreak' }, 'projectName', /line breaks/],
    [{ projectName: 'Evil\u202eeman' }, 'projectName', /control characters/],
    [{ passMark: 101 }, 'passMark', /100 or less/],
    [{ passMark: 40.5 }, 'passMark', /whole number/],
    [{ passMark: '40' }, 'passMark', /number/],
    [{ theme: 'neon' }, 'theme', /Choose one of/],
    [{ demoData: 'yes' }, 'demoData', /on or off/],
    [{ unknownOption: 1 }, 'unknownOption', /does not support/],
  ])('rejects %j', (input, field, message) => {
    const result = safeResolveValues(sampleSpec, input, 'demo-planner');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[field]).toMatch(message);
  });

  it('allows optional text to be empty', () => {
    const values = resolveValues(sampleSpec, { institutionName: '   ' }, 'demo-planner');
    expect(values.options.institutionName).toBe('');
  });

  it('throws OptionValidationError with field errors', () => {
    expect(() => resolveValues(sampleSpec, { projectName: '' }, 'demo-planner')).toThrow(
      OptionValidationError,
    );
  });
});
