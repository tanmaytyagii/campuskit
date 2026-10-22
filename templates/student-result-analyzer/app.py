"""Streamlit interface for the Student Result Analyzer.

Run with:  streamlit run app.py

This file only builds the user interface. All checks and calculations live in
the ``analyzer`` package, which has its own tests in ``tests/``.
"""

from __future__ import annotations

from pathlib import Path

import altair as alt
import pandas as pd
import streamlit as st

from analyzer import analysis, explain, report
from analyzer.config import ConfigError, load_config
from analyzer.grading import GRADE_ORDER, describe_scale
from analyzer.validation import ValidationResult, validate_results

BASE_DIR = Path(__file__).resolve().parent
SAMPLE_FILE = BASE_DIR / "data" / "sample_results.csv"
ERROR_SAMPLE_FILE = BASE_DIR / "data" / "sample_with_errors.csv"
SOURCE_SAMPLE = "Sample dataset"
SOURCE_UPLOAD = "Upload a CSV file"

try:
    config = load_config()
except ConfigError as error:
    st.set_page_config(page_title="Configuration problem")
    st.error(f"**app_config.json has a problem:** {error}")
    st.stop()

st.set_page_config(page_title=config.app_name, page_icon="📊", layout="wide")
ACCENT = st.get_option("theme.primaryColor") or "#6D28D9"


@st.cache_data(show_spinner=False)
def run_validation(raw: bytes, max_marks: int) -> ValidationResult:
    return validate_results(raw, max_marks)


def bullet_list(lines: list[str]) -> None:
    st.markdown("\n".join(f"- {line}" for line in lines))


# --- Sidebar ------------------------------------------------------------------
with st.sidebar:
    st.header("Data")
    source = st.radio("Data source", [SOURCE_SAMPLE, SOURCE_UPLOAD], key="source")
    uploaded = None
    if source == SOURCE_UPLOAD:
        uploaded = st.file_uploader(
            "Results file (.csv)",
            type=["csv"],
            help="First row: Student ID, Name, optional Class, then one column of scores per subject.",
        )
    st.download_button(
        "Download the sample CSV",
        data=SAMPLE_FILE.read_bytes(),
        file_name="sample_results.csv",
        mime="text/csv",
        help="A fictional class you can use as a template for your own data.",
    )
    st.download_button(
        "Download a CSV with mistakes",
        data=ERROR_SAMPLE_FILE.read_bytes(),
        file_name="sample_with_errors.csv",
        mime="text/csv",
        help="Upload it to see how the validation messages look.",
    )

    st.divider()
    st.header("Settings")
    st.markdown(f"- Pass mark: **{config.pass_mark}%**\n- Maximum marks per subject: **{config.max_marks}**")
    st.caption("Change these in app_config.json, then restart the app.")
    with st.expander("Grading scale"):
        st.markdown(
            "| Grade | Overall percentage |\n| --- | --- |\n"
            + "\n".join(f"| {grade} | {band} |" for grade, band in describe_scale(config.pass_mark))
        )

# --- Header -------------------------------------------------------------------
st.title(config.app_name)
if config.institution_name:
    st.caption(config.institution_name)

if source == SOURCE_UPLOAD:
    if uploaded is None:
        st.info(
            "Upload a CSV file in the sidebar to analyse your own results. The first row must contain the column "
            "names, for example **Student ID, Name, Class, Mathematics, Science**. Download the sample CSV to see "
            "the expected layout."
        )
        st.stop()
    raw_bytes = uploaded.getvalue()
    source_name = uploaded.name
else:
    raw_bytes = SAMPLE_FILE.read_bytes()
    source_name = "sample_results.csv (fictional sample data)"

validation = run_validation(raw_bytes, config.max_marks)
if validation.errors or validation.data is None:
    st.error(f"**{source_name}** can’t be analysed yet. Fix the problems below and upload the file again.")
    bullet_list([issue.message for issue in validation.errors])
    st.stop()

st.success(
    f"Analysing **{source_name}**: {len(validation.data)} students and {len(validation.subjects)} subjects passed "
    "validation."
)
if validation.warnings:
    st.warning("\n".join(f"- {issue.message}" for issue in validation.warnings))

# --- Analysis -----------------------------------------------------------------
data = validation.data
subjects = validation.subjects
stats = analysis.subject_statistics(data, subjects, config.pass_mark, config.max_marks)
results = analysis.student_results(data, subjects, config.pass_mark, config.max_marks)
summary = analysis.overview(results, stats)
distribution = analysis.grade_distribution(results["Grade"])
missing = analysis.missing_summary(data, subjects)
missing_students = analysis.students_with_missing(data, subjects)
classes = analysis.class_summary(results)
explanations = {
    "overview": explain.explain_overview(summary, config.pass_mark),
    "subjects": explain.explain_subjects(stats),
    "grades": explain.explain_grades(distribution),
    "missing": explain.explain_missing(missing, len(missing_students)),
}
pass_mark_score = analysis.pass_score(config.pass_mark, config.max_marks)

overview_tab, subjects_tab, grades_tab, missing_tab, students_tab, download_tab = st.tabs(
    ["Overview", "Subjects", "Grades", "Missing data", "Students", "Download"]
)

with overview_tab:
    columns = st.columns(4)
    columns[0].metric("Students", summary.students)
    columns[1].metric("Subjects", summary.subjects)
    columns[2].metric("Average percentage", f"{summary.average_percentage:.1f}%")
    columns[3].metric("Passed every subject", f"{summary.passed} of {summary.students}")
    st.subheader("What the numbers say")
    bullet_list(explanations["overview"] + explanations["subjects"][:1])
    if classes is not None:
        st.subheader("By class")
        st.dataframe(
            classes,
            hide_index=True,
            column_config={
                "Average %": st.column_config.NumberColumn(format="%.1f"),
                "Pass rate %": st.column_config.NumberColumn(format="%.1f"),
            },
        )

