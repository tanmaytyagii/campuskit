"""Runs the Student Result Analyzer's own Python code and prints its results as JSON.

The website's Demo Studio re-implements the analyzer in TypeScript so it can run in
the browser. `pnpm demo:fixtures` runs this script with the template's real
``analyzer`` package (pandas) and saves the output; the website's tests compare
the TypeScript port with it, case by case.

Usage:  python scripts/python/analyzer_parity.py <path to templates/student-result-analyzer>
        python scripts/python/analyzer_parity.py <template path> --cases <cases.json>

With ``--cases``, it reads a JSON list of ``{"name", "csv", "passMark"?, "maxMarks"?}`` and prints
one result per case instead (used by ``pnpm demo:compare`` for generated cases). An exception in
the analyzer is reported for that case rather than stopping the run.
"""

from __future__ import annotations

import hashlib
import json
import math
import platform
import sys
from pathlib import Path

TEMPLATE = Path(sys.argv[1]).resolve()
CASES_FILE = Path(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[2] == "--cases" else None
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

# Characters Python's str.strip() and \s treat differently from JavaScript's trim() and \s.
UNIT_SEPARATOR, NEXT_LINE, BYTE_ORDER_MARK, NO_BREAK_SPACE = chr(0x1F), chr(0x85), chr(0xFEFF), chr(0xA0)

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
    # Found by `pnpm demo:compare`: each of these once gave a different result in the port.
    "valid-but-unusual-numbers": (
        "Student ID,Name,Maths,Science\n"
        "U1,Ann,1e1,+5\n"
        "U2,Ben,007,-0\n"
        "U3,Cy,.5,5.\n"
        "U4,Di,1e-400,40.00\n"
    ),
    "overflowing-and-foreign-numbers": "Student ID,Name,Maths\nN1,Ann,1e400\nN2,Ben,inf\nN3,Cy,1_000\nN4,Di,\u0661\u0662\n",
    "python-whitespace": (
        "Student ID,Name,Class,Maths\n"
        f"{UNIT_SEPARATOR}W1,{NEXT_LINE}Asha{UNIT_SEPARATOR}Rao{NEXT_LINE},{NO_BREAK_SPACE}10-A,{UNIT_SEPARATOR}50\n"
        f"{BYTE_ORDER_MARK}W2,Ravi{BYTE_ORDER_MARK},10-A,60\n"
        f"{UNIT_SEPARATOR},Empty Id,10-B,70\n"
    ),
    "whitespace-only-file": "   ",
    "leading-blank-line": "\nStudent ID,Name,Maths\nS1,Ann,50\n",
    "ragged-row-after-a-quoted-line-break": 'Student ID,Name,Maths\nS1,"Ann\nLee",50\nS2,Ben,60,70\n',
    "duplicate-subject-name": "Student ID,Name,Maths,Maths\nD1,Ann,50\nD2,Ben,,60\nD3,Cy,40,AB\n",
    # pandas reads an all-integer column as integers (no -0); a decimal anywhere keeps -0.0.
    "negative-zero-in-integer-and-decimal-columns": "Student ID,Name,Maths,Science\nZ1,Ann,-0,-0\nZ2,Ben,44,4.5\n",
    # numpy's median is a mean of the middle values (never -0); one value is its own quartile.
    "zero-medians-and-single-value-quartiles": "Student ID,Name,Maths,Science\nM1,Ann,0.0,-0\nM2,Ben,-0,\nM3,Cy,92,\n",
    # Names without ASCII letters normalize to "": identical ones are now reported, not analysed.
    "identical-names-without-ascii-letters": "Student ID,Name,\u0917\u0923\u093f\u0924,\u0917\u0923\u093f\u0924\nS1,Ann,50,60\n",
    # Shapes random files rarely have (`--shapes` in compare-analyzer.ts): one student, no
    # score at all, everyone tied, and averages and percentages that end in 5.
    "one-student": "Student ID,Name,Class,Maths,Science\nO1,Ann,10-A,40,72.5\n",
    "everyone-absent": "Student ID,Name,Class,Maths,Science\nA1,Ann,10-A,AB,-\nA2,Ben,10-B,NA,absent\n",
    "identical-scores": "Student ID,Name,Maths,Science\nT1,Ann,55,55\nT2,Ben,55,55\nT3,Cy,55,55\n",
    "averages-that-round": (
        "Student ID,Name,Maths,Science\n"
        "R1,Ann,42.125,61.375\nR2,Ben,57.625,38.875\nR3,Cy,40.005,70.015\n"
    ),
    # Found by `pnpm demo:compare` once PyArrow was installed, as it is for every student. pandas
    # then runs str.replace(r"\s+") on RE2 for an all-ASCII column, whose \s leaves out \v and
    # U+001C to U+001F, and on Python's re once the column has a non-ASCII character.
    "control-characters-in-ascii-names": (
        "Student ID,Name,Maths\n"
        f"C1,Asha{UNIT_SEPARATOR}Rao,50\n"
        f"C2,Ravi{chr(0x0B)}Teja,60\n"
        f"C3,  Lena{chr(0x1C)}  Fischer ,70\n"
    ),
    "control-characters-beside-non-ascii-names": (
        "Student ID,Name,Maths\n"
        f"C1,Asha{UNIT_SEPARATOR}Rao,50\n"
        f"C2,Omar{chr(0x2029)}{chr(0x205F)}Farooq,80\n"
    ),
    # One class, no missing percentage: pandas 3 averages with numpy's reduceat, not Kahan.
    "one-class-average": (
        "Student ID,Name,Class,Maths\n"
        "C1,Ann,10-A,64.68\nC2,Ben,10-A,86.6\nC3,Cy,10-A,19.16\nC4,Di,10-A,83.63\nC5,Ed,10-A,49.78\nC6,Fa,10-A,65.07\n"
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


def compare_cases(path: Path) -> None:
    config = load_config(TEMPLATE / "app_config.json")
    results = []
    for item in json.loads(path.read_text(encoding="utf-8")):
        pass_mark = item.get("passMark", config.pass_mark)
        max_marks = item.get("maxMarks", config.max_marks)
        try:
            result = run_case(item["name"], item["csv"], pass_mark, max_marks)
        except Exception as error:  # a crash in the real analyzer is a finding too
            result = {"name": item["name"], "csv": item["csv"], "error": f"{type(error).__name__}: {error}"}
        results.append(result)
    json.dump(results, sys.stdout, ensure_ascii=False, allow_nan=False)
    sys.stdout.write("\n")


def require_student_environment() -> str:
    r"""Stops unless this Python has what `pip install -r requirements.txt` gives a student, and
    returns PyArrow's version.

    pandas 2.2 reads a few unusual numbers differently (for example "1e400"). And with PyArrow,
    which Streamlit installs, pandas 3 runs str.replace(r"\s+") on RE2 for an all-ASCII column,
    leaving \v and U+001C to U+001F inside names; without it, Python's re collapses them.
    """
    if int(pd.__version__.split(".")[0]) < 3:
        sys.exit(
            f"pandas {pd.__version__} is older than the pandas 3 a student installs. Run this with a "
            "Python that has the template's requirements.txt installed (see docs/demo-studio.md)."
        )
    try:
        import pyarrow
    except ImportError:
        sys.exit(
            "PyArrow is missing, but every student has it (Streamlit installs it), and pandas reads text "
            "differently without it. Run this with a Python that has the template's requirements.txt "
            "installed (see docs/demo-studio.md)."
        )
    return pyarrow.__version__


def main() -> None:
    pyarrow_version = require_student_environment()
    if CASES_FILE is not None:
        compare_cases(CASES_FILE)
        return
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
        "pyarrow": pyarrow_version,
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
