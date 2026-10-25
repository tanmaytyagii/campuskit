from __future__ import annotations

import io
import re
from datetime import datetime

import pandas as pd

from analyzer import analysis, explain, report
from analyzer.config import AppConfig
from analyzer.validation import validate_results
from conftest import csv_bytes

CONFIG = AppConfig(app_name="Result Analyzer", institution_name="Hill View School", author_name="", pass_mark=40, max_marks=100)


def analysed(raw: bytes):
    result = validate_results(raw, max_marks=100)
    stats = analysis.subject_statistics(result.data, result.subjects, 40, 100)
    results = analysis.student_results(result.data, result.subjects, 40, 100)
    return result, stats, results


def test_markdown_report_contains_every_section(sample_bytes):
    result, stats, results = analysed(sample_bytes)
    summary = analysis.overview(results, stats)
    distribution = analysis.grade_distribution(results["Grade"])
    missing = analysis.missing_summary(result.data, result.subjects)
    text = report.build_report(
        config=CONFIG,
        source_name="sample_results.csv",
        summary=summary,
        stats=stats,
        results=results,
        distribution=distribution,
        missing=missing,
        explanations={"overview": explain.explain_overview(summary, 40)},
        generated_at=datetime(2026, 10, 21, 9, 30),
    )
    for heading in ["# Result Analyzer: result analysis", "## Summary", "## Subject statistics", "## Grade distribution",
                    "## Missing data", "## Top five students by percentage"]:
        assert heading in text
    assert "**Institution:** Hill View School" in text
    assert "**Generated:** 2026-10-21 09:30" in text
    assert f"| {summary.students} | {summary.subjects} |" in text


def test_csv_export_round_trips_and_blocks_formulas():
    raw = csv_bytes("Student ID,Name,Maths\nS1,=HYPERLINK(\"x\"),50\nS2,Zoë,70")
    _, _, results = analysed(raw)
    exported = report.to_csv_bytes(results)
    assert exported.startswith("\ufeff".encode("utf-8"))
    frame = pd.read_csv(io.BytesIO(exported), encoding="utf-8-sig")
    assert "'=HYPERLINK(\"x\")" in frame["Name"].tolist()
    assert "Zoë" in frame["Name"].tolist()
    assert list(frame.columns[:4]) == ["Student ID", "Name", "Total", "Subjects scored"]


def test_markdown_tables_escape_pipes():
    raw = csv_bytes("Student ID,Name,Maths\nS1,A|B,50")
    _, stats, results = analysed(raw)
    table = report._markdown_table(results[["Name"]])
    assert "A\\|B" in table


def test_a_file_with_no_scores_says_so_instead_of_nan():
    # Every score marked absent: there is no average, and "nan" must not reach the student.
    raw = csv_bytes(
        """
        Student ID,Name,Class,Maths,Science
        A1,Ann,10-A,AB,-
        A2,Ben,10-B,NA,absent
        """
    )
    result, stats, results = analysed(raw)
    assert result.ok
    summary = analysis.overview(results, stats)
    overview = explain.explain_overview(summary, 40)
    assert "No student has a score yet, so there is no average or median percentage." in overview
    text = report.build_report(
        config=CONFIG,
        source_name="absent.csv",
        summary=summary,
        stats=stats,
        results=results,
        distribution=analysis.grade_distribution(results["Grade"]),
        missing=analysis.missing_summary(result.data, result.subjects),
        explanations={"overview": overview, "subjects": explain.explain_subjects(stats)},
        generated_at=datetime(2026, 10, 24, 9, 30),
    )
    assert "| 2 | 2 | — | — | 0 | 0 | 2 |" in text
    assert re.search(r"\bnan\b", text, re.IGNORECASE) is None
