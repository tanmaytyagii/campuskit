"""The grading scale used for overall and subject grades.

Grades are based on percentages:

    A+  90 and above
    A   80 to below 90
    B   70 to below 80
    C   60 to below 70
    D   pass mark to below 60
    F   below the pass mark

Change the bands here if your institution uses a different scale, and update
the tests in tests/test_analysis.py to match.
"""

from __future__ import annotations

import math

GRADE_ORDER: tuple[str, ...] = ("A+", "A", "B", "C", "D", "F")

# (grade, minimum percentage) for the fixed bands, highest first.
FIXED_BANDS: tuple[tuple[str, float], ...] = (("A+", 90.0), ("A", 80.0), ("B", 70.0), ("C", 60.0))


def grade_for(percentage: float, pass_mark: float) -> str | None:
    """Returns the grade for a percentage, or None when there is no score."""
    if percentage is None or (isinstance(percentage, float) and math.isnan(percentage)):
        return None
    for grade, minimum in FIXED_BANDS:
        if percentage >= minimum:
            return grade
    return "D" if percentage >= pass_mark else "F"


def describe_scale(pass_mark: int) -> list[tuple[str, str]]:
    """Human-readable bands, e.g. [("A+", "90% and above"), ...]."""
    d_band = f"{pass_mark}% to below 60%" if pass_mark < 60 else "not used (the pass mark is 60%)"
    return [
        ("A+", "90% and above"),
        ("A", "80% to below 90%"),
        ("B", "70% to below 80%"),
        ("C", "60% to below 70%"),
        ("D", d_band),
        ("F", f"below {pass_mark}%"),
    ]
