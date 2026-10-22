# Architecture

## Overview

The project has two parts:

1. **`analyzer/`**, a plain Python package that validates data and computes every number using pandas. It has no Streamlit code, so it can be tested on its own and reused in a script or notebook.
2. **`app.py`**, a Streamlit script that builds the web interface and calls the analyzer.

```text
 CSV bytes (sample or upload)
        │
        ▼
 validation.validate_results ──► errors? ──► shown in the app, analysis stops
        │ clean DataFrame + subject list (+ warnings)
        ▼
 analysis.subject_statistics   analysis.student_results   analysis.missing_summary
        │                             │                          │
        └────────────┬────────────────┴───────────┬──────────────┘
                     ▼                            ▼
             explain.* (sentences)        report.* (CSV, Markdown)
                     │                            │
                     └────────► app.py tabs and download buttons
```

## How Streamlit runs the app

Streamlit runs `app.py` from top to bottom every time the user changes a widget (for example, picks another subject). To avoid re-validating the same file on every interaction, `run_validation` is wrapped in `@st.cache_data`, which reuses the result when the file contents and maximum marks are unchanged.

## Validation pipeline (`analyzer/validation.py`)

1. **Size and encoding:** reject empty or larger-than-5 MB files; decode as UTF-8 (with or without a byte-order mark), falling back to Windows-1252 with a warning.
2. **Parsing:** `pandas.read_csv` with `header=None` and `dtype=str`, so the header row and every cell are read exactly as text. Blank lines are kept until the line numbers are recorded, then dropped.
3. **Header checks:** columns are matched by a normalised name (`"Roll No"` → `roll_no`) against aliases for the ID, name and class. Duplicate or empty column names are errors.
4. **Row checks:** empty IDs, duplicate IDs and empty names are errors, listed with line numbers.
5. **Scores:** `AB`/`Absent`/empty become missing values; everything else must be a number between 0 and `max_marks`.

The result is a `ValidationResult` with a clean DataFrame (`Student ID`, `Name`, optional `Class`, one `float` column per subject, `NaN` for missing), the subject names, and separate lists of errors and warnings.

## Analysis (`analyzer/analysis.py`)

| Function                                   | Output                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `subject_statistics`                       | One row per subject: count, missing, mean, median, sample standard deviation, min, Q1, Q3, max, passed, pass rate. |
| `student_results`                          | Total, subjects scored, percentage, grade, result, rank and subjects below the pass mark for every student.        |
| `grade_distribution`                       | Students per grade in A+ … F order, including grades with zero students.                                           |
| `subject_grades`                           | Grades for one subject, from each score as a percentage of the maximum.                                            |
| `missing_summary`, `students_with_missing` | Missing scores per subject and per student.                                                                        |
| `class_summary`                            | Average percentage and pass rate per class, when a Class column exists.                                            |
| `overview`                                 | Headline numbers for the Overview tab.                                                                             |

pandas skips `NaN` in `mean()`, `median()` and `std()`, which is why missing scores never count as zero.

## Data design

The app does not use a database: it analyses one CSV file in memory. If you stored results permanently, a normalised design would be:

| Table      | Columns                                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `students` | `student_id` (primary key), `name`, `class`                                                                          |
| `subjects` | `subject_id` (primary key), `name`, `max_marks`                                                                      |
| `scores`   | `student_id` (foreign key), `subject_id` (foreign key), `score` (nullable), primary key (`student_id`, `subject_id`) |

The CSV is the “wide” form of the `scores` table (one column per subject).

## Design decisions

- **Separate logic from the interface** so the calculations are testable and the UI file stays readable.
- **Read every cell as text first**, so validation can show the original value (“seventy” on line 5) instead of a silent conversion.
- **Missing is not zero:** treating absent scores as 0 would drag averages down and fail students unfairly. The result is marked _Incomplete_ instead.
- **Explanations are generated from the numbers**, never hard-coded, so they always describe the uploaded data.
- **CSV downloads** are written as UTF-8 with a byte-order mark (so Excel shows Unicode names correctly) and text cells starting with `=`, `+`, `-` or `@` are prefixed with `'` to prevent formula injection.

## Ideas for extending the project

- Different maximum marks per subject (store them in `app_config.json`).
- Compare two exams and show improvement per student.
- Export the report as PDF.
- Correlation between subjects (`DataFrame.corr()`), with an explanation of what correlation does and doesn’t mean.
