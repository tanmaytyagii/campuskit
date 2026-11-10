"""Runs the Student Management System template's own Python code and prints its results as JSON.

The Demo Studio simulates this Flask app in the browser. `pnpm demo:fixtures:students` runs
this script and saves the output; the website's tests check that the simulation's validation,
sample data, searching, sorting, paging and statistics give the same results, case by case.

Usage:  python scripts/python/sms_parity.py <path to templates/student-management-system>

Needs the template's requirements (Flask), because studentms imports it.
"""

from __future__ import annotations

import hashlib
import json
import platform
import sqlite3
import sys
from datetime import date
from pathlib import Path

TEMPLATE = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(TEMPLATE))

from studentms import repository  # noqa: E402
from studentms.db import init_db, seed_db  # noqa: E402
from studentms.validation import validate_attendance_date, validate_course, validate_student  # noqa: E402

# Files whose behaviour the simulation reproduces. If any changes, the website's tests ask for
# this script to be run again.
SOURCES = ["studentms/validation.py", "studentms/repository.py", "studentms/db.py", "studentms/schema.sql"]

TODAY = date(2026, 10, 21)

VALID_STUDENT = {
    "roll_number": "25CS100",
    "first_name": "Kavya",
    "last_name": "Rao",
    "email": "",
    "class_name": "BCA 1-C",
    "admission_date": "2025-07-15",
    "status": "active",
}

STUDENT_CASES = {
    "valid": VALID_STUDENT,
    "cleaned": {**VALID_STUDENT, "roll_number": "  25cs100 ", "first_name": "  Kavya   Sri ", "email": " Kavya@Example.EDU ", "class_name": "BCA   1-C"},
    "empty": {},
    "only-spaces": {key: "   " for key in VALID_STUDENT},
    "roll-with-space": {**VALID_STUDENT, "roll_number": "25 CS 100"},
    "roll-with-slash-and-dash": {**VALID_STUDENT, "roll_number": "25/CS-100"},
    "roll-too-short": {**VALID_STUDENT, "roll_number": "A"},
    "roll-starts-with-dash": {**VALID_STUDENT, "roll_number": "-25CS"},
    "roll-21-characters": {**VALID_STUDENT, "roll_number": "A" * 21},
    "name-50-characters": {**VALID_STUDENT, "first_name": "x" * 50},
    "name-51-characters": {**VALID_STUDENT, "last_name": "x" * 51},
    "unicode-names": {**VALID_STUDENT, "first_name": "Zoë", "last_name": "अनन्या"},
    "bad-email": {**VALID_STUDENT, "email": "kavya.example.edu"},
    "email-two-ats": {**VALID_STUDENT, "email": "a@b@example.edu"},
    "email-no-dot": {**VALID_STUDENT, "email": "kavya@localhost"},
    "email-121-characters": {**VALID_STUDENT, "email": "a" * 109 + "@example.edu"},
    "class-31-characters": {**VALID_STUDENT, "class_name": "C" * 31},
    "date-in-future": {**VALID_STUDENT, "admission_date": "2026-10-22"},
    "date-today": {**VALID_STUDENT, "admission_date": "2026-10-21"},
    "date-february-30": {**VALID_STUDENT, "admission_date": "2026-02-30"},
    "date-leap-day": {**VALID_STUDENT, "admission_date": "2024-02-29"},
    "date-other-format": {**VALID_STUDENT, "admission_date": "15/07/2025"},
    "date-single-digits": {**VALID_STUDENT, "admission_date": "2025-7-5"},
    "date-year-50": {**VALID_STUDENT, "admission_date": "0050-01-01"},
    "date-year-0": {**VALID_STUDENT, "admission_date": "0000-01-01"},
    "date-1900-february-29": {**VALID_STUDENT, "admission_date": "1900-02-29"},
    "date-2000-february-29": {**VALID_STUDENT, "admission_date": "2000-02-29"},
    # \d matches these in Python, but date.fromisoformat() refuses them.
    "date-arabic-indic-digits": {**VALID_STUDENT, "admission_date": "\u0662\u0660\u0662\u0665-\u0660\u0667-\u0661\u0665"},
    "status-unknown": {**VALID_STUDENT, "status": "expelled"},
    "status-missing": {key: value for key, value in VALID_STUDENT.items() if key != "status"},
    "status-graduated": {**VALID_STUDENT, "status": "graduated"},
}

VALID_COURSE = {"code": "PY150", "title": "Python Projects", "credits": "3", "description": ""}

