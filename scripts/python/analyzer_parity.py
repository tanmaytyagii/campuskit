"""Runs the Student Result Analyzer's own Python code and prints its results as JSON.

The website's Demo Studio re-implements the analyzer in TypeScript so it can run in
the browser. `pnpm demo:fixtures` runs this script with the template's real
``analyzer`` package (pandas) and saves the output; the website's tests compare
the TypeScript port with it, case by case.

Usage:  python scripts/python/analyzer_parity.py <path to templates/student-result-analyzer>
"""

from __future__ import annotations

import hashlib
import json
import math
import platform
import sys
from pathlib import Path

TEMPLATE = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(TEMPLATE))

import pandas as pd  # noqa: E402

from analyzer import analysis, explain  # noqa: E402
from analyzer.config import load_config  # noqa: E402
from analyzer.validation import validate_results  # noqa: E402

# Files whose behaviour the TypeScript port reproduces. If any of them changes,
# the website's tests ask for this script to be run again.
SOURCES = [
    "analyzer/validation.py",
    "analyzer/analysis.py",
    "analyzer/grading.py",
    "analyzer/explain.py",
    "app_config.json",
    "data/sample_results.csv",
    "data/sample_with_errors.csv",
]

# Small files that exercise the edge cases the samples don't reach.
EXTRA_CASES = {
    "aliases-absent-and-blank-lines": (
        "Roll No, Student Name ,Section,Maths,Physics,Chemistry\n"
        "R-01,  Neha   Kapoor ,B,78,AB,64.5\n"
        "\n"
        "R-02,Omar Farooq,A,,absent,59\n"
        "R-03,Lena Fischer,A,91,88,-\n"
        "R-04,Ravi Teja,B,39,41,40\n"
        ",,,,,\n"
        "R-05,Zoya Ali,A,40,40,39.5\n"
    ),
    "no-class-column-ties-and-no-scores": (
        "ID,Name,English,History\n"
        "A1,beta,70,80\n"
        "A2,Alpha,80,70\n"
        "A3,Gamma,75,75\n"
        "A4,Delta,,\n"
        "A5,Echo,60,61\n"
        "A6,Foxtrot,100,100\n"
    ),
    "exact-halves-in-statistics": (
        "Student ID,Name,Class,Art,Music\n"
        "H1,Asha,X,62,70\n"
        "H2,Bilal,X,62.5,71\n"
        "H3,Chen,Y,63,70.5\n"
        "H4,Dina,Y,61.5,69\n"
    ),
    "header-problems": "Student ID,Name,Maths,,maths\nS1,Ann,50,60,70\n",
    "missing-required-columns": "Roll,Score A,Score B\n1,50,60\n",
    "no-subject-columns": "Student ID,Name,Class\nS1,Ann,10-A\n",
    "ragged-row": "Student ID,Name,Maths\nS1,Ann,50\nS2,Ben,60,70\n",
    "only-a-header": "Student ID,Name,Maths\n",
    "many-problems": (
        "Student ID,Name,Maths,Science\n"
        "S1,,abc,101\n"
        ",Bo,12x,-1\n"
        "S1,Cy,1e2,99\n"
        "S4,Di,inf,50\n"
        "S5,Ed,7,8\n"
        "S6,Fa,1,2\n"
        "S7,Gu,3,4\n"
        "S8,Ha,5,six\n"
        "S9,Io,seven,eight\n"
        "S10,Jo,nine,ten\n"
        "S11,Ka,x,y\n"
        "S12,Li,p,q\n"
        "S13,Mo,r,s\n"
        "S14,Ny,t,u\n"
    ),
}


def clean(value):
    """Converts pandas and numpy values into JSON: NaN and missing become null."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if value is pd.NA:
        return None
    if hasattr(value, "item"):
        value = value.item()
        if isinstance(value, float) and math.isnan(value):
            return None
    return value


def frame(df: pd.DataFrame | None):
    if df is None:
        return None
    return [{str(key): clean(value) for key, value in row.items()} for row in df.to_dict(orient="records")]


def run_case(name: str, text: str, pass_mark: int, max_marks: int) -> dict:
    validation = validate_results(text.encode("utf-8"), max_marks)
    case = {
        "name": name,
        "csv": text,
        "validation": {
            "ok": validation.ok,
            "errors": [issue.message for issue in validation.errors],
            "warnings": [issue.message for issue in validation.warnings],
            "subjects": validation.subjects,
            "rows": frame(validation.data),
        },
        "analysis": None,
    }
    if not validation.ok:
        return case
    data, subjects = validation.data, validation.subjects
    stats = analysis.subject_statistics(data, subjects, pass_mark, max_marks)
    results = analysis.student_results(data, subjects, pass_mark, max_marks)
    summary = analysis.overview(results, stats)
    distribution = analysis.grade_distribution(results["Grade"])
    missing = analysis.missing_summary(data, subjects)
    missing_students = analysis.students_with_missing(data, subjects)
    classes = analysis.class_summary(results)
    case["analysis"] = {
        "statistics": frame(stats),
        "results": frame(results),
        "overview": {key: clean(value) for key, value in summary.__dict__.items()},
        "gradeDistribution": frame(distribution),
        "subjectGrades": {
            subject: frame(analysis.grade_distribution(analysis.subject_grades(data, subject, pass_mark, max_marks)))
            for subject in subjects
        },
        "missing": frame(missing),
        "studentsWithMissing": frame(missing_students),
        "classes": frame(classes),
        "explanations": {
            "overview": explain.explain_overview(summary, pass_mark),
            "subjects": explain.explain_subjects(stats),
            "grades": explain.explain_grades(distribution),
            "missing": explain.explain_missing(missing, len(missing_students)),
        },
    }
    return case


def main() -> None:
    config = load_config(TEMPLATE / "app_config.json")
    cases = [
        ("sample_results.csv", (TEMPLATE / "data" / "sample_results.csv").read_text(encoding="utf-8")),
        ("sample_with_errors.csv", (TEMPLATE / "data" / "sample_with_errors.csv").read_text(encoding="utf-8")),
        *EXTRA_CASES.items(),
    ]
    output = {
        "description": "Results of the Student Result Analyzer's Python code, for the Demo Studio's parity tests. "
        "Regenerate with `pnpm demo:fixtures`.",
        "python": platform.python_version(),
        "pandas": pd.__version__,
        "passMark": config.pass_mark,
        "maxMarks": config.max_marks,
        "sources": {
            path: hashlib.sha256((TEMPLATE / path).read_bytes()).hexdigest() for path in SOURCES
        },
        "cases": [run_case(name, text, config.pass_mark, config.max_marks) for name, text in cases],
    }
    json.dump(output, sys.stdout, ensure_ascii=False, indent=2, allow_nan=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
