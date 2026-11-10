"""Checks what people type into the forms. Pure functions: no Flask and no database, so
they are easy to test. Each returns the cleaned values and a dict of errors by field."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from typing import Mapping

STATUSES = ("active", "inactive", "graduated")
ATTENDANCE_STATUSES = ("present", "late", "absent")

ROLL_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9/-]{1,19}$")
# Deliberately simple: one @, something before it, and a dot in the domain.
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
COURSE_CODE_PATTERN = re.compile(r"^[A-Za-z]{2,4}[0-9]{2,4}$")


@dataclass
class Result:
    values: dict[str, object] = field(default_factory=dict)
    errors: dict[str, str] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return not self.errors


def _clean(form: Mapping[str, str], key: str) -> str:
    """The submitted text with surrounding spaces removed and inner runs of spaces collapsed."""
    return " ".join(str(form.get(key, "")).split())


def whole_number(text: str) -> int | None:
    """A whole number written with the digits 0 to 9, or None. (str.isdigit() also accepts
    characters such as ² that int() can't convert, which would crash the app.)"""
    return int(text) if re.fullmatch(r"[0-9]{1,9}", text) else None


def parse_date(text: str) -> date | None:
    """A real calendar date written as YYYY-MM-DD, or None."""
    try:
        return date.fromisoformat(text) if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text) else None
    except ValueError:
        return None


def validate_student(form: Mapping[str, str], today: date | None = None) -> Result:
    today = today or date.today()
    result = Result()
    roll = _clean(form, "roll_number").upper()
    if not roll:
        result.errors["roll_number"] = "Enter a roll number."
    elif not ROLL_PATTERN.fullmatch(roll):
        result.errors["roll_number"] = "Use 2 to 20 letters, digits, / or -, for example 24CS001."
    for key, label in (("first_name", "first name"), ("last_name", "last name")):
        value = _clean(form, key)
        if not value:
            result.errors[key] = f"Enter the {label}."
        elif len(value) > 50:
            result.errors[key] = f"Keep the {label} to 50 characters."
        result.values[key] = value
    email = _clean(form, "email").lower()
    if email and (len(email) > 120 or not EMAIL_PATTERN.fullmatch(email)):
        result.errors["email"] = "Enter an email address like name@example.edu, or leave it empty."
    class_name = _clean(form, "class_name")
    if not class_name:
        result.errors["class_name"] = "Enter the class or section, for example BCA 1-A."
    elif len(class_name) > 30:
        result.errors["class_name"] = "Keep the class to 30 characters."
    admitted_text = _clean(form, "admission_date")
    admitted = parse_date(admitted_text)
    if admitted is None:
        result.errors["admission_date"] = "Enter the admission date as YYYY-MM-DD."
    elif admitted > today:
        result.errors["admission_date"] = "The admission date can’t be in the future."
    status = _clean(form, "status") or "active"
    if status not in STATUSES:
        result.errors["status"] = "Choose active, inactive or graduated."
    result.values.update(
        roll_number=roll,
        email=email or None,
        class_name=class_name,
        admission_date=admitted_text,
        status=status,
    )
    return result


def validate_course(form: Mapping[str, str]) -> Result:
    result = Result()
    code = _clean(form, "code").upper()
    if not COURSE_CODE_PATTERN.fullmatch(code):
        result.errors["code"] = "Use 2 to 4 letters and 2 to 4 digits, for example CS101."
    title = _clean(form, "title")
    if not title:
        result.errors["title"] = "Enter the course title."
    elif len(title) > 80:
        result.errors["title"] = "Keep the title to 80 characters."
    credits_text = _clean(form, "credits")
    credits = whole_number(credits_text)
    if credits is None or not 1 <= credits <= 10:
        result.errors["credits"] = "Enter a whole number of credits from 1 to 10."
    description = str(form.get("description", "")).strip()
    if len(description) > 500:
        result.errors["description"] = "Keep the description to 500 characters."
    result.values.update(code=code, title=title, credits=credits, description=description)
    return result


def validate_attendance_date(text: str, today: date | None = None) -> date | str:
    """The date to mark attendance for, or an error message."""
    today = today or date.today()
    day = parse_date(text.strip())
    if day is None:
        return "Choose a date as YYYY-MM-DD."
    if day > today:
        return "Attendance can’t be marked for a future date."
    return day
