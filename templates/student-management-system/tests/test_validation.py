from datetime import date

from studentms.validation import (
    parse_date,
    validate_attendance_date,
    validate_course,
    validate_student,
    whole_number,
)

TODAY = date(2026, 10, 21)

VALID = {
    "roll_number": " 24cs099 ",
    "first_name": "  Nisha   ",
    "last_name": "Rao",
    "email": "Nisha.Rao@Example.EDU",
    "class_name": "BCA  1-A",
    "admission_date": "2024-07-15",
    "status": "active",
}


def test_valid_student_is_cleaned():
    result = validate_student(VALID, TODAY)
    assert result.ok, result.errors
    assert result.values["roll_number"] == "24CS099"
    assert result.values["first_name"] == "Nisha"
    assert result.values["email"] == "nisha.rao@example.edu"
    assert result.values["class_name"] == "BCA 1-A"


def test_empty_email_is_stored_as_none():
    result = validate_student({**VALID, "email": "  "}, TODAY)
    assert result.ok
    assert result.values["email"] is None


def test_required_fields_are_reported():
    result = validate_student({}, TODAY)
    assert set(result.errors) == {"roll_number", "first_name", "last_name", "class_name", "admission_date"}


def test_bad_values_are_explained():
    result = validate_student(
        {
            **VALID,
            "roll_number": "24 CS 099",
            "email": "not-an-email",
            "first_name": "x" * 51,
            "admission_date": "2026-02-30",
            "status": "expelled",
        },
        TODAY,
    )
    assert result.errors["roll_number"].startswith("Use 2 to 20 letters")
    assert "email" in result.errors
    assert result.errors["first_name"] == "Keep the first name to 50 characters."
    assert result.errors["admission_date"] == "Enter the admission date as YYYY-MM-DD."
    assert result.errors["status"] == "Choose active, inactive or graduated."


def test_admission_date_cannot_be_in_the_future():
    result = validate_student({**VALID, "admission_date": "2026-10-22"}, TODAY)
    assert result.errors["admission_date"] == "The admission date can’t be in the future."
    assert validate_student({**VALID, "admission_date": "2026-10-21"}, TODAY).ok


def test_course_validation():
    assert validate_course({"code": "cs101", "title": "Programming", "credits": "4"}).values["code"] == "CS101"
    result = validate_course({"code": "C1", "title": "", "credits": "11", "description": "x" * 501})
    assert set(result.errors) == {"code", "title", "credits", "description"}
    assert validate_course({"code": "CS101", "title": "A", "credits": "-1"}).errors["credits"]
    assert validate_course({"code": "CS101", "title": "A", "credits": "2.5"}).errors["credits"]


def test_dates():
    assert parse_date("2024-02-29") == date(2024, 2, 29)
    assert parse_date("2023-02-29") is None
    assert parse_date("21/10/2026") is None
    assert parse_date("") is None
    assert validate_attendance_date("2026-10-21", TODAY) == TODAY
    assert validate_attendance_date("2026-10-22", TODAY) == "Attendance can’t be marked for a future date."
    assert validate_attendance_date("tomorrow", TODAY) == "Choose a date as YYYY-MM-DD."


def test_only_digits_0_to_9_make_a_number():
    # Regression: "²".isdigit() is True but int("²") fails, which crashed the course form.
    assert whole_number("42") == 42
    for text in ("²", "٣", "", "-1", "1.5", " 7", "1" * 10):
        assert whole_number(text) is None, text
    assert validate_course({"code": "CS101", "title": "A", "credits": "²"}).errors["credits"]
    assert validate_course({"code": "CS101", "title": "A", "credits": "٣"}).errors["credits"]
