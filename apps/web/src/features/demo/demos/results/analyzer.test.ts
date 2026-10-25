/**
 * The browser port of the result analyzer must give exactly what the
 * template's Python code gives. analyzer.fixture.json is that code's output
 * (written by `pnpm demo:fixtures`) for the template's two sample files and a
 * set of edge cases; every message, number and sentence is compared here.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { analyse, gradeDistribution, subjectGrades, validateResults } from './analyzer.ts';
import fixture from './analyzer.fixture.json';
import { pythonDistribution, pythonResult, pythonShape, pythonStatistics } from './parity.ts';
import { formatFixed, formatGeneral, roundLikeNumpy } from './pyformat.ts';

const templateDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../../../templates/student-result-analyzer',
);

describe('result analyzer port', () => {
  it('was compared with the current Python code and sample data', () => {
    for (const [file, hash] of Object.entries(fixture.sources)) {
      const actual = createHash('sha256')
        .update(readFileSync(join(templateDir, file)))
        .digest('hex');
      expect(
        actual,
        `${file} changed since analyzer.fixture.json was written: run pnpm demo:fixtures, then update the port until this test passes`,
      ).toBe(hash);
    }
  });

  it('uses the template’s default pass mark and maximum marks', () => {
    const config = JSON.parse(readFileSync(join(templateDir, 'app_config.json'), 'utf8')) as {
      pass_mark: number;
      max_marks: number;
    };
    expect([fixture.passMark, fixture.maxMarks]).toEqual([config.pass_mark, config.max_marks]);
  });

  for (const testCase of fixture.cases) {
    it(`matches the Python output for ${testCase.name}`, () => {
      const validation = validateResults(testCase.csv, fixture.maxMarks);
      expect(validation.errors).toEqual(testCase.validation.errors);
      expect(validation.warnings).toEqual(testCase.validation.warnings);
      expect(validation.ok).toBe(testCase.validation.ok);

      const analysis = analyse(validation, fixture.passMark, fixture.maxMarks);
      const expected = testCase.analysis;
      if (!expected) {
        expect(analysis).toBeNull();
        return;
      }
      if (!analysis || !validation.rows) throw new Error('expected an analysis');
      const { subjects, hasClass, rows } = validation;
      expect(subjects).toEqual(testCase.validation.subjects);
      expect(
        rows.map((row) => ({
          'Student ID': row.id,
          Name: row.name,
          ...(hasClass ? { Class: row.className } : {}),
          ...Object.fromEntries(subjects.map((subject, column) => [subject, row.scores[column]])),
        })),
      ).toEqual(testCase.validation.rows);

      expect(analysis.statistics.map(pythonStatistics)).toEqual(expected.statistics);
      expect(analysis.results.map((item) => pythonResult(item, hasClass))).toEqual(
        expected.results,
      );
      expect({
        students: analysis.summary.students,
        subjects: analysis.summary.subjects,
        average_percentage: analysis.summary.averagePercentage,
        median_percentage: analysis.summary.medianPercentage,
        passed: analysis.summary.passed,
        failed: analysis.summary.failed,
        incomplete: analysis.summary.incomplete,
        highest_subject: analysis.summary.highestSubject,
        lowest_subject: analysis.summary.lowestSubject,
      }).toEqual(expected.overview);
      expect(pythonDistribution(analysis.distribution)).toEqual(expected.gradeDistribution);
      expect(
        Object.fromEntries(
          subjects.map((subject, column) => [
            subject,
            pythonDistribution(
              gradeDistribution(subjectGrades(rows, column, fixture.passMark, fixture.maxMarks)),
            ),
          ]),
        ),
      ).toEqual(expected.subjectGrades);
      expect(
        analysis.missing.map((item) => ({
          Subject: item.subject,
          Missing: item.missing,
          'Missing %': item.share,
        })),
      ).toEqual(expected.missing);
      expect(
        analysis.studentsWithMissing.map((item) => ({
          'Student ID': item.id,
          Name: item.name,
          'Missing subjects': item.missingSubjects,
        })),
      ).toEqual(expected.studentsWithMissing);
      expect(
        analysis.classes?.map((item) => ({
          Class: item.className,
          Students: item.students,
          'Average %': item.averagePercentage,
          Passed: item.passed,
          'Pass rate %': item.passRate,
        })) ?? null,
      ).toEqual(expected.classes);
      expect(analysis.explanations).toEqual(expected.explanations);
    });
  }

  // pnpm demo:compare checks generated files with pythonShape; it must reproduce every case.
  it('puts the port’s results in the same shape as the Python script', () => {
    for (const { name, csv, validation, analysis } of fixture.cases) {
      expect(pythonShape(csv, fixture.passMark, fixture.maxMarks), name).toEqual({
        validation,
        analysis,
      });
    }
  });
});

describe('Python-compatible number formatting', () => {
  it('rounds ties to even from the exact binary value, as Python does', () => {
    expect(formatFixed(62.25, 1)).toBe('62.2');
    expect(formatFixed(62.35, 1)).toBe('62.4'); // 62.35 is stored as 62.350000000000001…
    expect(formatFixed(0.125, 2)).toBe('0.12');
    expect(formatFixed(66.375, 1)).toBe('66.4');
    expect(formatFixed(7.5, 0)).toBe('8');
    expect(formatFixed(6.5, 0)).toBe('6');
    expect(formatFixed(Number.NaN, 1)).toBe('nan');
  });

  it('formats values like Python’s {:g}', () => {
    expect(formatGeneral(105)).toBe('105');
    expect(formatGeneral(-4)).toBe('-4');
    expect(formatGeneral(12.5)).toBe('12.5');
    expect(formatGeneral(1234565)).toBe('1.23456e+06');
    expect(formatGeneral(0.0001234)).toBe('0.0001234');
    expect(formatGeneral(0.00001)).toBe('1e-05');
    expect(formatGeneral(Number.POSITIVE_INFINITY)).toBe('inf');
  });

  it('rounds like numpy (scale, round half to even, divide)', () => {
    expect(roundLikeNumpy(62.125, 2)).toBe(62.12);
    // 2.675 × 100 rounds to exactly 267.5, which then rounds to the even 268 (numpy prints 2.68).
    expect(roundLikeNumpy(2.675, 2)).toBe(2.68);
    expect(roundLikeNumpy(87.25, 2)).toBe(87.25);
  });
});