with subjects_tab:
    st.subheader("Average score per subject")
    bars = (
        alt.Chart(stats)
        .mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4, color=ACCENT)
        .encode(
            x=alt.X("Subject:N", sort=None, title=None, axis=alt.Axis(labelAngle=0)),
            y=alt.Y("Mean:Q", title="Average score", scale=alt.Scale(domain=[0, config.max_marks])),
            tooltip=[
                alt.Tooltip("Subject:N"),
                alt.Tooltip("Mean:Q", format=".1f"),
                alt.Tooltip("Median:Q", format=".1f"),
                alt.Tooltip("Count:Q"),
            ],
        )
    )
    pass_line = (
        alt.Chart(pd.DataFrame({"Pass mark": [pass_mark_score]}))
        .mark_rule(strokeDash=[6, 4], color="#B91C1C", size=2)
        .encode(y="Pass mark:Q", tooltip=[alt.Tooltip("Pass mark:Q", format=".0f")])
    )
    st.altair_chart(bars + pass_line)
    st.caption(f"The dashed line is the pass mark ({pass_mark_score:g} marks).")
    st.subheader("Descriptive statistics")
    st.dataframe(
        stats,
        hide_index=True,
        column_config={
            name: st.column_config.NumberColumn(format="%.1f")
            for name in ["Mean", "Median", "Std dev", "Min", "Q1", "Q3", "Max", "Pass rate %"]
        },
    )
    bullet_list(explanations["subjects"])
    with st.expander("What do these statistics mean?"):
        st.markdown("\n".join(f"- **{term}:** {meaning}" for term, meaning in explain.GLOSSARY.items()))

with grades_tab:
    st.subheader("Overall grade distribution")
    grade_chart = (
        alt.Chart(distribution)
        .mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4, color=ACCENT)
        .encode(
            x=alt.X("Grade:N", sort=list(GRADE_ORDER), title="Grade", axis=alt.Axis(labelAngle=0)),
            y=alt.Y("Students:Q", title="Students", axis=alt.Axis(tickMinStep=1)),
            tooltip=[alt.Tooltip("Grade:N"), alt.Tooltip("Students:Q"), alt.Tooltip("Share %:Q", format=".1f")],
        )
    )
    st.altair_chart(grade_chart)
    bullet_list(explanations["grades"])
    st.dataframe(distribution, hide_index=True, column_config={"Share %": st.column_config.NumberColumn(format="%.1f")})

    st.subheader("Grades in one subject")
    chosen = st.selectbox("Subject", subjects)
    subject_distribution = analysis.grade_distribution(
        analysis.subject_grades(data, chosen, config.pass_mark, config.max_marks)
    )
    st.altair_chart(
        alt.Chart(subject_distribution)
        .mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4, color=ACCENT)
        .encode(
            x=alt.X("Grade:N", sort=list(GRADE_ORDER), axis=alt.Axis(labelAngle=0)),
            y=alt.Y("Students:Q", axis=alt.Axis(tickMinStep=1)),
            tooltip=["Grade:N", "Students:Q"],
        ),
    )
    st.caption(f"Each score is converted to a percentage of {config.max_marks} marks and graded on the same scale.")

with missing_tab:
    st.subheader("Missing scores")
    bullet_list(explanations["missing"])
    st.dataframe(missing, hide_index=True, column_config={"Missing %": st.column_config.NumberColumn(format="%.1f")})
    if not missing_students.empty:
        st.subheader("Students with missing scores")
        st.dataframe(missing_students, hide_index=True)

with students_tab:
    st.subheader("Results for every student")
    search = st.text_input("Search by name or student ID", placeholder="e.g. Sharma or S2026005")
    outcome = st.radio("Result", ["All", "Pass", "Fail", "Incomplete"], horizontal=True)
    shown = results
    if search.strip():
        needle = search.strip().lower()
        shown = shown[
            shown["Name"].str.lower().str.contains(needle, regex=False)
            | shown["Student ID"].str.lower().str.contains(needle, regex=False)
        ]
    if outcome != "All":
        shown = shown[shown["Result"] == outcome]
    st.caption(f"Showing {len(shown)} of {len(results)} students.")
    if shown.empty:
        st.info("No students match. Clear the search or choose another result.")
    else:
        st.dataframe(
            shown,
            hide_index=True,
            column_config={
                "Total": st.column_config.NumberColumn(format="%.1f"),
                "Percentage": st.column_config.NumberColumn(format="%.2f"),
            },
        )

with download_tab:
    st.subheader("Download the analysis")
    st.markdown("Every file is generated from the data you are viewing now.")
    st.download_button(
        "Student results (CSV)",
        data=report.to_csv_bytes(results),
        file_name="student_results.csv",
        mime="text/csv",
    )
    st.download_button(
        "Subject statistics (CSV)",
        data=report.to_csv_bytes(stats),
        file_name="subject_statistics.csv",
        mime="text/csv",
    )
    st.download_button(
        "Summary report (Markdown)",
        data=report.build_report(
            config=config,
            source_name=source_name,
            summary=summary,
            stats=stats,
            results=results,
            distribution=distribution,
            missing=missing,
            explanations=explanations,
        ).encode("utf-8"),
        file_name="analysis_report.md",
        mime="text/markdown",
    )

st.divider()
st.caption(
    (f"Built by {config.author_name}. " if config.author_name else "")
    + "Made with the CampusKit student-result-analyzer template (MIT License). The sample data is fictional."
)
