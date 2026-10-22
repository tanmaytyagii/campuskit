"""Downloadable output: CSV files and a Markdown summary report."""

from __future__ import annotations

from datetime import datetime

import pandas as pd

from .analysis import Overview
from .config import AppConfig
from .grading import describe_scale

FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _safe_cell(value: object) -> object:
    """Prefixes text that a spreadsheet would run as a formula ("CSV injection")."""
    if isinstance(value, str) and value.startswith(FORMULA_PREFIXES):
        return "'" + value
    return value


def to_csv_bytes(frame: pd.DataFrame) -> bytes:
    """CSV encoded as UTF-8 with a byte-order mark so Excel shows names correctly."""
    safe = frame.copy()
    for column in safe.columns:
        if safe[column].dtype == object or pd.api.types.is_string_dtype(safe[column]):
            safe[column] = safe[column].map(_safe_cell)
    return safe.to_csv(index=False, float_format="%.2f").encode("utf-8-sig")


def _markdown_table(frame: pd.DataFrame, digits: int = 1) -> str:
    def cell(value: object) -> str:
        if isinstance(value, float):
            return "" if pd.isna(value) else f"{value:.{digits}f}"
        if value is None or (not isinstance(value, str) and pd.isna(value)):
            return ""
        return str(value).replace("|", "\\|").replace("\n", " ")

    header = "| " + " | ".join(str(column) for column in frame.columns) + " |"
    divider = "| " + " | ".join("---" for _ in frame.columns) + " |"
    body = ["| " + " | ".join(cell(value) for value in row) + " |" for row in frame.itertuples(index=False)]
    return "\n".join([header, divider, *body])


def build_report(
    *,
    config: AppConfig,
    source_name: str,
    summary: Overview,
    stats: pd.DataFrame,
    results: pd.DataFrame,
    distribution: pd.DataFrame,
    missing: pd.DataFrame,
    explanations: dict[str, list[str]],
    generated_at: datetime | None = None,
) -> str:
    """A Markdown report summarising the analysis, built only from computed values."""
    when = (generated_at or datetime.now()).strftime("%Y-%m-%d %H:%M")
    lines = [f"# {config.app_name}: result analysis", ""]
    if config.institution_name:
        lines += [f"**Institution:** {config.institution_name}  ", ""]
    lines += [
        f"**Data file:** {source_name}  ",
        f"**Generated:** {when}  ",
        f"**Pass mark:** {config.pass_mark}% of {config.max_marks} marks per subject",
        "",
        "## Summary",
        "",
        "| Students | Subjects | Average % | Median % | Passed | Failed | Incomplete |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        f"| {summary.students} | {summary.subjects} | {summary.average_percentage:.1f} | "
        f"{summary.median_percentage:.1f} | {summary.passed} | {summary.failed} | {summary.incomplete} |",
        "",
    ]
    for line in explanations.get("overview", []):
        lines.append(f"- {line}")
    lines += ["", "## Subject statistics", "", _markdown_table(stats), ""]
    for line in explanations.get("subjects", []):
        lines.append(f"- {line}")
    lines += ["", "## Grade distribution", "", _markdown_table(distribution), ""]
    for line in explanations.get("grades", []):
        lines.append(f"- {line}")
    lines += ["", "### Grading scale", "", "| Grade | Percentage |", "| --- | --- |"]
    lines += [f"| {grade} | {band} |" for grade, band in describe_scale(config.pass_mark)]
    lines += ["", "## Missing data", "", _markdown_table(missing), ""]
    for line in explanations.get("missing", []):
        lines.append(f"- {line}")
    top = results.dropna(subset=["Percentage"]).head(5)
    lines += ["", "## Top five students by percentage", ""]
    lines.append(_markdown_table(top[["Rank", "Student ID", "Name", "Percentage", "Grade", "Result"]]))
    lines += [
        "",
        "---",
        "",
        "This report was generated automatically from the uploaded data. Check the figures against the source "
        "records before sharing them.",
        "",
    ]
    return "\n".join(lines)
