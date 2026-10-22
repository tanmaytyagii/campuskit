"""Plain-language explanations generated from the computed results.

Every sentence is built from the actual numbers, so the explanations change
when the data changes. Nothing here is a fixed claim about the class.
"""

from __future__ import annotations

import pandas as pd

from .analysis import Overview

GLOSSARY: dict[str, str] = {
    "Count": "How many students have a score in the subject. Missing scores are not counted.",
    "Mean": "The average: add all scores and divide by the count. Very high or low scores pull it up or down.",
    "Median": "The middle score when all scores are sorted. Half the students scored at or below it.",
    "Std dev": (
        "Standard deviation: how spread out the scores are. A small value means most students scored close "
        "to the mean; a large value means scores vary a lot."
    ),
    "Q1 / Q3": "Quartiles: 25% of students scored at or below Q1, and 75% at or below Q3.",
    "Min / Max": "The lowest and highest score in the subject.",
    "Pass rate %": "The share of students with a score who reached the pass mark.",
}


def _fmt(value: float, digits: int = 1) -> str:
    return f"{value:.{digits}f}"


def explain_overview(summary: Overview, pass_mark: int) -> list[str]:
    lines = [
        f"The file contains {summary.students} students and {summary.subjects} subjects.",
        f"The average overall percentage is {_fmt(summary.average_percentage)}% and the median is "
        f"{_fmt(summary.median_percentage)}%.",
    ]
    if summary.average_percentage - summary.median_percentage > 3:
        lines.append(
            "The average is noticeably higher than the median, so a few high scorers are lifting the average."
        )
    elif summary.median_percentage - summary.average_percentage > 3:
        lines.append(
            "The average is noticeably lower than the median, so a few low scores are pulling the average down."
        )
    lines.append(
        f"{summary.passed} students passed every subject (pass mark {pass_mark}%), {summary.failed} scored below "
        f"the pass mark in at least one subject"
        + (f", and {summary.incomplete} have a missing score with no failed subject." if summary.incomplete else ".")
    )
    return lines


def explain_subjects(stats: pd.DataFrame) -> list[str]:
    valid = stats.dropna(subset=["Mean"])
    if valid.empty:
        return ["No subject has any scores yet."]
    by_mean = valid.sort_values("Mean")
    highest, lowest = by_mean.iloc[-1], by_mean.iloc[0]
    lines = [
        f"{highest['Subject']} has the highest average ({_fmt(highest['Mean'])}) and "
        f"{lowest['Subject']} the lowest ({_fmt(lowest['Mean'])})."
    ]
    spread = valid.dropna(subset=["Std dev"])
    if not spread.empty:
        widest = spread.sort_values("Std dev").iloc[-1]
        narrowest = spread.sort_values("Std dev").iloc[0]
        lines.append(
            f"Scores vary most in {widest['Subject']} (standard deviation {_fmt(widest['Std dev'])}) and least in "
            f"{narrowest['Subject']} ({_fmt(narrowest['Std dev'])})."
        )
    weakest_pass = valid.sort_values("Pass rate %").iloc[0]
    if weakest_pass["Pass rate %"] < 100:
        lines.append(
            f"{weakest_pass['Subject']} has the lowest pass rate: {int(weakest_pass['Passed'])} of "
            f"{int(weakest_pass['Count'])} students ({_fmt(weakest_pass['Pass rate %'])}%) reached the pass mark."
        )
    else:
        lines.append("Every student with a score reached the pass mark in every subject.")
    return lines


def explain_grades(distribution: pd.DataFrame) -> list[str]:
    total = int(distribution["Students"].sum())
    if total == 0:
        return ["No grades could be calculated."]
    top = distribution.sort_values("Students", ascending=False).iloc[0]
    top_two = int(distribution[distribution["Grade"].isin(["A+", "A"])]["Students"].sum())
    failing = int(distribution[distribution["Grade"] == "F"]["Students"].sum())
    return [
        f"The most common overall grade is {top['Grade']} ({int(top['Students'])} of {total} students).",
        f"{top_two} students ({_fmt(top_two / total * 100)}%) earned A or A+, and {failing} "
        f"({_fmt(failing / total * 100)}%) have an overall F.",
    ]


def explain_missing(missing: pd.DataFrame, affected_students: int) -> list[str]:
    total = int(missing["Missing"].sum())
    if total == 0:
        return ["No scores are missing, so every statistic uses every student."]
    affected = missing[missing["Missing"] > 0]
    subjects = ", ".join(f"{row['Subject']} ({int(row['Missing'])})" for _, row in affected.iterrows())
    return [
        f"{total} score(s) are missing across {len(affected)} subject(s): {subjects}.",
        "Missing scores are left out of averages and other statistics rather than counted as zero, so those "
        "figures describe only the students who have a score.",
        f"Students with a missing score are marked “Incomplete” unless they already scored below the pass mark "
        f"in another subject. Check the records of these {affected_students} student(s) before publishing results.",
    ]
