import type { DemoDefinition } from '../../types.ts';

export const resultsDemo: DemoDefinition = {
  projectId: 'student-result-analyzer',
  appName: 'Student Result Analyzer',
  appSubtitle: 'Riverside Public School',
  fidelity: 'browser-port',
  summary:
    'Inspect a class’s marks, see how missing and invalid values are handled, and explore the statistics, grades and plain-language explanations the analyzer produces.',
  notice:
    'A browser version of the analyzer, written in TypeScript for this page. The real project is a Python app built with pandas and Streamlit, and your browser does not run Python. The validation messages, statistics, grades and explanations are checked against results produced by the real Python code.',
  runs: {
    files: [
      'analyzer/validation.py',
      'analyzer/analysis.py',
      'analyzer/grading.py',
      'analyzer/explain.py',
      'data/sample_results.csv',
      'data/sample_with_errors.csv',
    ],
    description:
      'The port reproduces validate_results, the statistics and results in analysis.py, the grading scale and the explanations, using the template’s own sample files and default settings (pass mark 40%, 100 marks per subject). A test compares it with the Python code’s output for both sample files and nine edge cases, and fails if the Python files change.',
  },
  data: {
    description:
      'The template’s fictional sample files: a class of 40 students with five subjects and a few missing scores, and a short file with deliberate mistakes.',
    editable: true,
    persistence: 'session',
    reset: '“Reset to the example” goes back to the sample class.',
  },
  features: [
    {
      id: 'dataset',
      label: 'Dataset',
      explanation:
        'The CSV file the analysis starts from. Choose a sample file or edit the text, and validate_results checks it before anything is calculated: errors stop the analysis, warnings are shown alongside it. In the real app you upload a file in the sidebar.',
      tryThis: [
        'Choose “File with mistakes” and read the messages, with their line numbers.',
        'Edit a score to 105 or to the word “ten”, then analyse the file again.',
        'Type AB in a score to see it treated as missing, not as zero.',
      ],
      simplified: [
        'The real app reads uploaded files, including ones saved in Windows-1252 encoding; here you edit the text directly.',
      ],
      source: [
        { file: 'analyzer/validation.py', symbol: 'validate_results' },
        { file: 'analyzer/validation.py', symbol: 'ABSENT_MARKERS' },
        { file: 'analyzer/validation.py', symbol: 'normalize_header' },
        { file: 'app.py', symbol: 'run_validation' },
      ],
      learn: {
        walkthrough: ['validation', 'app'],
        architecture: ['validation', 'sample-data'],
        viva: ['validation', 'text-first', 'missing'],
      },
    },
    {
      id: 'overview',
      label: 'Overview',
      explanation:
        'The headline numbers and the sentences that explain them. Every sentence is built from the computed results by explain_overview, so it changes when the data changes.',
      tryThis: [
        'Compare the average with the median and read what the explanation says about them.',
        'Edit the dataset, analyse it again and see the numbers and sentences change.',
      ],
      simplified: ['The real app shows these as Streamlit metrics and a sortable table.'],
      source: [
        { file: 'analyzer/analysis.py', symbol: 'overview' },
        { file: 'analyzer/analysis.py', symbol: 'class_summary' },
        { file: 'analyzer/explain.py', symbol: 'explain_overview' },
      ],
      learn: {
        walkthrough: ['analysis', 'explain'],
        architecture: ['analysis', 'explain'],
        viva: ['mean-median', 'result-rule'],
      },
    },
    {
      id: 'subjects',
      label: 'Subjects',
      explanation:
        'Descriptive statistics for each subject, from subject_statistics. Missing scores are left out of every figure, so Count shows how many students each one is based on. The dashed line is the pass mark.',
      tryThis: [
        'Find the subject with the widest spread of scores and explain what standard deviation means.',
        'Open the glossary to check the meaning of Q1 and Q3.',
      ],
      simplified: [
        'The real app draws an interactive Altair chart; the demo draws the same averages as columns.',
      ],
      source: [
        { file: 'analyzer/analysis.py', symbol: 'subject_statistics' },
        { file: 'analyzer/analysis.py', symbol: 'pass_score' },
        { file: 'analyzer/explain.py', symbol: 'explain_subjects' },
        { file: 'analyzer/explain.py', symbol: 'GLOSSARY' },
      ],
      learn: {
        walkthrough: ['analysis', 'explain'],
        architecture: ['analysis'],
        viva: ['std', 'mean-median'],
      },
    },
    {
      id: 'grades',
      label: 'Grades',
      explanation:
        'How many students received each grade, overall and in one subject. The bands come from the template’s grading.py. They are the template’s assumption, which an institution would change to match its own rules, not a universal standard.',
      tryThis: [
        'Choose a subject to see its distribution, with each score graded on the same bands.',
        'Find the grading scale and the pass mark it uses.',
      ],
      simplified: [],
      source: [
        { file: 'analyzer/grading.py', symbol: 'grade_for' },
        { file: 'analyzer/grading.py', symbol: 'FIXED_BANDS' },
        { file: 'analyzer/analysis.py', symbol: 'grade_distribution' },
        { file: 'analyzer/analysis.py', symbol: 'subject_grades' },
      ],
      learn: {
        walkthrough: ['grading'],
        architecture: ['grading'],
        viva: ['percentage-grade'],
      },
    },
    {
      id: 'missing',
      label: 'Missing data',
      explanation:
        'Which scores are missing and whose. Empty cells and absence markers such as AB are treated as missing rather than as zero, and a student with a missing score is marked Incomplete unless they already failed another subject.',
      tryThis: ['Find the three students with a missing score and the subject each is missing.'],
      simplified: [],
      source: [
        { file: 'analyzer/analysis.py', symbol: 'missing_summary' },
        { file: 'analyzer/analysis.py', symbol: 'students_with_missing' },
        { file: 'analyzer/explain.py', symbol: 'explain_missing' },
      ],
      learn: {
        walkthrough: ['analysis', 'explain'],
        architecture: ['analysis'],
        viva: ['missing', 'result-rule'],
      },
    },
    {
      id: 'students',
      label: 'Students',
      explanation:
        'Every student’s total, percentage, grade, result and rank from student_results. The percentage uses only the subjects the student has a score in, and equal percentages share a rank.',
      tryThis: [
        'Search for “Navya” and explain why her result is Incomplete.',
        'Show only the students who failed, and see which subject each failed.',
      ],
      simplified: ['The real app can download these results as a CSV file.'],
      source: [
        { file: 'analyzer/analysis.py', symbol: 'student_results' },
        { file: 'analyzer/grading.py', symbol: 'grade_for' },
        { file: 'tests/test_app.py', symbol: 'test_student_search_filters_results' },
      ],
      learn: {
        walkthrough: ['analysis', 'app-test'],
        architecture: ['analysis', 'tests'],
        viva: ['rank', 'percentage-grade', 'result-rule'],
      },
    },
  ],
  tour: [
    {
      id: 'dataset',
      feature: 'dataset',
      title: 'It starts with a CSV file',
      text: 'This is the template’s own sample file. Before anything is calculated, the port of validate_results checks the columns and every score.',
      highlight: 'validation',
    },
    {
      id: 'overview',
      feature: 'overview',
      title: 'Numbers with explanations',
      text: 'The headline figures come from student_results and overview; each sentence below them is generated from those numbers.',
      highlight: 'headline',
    },
    {
      id: 'subjects',
      feature: 'subjects',
      title: 'Statistics per subject',
      text: 'Mean, median, standard deviation and quartiles, computed the way pandas computes them. Missing scores are left out, not counted as zero.',
      highlight: 'statistics',
    },
    {
      id: 'grades',
      feature: 'grades',
      title: 'Grades from fixed bands',
      text: 'grade_for turns a percentage into a grade. The bands are the template’s assumption, kept in one place so they are easy to change.',
      highlight: 'scale',
    },
    {
      id: 'students',
      feature: 'students',
      title: 'Results for every student',
      text: 'Each student’s percentage uses only the subjects they took, so a missing score doesn’t lower it; their result says Incomplete instead.',
      highlight: 'results',
    },
  ],
  presentation: [
    {
      id: 'introduce',
      feature: 'dataset',
      title: 'Introduce the project',
      say: 'This app analyses a class’s exam results from a CSV file and explains them in plain language. The real project is a Python app with pandas and Streamlit; this is a browser version for demonstrating it.',
      action:
        'Point at the sample file of 40 fictional students and five subjects, and at the validation result.',
      expect:
        '“40 students and 5 subjects passed validation”, with two warnings about missing scores.',
      concept: 'The problem the project solves and the technology it uses',
      learn: { viva: ['what', 'why-stack'] },
    },
    {
      id: 'overview',
      feature: 'overview',
      title: 'Explain the headline numbers',
      say: 'The average and the median describe the class differently; the sentences are generated from the numbers, not written by hand.',
      action: 'Open Overview and read the average, the median and how many passed every subject.',
      expect:
        'The average is 66.2% and the median 66.0%; 31 students passed every subject, 6 failed at least one and 3 are incomplete.',
      concept: 'Descriptive statistics and generated explanations',
      learn: { walkthrough: ['explain'], viva: ['mean-median'] },
    },
    {
      id: 'subjects',
      feature: 'subjects',
      title: 'Compare the subjects',
      say: 'Standard deviation shows how spread out the scores are. Missing scores are left out of every statistic.',
      action:
        'Open Subjects and explain the mean, median and standard deviation of Mathematics, using the pass-mark line.',
      expect:
        'Mathematics has a mean of 61.7, a median of 61.5 and the widest spread (standard deviation 15.4).',
      concept: 'Mean, median and standard deviation',
      learn: { walkthrough: ['analysis'], viva: ['std'] },
    },
    {
      id: 'grades',
      feature: 'grades',
      title: 'Show the grade distribution',
      say: 'Grades come from fixed percentage bands in one file. They are the template’s choice, which an institution would adapt.',
      action: 'Open Grades, read the most common grade, then choose Science.',
      expect:
        'B is the most common overall grade (14 of 40 students), and the Science chart grades each Science score on the same bands.',
      concept: 'Grading bands and distributions',
      learn: { walkthrough: ['grading'], viva: ['percentage-grade'] },
    },
    {
      id: 'validation',
      feature: 'dataset',
      title: 'Show the validation',
      say: 'Errors stop the analysis, so wrong results are never shown; warnings, like missing scores, are reported alongside it.',
      action: 'On Dataset, choose “File with mistakes” and read two of the messages.',
      expect:
        'Four errors with line numbers, such as an empty name on line 4 and a score of 105 on line 3, and no analysis until they are fixed.',
      concept: 'Validating input before analysis',
      learn: { walkthrough: ['validation'], viva: ['validation'] },
    },
    {
      id: 'missing-and-rank',
      feature: 'students',
      title: 'Explain missing scores and ranks',
      say: 'A missing score is not a zero: the percentage uses the subjects the student took, and the result says Incomplete.',
      action: 'Choose the sample class again, open Students and search for “Navya”.',
      expect:
        'Navya Das is ranked 39th with 48.5%, from four subjects; her result is Incomplete because her Science score is missing.',
      concept: 'Missing data, percentages and ranks',
      learn: { walkthrough: ['analysis'], viva: ['missing', 'rank', 'limitations'] },
    },
  ],
  fullProjectAdds: [
    'Runs as a Python app with pandas and Streamlit on your own computer (python -m venv, pip install -r requirements.txt, streamlit run app.py).',
    'Uploading your own CSV file of up to 5 MB, including files saved in Windows-1252 encoding.',
    'Interactive Altair charts and sortable Streamlit tables.',
    'Downloads: the student results and subject statistics as CSV, protected against spreadsheet formula injection, and a Markdown summary report.',
    'A pass mark set in app_config.json, which the generator customizes.',
    'Automated tests (python -m pytest) for the validation, analysis, report and app.',
  ],
  limitations: [
    'This is a TypeScript re-implementation, not the template’s Python code. It is tested against the Python code’s output, and any difference would be a bug in the port.',
    'It uses the template’s default settings: a pass mark of 40% and 100 marks per subject.',
    'Edited data stays in this browser tab; nothing is uploaded.',
  ],
};
