/**
 * The port's results in the shape `scripts/python/analyzer_parity.py` writes for the
 * template's Python code, so the two can be compared value by value: by the parity test
 * (analyzer.test.ts) and by `pnpm demo:compare` (scripts/compare-analyzer.ts).
 */
import {
  analyse,
  gradeDistribution,
  subjectGrades,
  validateResults,
  type StudentResult,
  type SubjectStatistics,
} from './analyzer.ts';

export function pythonStatistics(item: SubjectStatistics) {
  return {
    Subject: item.subject,
    Count: item.count,
    Missing: item.missing,
    Mean: item.mean,
    Median: item.median,
    'Std dev': item.stdDev,
    Min: item.min,
    Q1: item.q1,
    Q3: item.q3,
    Max: item.max,
    Passed: item.passed,
    'Pass rate %': item.passRate,
  };
}

export function pythonResult(item: StudentResult, hasClass: boolean) {
  return {
    'Student ID': item.id,
    Name: item.name,
    ...(hasClass ? { Class: item.className } : {}),
    Total: item.total,
    'Subjects scored': item.subjectsScored,
    Percentage: item.percentage,
    Grade: item.grade,
    Result: item.result,
    Rank: item.rank,
    'Below pass mark in': item.belowPassMarkIn,
  };
}

export function pythonDistribution(items: ReturnType<typeof gradeDistribution>) {
  return items.map((item) => ({
    Grade: item.grade,
    Students: item.students,
    'Share %': item.share,
  }));
}

/** Everything the Python script records for one CSV file (without its name and text). */
export function pythonShape(csv: string, passMark: number, maxMarks: number) {
  const validation = validateResults(csv, maxMarks);
  // Python keeps no subjects or rows unless the file is valid.
  const valid = validation.ok && validation.rows !== null;
  const rows = valid ? (validation.rows ?? []) : [];
  const { subjects, hasClass } = validation;
  const analysis = valid ? analyse(validation, passMark, maxMarks) : null;
  return {
    validation: {
      ok: validation.ok,
      errors: validation.errors,
      warnings: validation.warnings,
      subjects: valid ? subjects : [],
      rows: valid
        ? rows.map((row) => ({
            'Student ID': row.id,
            Name: row.name,
            ...(hasClass ? { Class: row.className } : {}),
            ...Object.fromEntries(subjects.map((subject, column) => [subject, row.scores[column]])),
          }))
        : null,
    },
    analysis: analysis
      ? {
          statistics: analysis.statistics.map(pythonStatistics),
          results: analysis.results.map((item) => pythonResult(item, hasClass)),
          overview: {
            students: analysis.summary.students,
            subjects: analysis.summary.subjects,
            average_percentage: analysis.summary.averagePercentage,
            median_percentage: analysis.summary.medianPercentage,
            passed: analysis.summary.passed,
            failed: analysis.summary.failed,
            incomplete: analysis.summary.incomplete,
            highest_subject: analysis.summary.highestSubject,
            lowest_subject: analysis.summary.lowestSubject,
          },
          gradeDistribution: pythonDistribution(analysis.distribution),
          subjectGrades: Object.fromEntries(
            subjects.map((subject, column) => [
              subject,
              pythonDistribution(
                gradeDistribution(subjectGrades(rows, column, passMark, maxMarks)),
              ),
            ]),
          ),
          missing: analysis.missing.map((item) => ({
            Subject: item.subject,
            Missing: item.missing,
            'Missing %': item.share,
          })),
          studentsWithMissing: analysis.studentsWithMissing.map((item) => ({
            'Student ID': item.id,
            Name: item.name,
            'Missing subjects': item.missingSubjects,
          })),
          classes:
            analysis.classes?.map((item) => ({
              Class: item.className,
              Students: item.students,
              'Average %': item.averagePercentage,
              Passed: item.passed,
              'Pass rate %': item.passRate,
            })) ?? null,
          explanations: analysis.explanations,
        }
      : null,
  };
}