COURSE_CASES = {
    "valid": VALID_COURSE,
    "lower-case-code": {**VALID_COURSE, "code": " py150 "},
    "empty": {},
    "code-one-letter": {**VALID_COURSE, "code": "P150"},
    "code-five-letters": {**VALID_COURSE, "code": "PYTHO150"},
    "code-five-digits": {**VALID_COURSE, "code": "PY15000"},
    "credits-zero": {**VALID_COURSE, "credits": "0"},
    "credits-eleven": {**VALID_COURSE, "credits": "11"},
    "credits-decimal": {**VALID_COURSE, "credits": "2.5"},
    "credits-negative": {**VALID_COURSE, "credits": "-1"},
    "credits-text": {**VALID_COURSE, "credits": "three"},
    # str.isdigit() accepts these, int() doesn't (or reads them as 3): both are refused.
    "credits-superscript": {**VALID_COURSE, "credits": "\u00b2"},
    "credits-arabic-indic": {**VALID_COURSE, "credits": "\u0663"},
    "title-81-characters": {**VALID_COURSE, "title": "T" * 81},
    "description-501-characters": {**VALID_COURSE, "description": "d" * 501},
    "description-kept-as-typed": {**VALID_COURSE, "description": "  Two   spaces  "},
}

DATE_CASES = ["2026-10-21", "2026-10-20", "2026-10-22", "2026-02-30", "21-10-2026", "", " 2026-10-01 ", "0050-01-01"]

# (part, whole) pairs for repository.percent(), including exact ties such as 13/16 = 81.25,
# which Python's round() takes to the even digit (81.2).
PERCENT_CASES = [(0, 0), (0, 5), (1, 3), (2, 3), (1, 8), (1, 16), (3, 16), (13, 16), (15, 16), (1, 80), (3, 80), (3, 4), (274, 300)]

QUERIES = {
    "default": {},
    "search-last-name": {"search": "sharma"},
    "search-full-name": {"search": "aarav sharma"},
    "search-roll-number": {"search": "23cs"},
    "search-email": {"search": "example.edu"},
    "search-percent": {"search": "%"},
    "search-underscore": {"search": "_"},
    "search-quote": {"search": "' OR '1'='1"},
    "class": {"class_name": "BCA 1-B"},
    "status": {"status": "graduated"},
    "class-and-status": {"class_name": "BCA 1-B", "status": "active"},
    "sort-roll": {"sort": "roll"},
    "sort-class-descending": {"sort": "class", "descending": True},
    "sort-admitted": {"sort": "admitted"},
    "sort-admitted-descending": {"sort": "admitted", "descending": True},
    "sort-unknown": {"sort": "password"},
    "page-2": {"page": 2},
    "page-past-end": {"page": 9},
}


def rows(cursor_rows) -> list[dict]:
    return [dict(row) for row in cursor_rows]


def main() -> None:
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    init_db(connection)
    seed_db(connection, TODAY)

    output = {
        "description": "Results of the Student Management System template's Python code, for the Demo Studio's simulation tests. Regenerate with `pnpm demo:fixtures:students`.",
        "python": platform.python_version(),
        "sqlite": sqlite3.sqlite_version,
        "today": TODAY.isoformat(),
        "sources": {path: hashlib.sha256((TEMPLATE / path).read_bytes()).hexdigest() for path in SOURCES},
        "validation": {
            "students": {
                name: {"form": form, **vars(validate_student(form, TODAY))} for name, form in STUDENT_CASES.items()
            },
            "courses": {name: {"form": form, **vars(validate_course(form))} for name, form in COURSE_CASES.items()},
            "dates": {
                text: (value.isoformat() if isinstance((value := validate_attendance_date(text, TODAY)), date) else {"error": value})
                for text in DATE_CASES
            },
        },
        "likePatterns": {text: repository.like_pattern(text) for text in ["sharma", "50%_off", "a\\b"]},
        "percent": [[part, whole, repository.percent(part, whole)] for part, whole in PERCENT_CASES],
        "sample": {
            table: rows(connection.execute(f"SELECT * FROM {table} ORDER BY 1, 2"))
            for table in ("students", "courses", "enrollments", "attendance")
        },
        "queries": {},
        "statistics": None,
    }
    for name, values in QUERIES.items():
        found, total = repository.list_students(connection, repository.StudentQuery(**values), 10)
        output["queries"][name] = {"query": values, "ids": [row["id"] for row in found], "total": total}
    stats = repository.statistics(connection, TODAY)
    output["statistics"] = {
        key: (rows(value) if isinstance(value, list) else value) for key, value in stats.items()
    }
    # created_at and updated_at come from SQLite's clock; the simulation doesn't model them.
    for student in output["sample"]["students"]:
        student.pop("created_at")
        student.pop("updated_at")
    json.dump(output, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
