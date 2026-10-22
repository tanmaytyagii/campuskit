"""Statistics and results computed from validated data.

All functions take the clean DataFrame produced by ``validation.validate_results``
(``Student ID``, ``Name``, optional ``Class``, then one float column per subject,
with NaN for missing scores) and return new DataFrames; the input is never changed.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from .grading import GRADE_ORDER, grade_for
from .validation import CLASS_COLUMN, ID_COLUMN, NAME_COLUMN

RESULT_PASS = "Pass"
RESULT_FAIL = "Fail"
RESULT_INCOMPLETE = "Incomplete"


def pass_score(pass_mark: int, max_marks: int) -> float:
    """Converts the pass percentage into marks, e.g. 40% of 100 -> 40.0."""
    return pass_mark / 100 * max_marks


def subject_statistics(data: pd.DataFrame, subjects: list[str], pass_mark: int, max_marks: int) -> pd.DataFrame:
    """One row per subject with descriptive statistics.

    Missing scores are left out of every statistic (pandas skips NaN), so
    ``Count`` shows how many students each figure is based on.
    """
    threshold = pass_score(pass_mark, max_marks)
    rows = []
    for subject in subjects:
        scores = data[subject].dropna()
        count = int(scores.count())
        passed = int((scores >= threshold).sum())
        rows.append(
            {
                "Subject": subject,
                "Count": count,
                "Missing": int(data[subject].isna().sum()),
                "Mean": scores.mean() if count else float("nan"),
                "Median": scores.median() if count else float("nan"),
                "Std dev": scores.std(ddof=1) if count > 1 else float("nan"),
                "Min": scores.min() if count else float("nan"),
                "Q1": scores.quantile(0.25) if count else float("nan"),
                "Q3": scores.quantile(0.75) if count else float("nan"),
                "Max": scores.max() if count else float("nan"),
                "Passed": passed,
                "Pass rate %": passed / count * 100 if count else float("nan"),
            }
        )
    return pd.DataFrame(rows)


def student_results(data: pd.DataFrame, subjects: list[str], pass_mark: int, max_marks: int) -> pd.DataFrame:
    """Total, percentage, grade, result and rank for every student.

    * Percentage = total of attempted subjects / (attempted subjects × max marks) × 100.
    * Result is "Fail" if any attempted subject is below the pass mark,
      otherwise "Incomplete" if any score is missing, otherwise "Pass".
    * Rank uses the percentage (highest = 1); equal percentages share a rank.
    """
    threshold = pass_score(pass_mark, max_marks)
    scores = data[subjects]
    attempted = scores.notna().sum(axis=1)
    total = scores.sum(axis=1, min_count=1)
    percentage = (total / (attempted * max_marks) * 100).where(attempted > 0)

    failed_any = (scores < threshold).any(axis=1)
    missing_any = scores.isna().any(axis=1)
    result = pd.Series(RESULT_PASS, index=data.index)
    result = result.mask(missing_any, RESULT_INCOMPLETE).mask(failed_any, RESULT_FAIL)

    columns = [ID_COLUMN, NAME_COLUMN] + ([CLASS_COLUMN] if CLASS_COLUMN in data.columns else [])
    out = data[columns].copy()
    out["Total"] = total
    out["Subjects scored"] = attempted.astype(int)
    out["Percentage"] = percentage.round(2)
    out["Grade"] = [grade_for(value, pass_mark) if pd.notna(value) else None for value in percentage]
    out["Result"] = result
    out["Rank"] = percentage.rank(method="min", ascending=False).astype("Int64")
    out["Below pass mark in"] = [
        ", ".join(subject for subject in subjects if pd.notna(row[subject]) and row[subject] < threshold)
        for _, row in scores.iterrows()
    ]
    return out.sort_values(["Rank", NAME_COLUMN], na_position="last").reset_index(drop=True)


def grade_distribution(grades: pd.Series) -> pd.DataFrame:
    """Counts per grade in A+ … F order, including grades nobody received."""
    counts = grades.dropna().value_counts()
    total = int(counts.sum())
    rows = [
        {"Grade": grade, "Students": int(counts.get(grade, 0)), "Share %": (counts.get(grade, 0) / total * 100) if total else 0.0}
        for grade in GRADE_ORDER
    ]
    return pd.DataFrame(rows)


def subject_grades(data: pd.DataFrame, subject: str, pass_mark: int, max_marks: int) -> pd.Series:
    """Grades for one subject, based on each score as a percentage of the max marks."""
    percentages = data[subject] / max_marks * 100
    return percentages.map(lambda value: grade_for(value, pass_mark) if pd.notna(value) else None)


def missing_summary(data: pd.DataFrame, subjects: list[str]) -> pd.DataFrame:
    """Missing scores per subject."""
    total = len(data)
    rows = [
        {
            "Subject": subject,
            "Missing": int(data[subject].isna().sum()),
            "Missing %": data[subject].isna().sum() / total * 100 if total else 0.0,
        }
        for subject in subjects
    ]
    return pd.DataFrame(rows)


def students_with_missing(data: pd.DataFrame, subjects: list[str]) -> pd.DataFrame:
    """Students who have at least one missing score, and which subjects."""
    mask = data[subjects].isna().any(axis=1)
    rows = data[mask]
    return pd.DataFrame(
        {
            ID_COLUMN: rows[ID_COLUMN],
            NAME_COLUMN: rows[NAME_COLUMN],
            "Missing subjects": [
                ", ".join(subject for subject in subjects if pd.isna(row[subject])) for _, row in rows.iterrows()
            ],
        }
    ).reset_index(drop=True)


def class_summary(results: pd.DataFrame) -> pd.DataFrame | None:
    """Average percentage and pass rate per class, when a Class column exists."""
    if CLASS_COLUMN not in results.columns:
        return None
    grouped = results.groupby(CLASS_COLUMN, sort=True)
    summary = pd.DataFrame(
        {
            "Students": grouped.size(),
            "Average %": grouped["Percentage"].mean(),
            "Passed": grouped["Result"].apply(lambda values: int((values == RESULT_PASS).sum())),
        }
    ).reset_index()
    summary["Pass rate %"] = summary["Passed"] / summary["Students"] * 100
    return summary


@dataclass(frozen=True)
class Overview:
    students: int
    subjects: int
    average_percentage: float
    median_percentage: float
    passed: int
    failed: int
    incomplete: int
    highest_subject: str | None
    lowest_subject: str | None


def overview(results: pd.DataFrame, stats: pd.DataFrame) -> Overview:
    means = stats.dropna(subset=["Mean"]).sort_values("Mean")
    return Overview(
        students=len(results),
        subjects=len(stats),
        average_percentage=float(results["Percentage"].mean()),
        median_percentage=float(results["Percentage"].median()),
        passed=int((results["Result"] == RESULT_PASS).sum()),
        failed=int((results["Result"] == RESULT_FAIL).sum()),
        incomplete=int((results["Result"] == RESULT_INCOMPLETE).sum()),
        highest_subject=str(means.iloc[-1]["Subject"]) if not means.empty else None,
        lowest_subject=str(means.iloc[0]["Subject"]) if not means.empty else None,
    )
