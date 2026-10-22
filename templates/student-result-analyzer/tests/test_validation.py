from __future__ import annotations

import pandas as pd

from analyzer.validation import normalize_header, validate_results
from conftest import csv_bytes


def messages(result) -> str:
    return "\n".join(issue.message for issue in result.errors + result.warnings)


def test_sample_dataset_is_valid(sample_bytes):
    result = validate_results(sample_bytes, max_marks=100)
    assert result.ok, messages(result)
    assert len(result.data) == 40
    assert result.subjects == ["Mathematics", "Science", "English", "Social Studies", "Computer Science"]
    # The sample deliberately contains two empty cells and one "AB" (absent) mark.
    assert int(result.data[result.subjects].isna().sum().sum()) == 3
    assert any("absent" in issue.message for issue in result.warnings)


def test_error_sample_reports_every_problem(error_sample_bytes):
    result = validate_results(error_sample_bytes, max_marks=100)
    assert not result.ok
    text = messages(result)
    assert "Name is empty on line(s) 4" in text
    assert "“S1002” appears more than once (lines 3, 5)" in text
    assert "“seventy” (line 5)" in text
    assert "105 (line 3)" in text
    assert "-4 (line 6)" in text


def test_headers_are_matched_case_insensitively_with_aliases():
    data = csv_bytes(
        """
        roll no,STUDENT NAME,Section,Maths
        7,Asha,A,88
        """
    )
    result = validate_results(data, max_marks=100)
    assert result.ok, messages(result)
    assert list(result.data.columns) == ["Student ID", "Name", "Class", "Maths"]


def test_missing_required_columns_are_explained():
    result = validate_results(csv_bytes("Roll,Maths\n1,50"), max_marks=100)
    assert "Required column(s) missing: Name" in messages(result)


def test_empty_and_header_only_files():
    assert "empty" in messages(validate_results(b"", max_marks=100))
    assert "no student rows" in messages(validate_results(b"Student ID,Name,Maths\n", max_marks=100))


def test_duplicate_and_blank_headers_are_rejected():
    assert "same name" in messages(validate_results(csv_bytes("Student ID,Name,Maths,maths\n1,A,1,2"), max_marks=100))
    assert "have no name" in messages(validate_results(csv_bytes("Student ID,Name,,Maths\n1,A,x,2"), max_marks=100))


def test_line_numbers_account_for_blank_lines():
    data = b"Student ID,Name,Maths\n1,Asha,50\n\n2,Ravi,abc\n"
    result = validate_results(data, max_marks=100)
    assert "“abc” (line 4)" in messages(result)


def test_respects_a_custom_maximum():
    data = csv_bytes("Student ID,Name,Maths\n1,Asha,55")
    assert "between 0 and 50" in messages(validate_results(data, max_marks=50))


def test_byte_order_mark_and_windows_encoding():
    utf8_bom = "﻿Student ID,Name,Maths\n1,Zoë,50\n".encode("utf-8")
    result = validate_results(utf8_bom, max_marks=100)
    assert result.ok and result.data.loc[0, "Name"] == "Zoë"

    cp1252 = "Student ID,Name,Maths\n1,Zoë,50\n".encode("cp1252")
    result = validate_results(cp1252, max_marks=100)
    assert result.ok and result.data.loc[0, "Name"] == "Zoë"
    assert "Windows-1252" in messages(result)


def test_unicode_names_are_kept():
    data = csv_bytes("Student ID,Name,Maths\nS1,अनन्या शर्मा,72\nS2,தமிழ்செல்வி,65")
    result = validate_results(data, max_marks=100)
    assert result.ok
    assert result.data["Name"].tolist() == ["अनन्या शर्मा", "தமிழ்செல்வி"]


def test_absent_markers_and_decimals():
    data = csv_bytes("Student ID,Name,Maths,Science\n1,Asha,AB,45.5\n2,Ravi,Absent,-")
    result = validate_results(data, max_marks=100)
    assert result.ok
    assert result.data["Maths"].isna().all()
    assert result.data.loc[0, "Science"] == 45.5
    assert pd.isna(result.data.loc[1, "Science"])
    assert "no scores in any subject" in messages(result)


def test_malformed_rows_are_reported():
    data = b"Student ID,Name,Maths\n1,Asha,50\n2,Ravi,60,extra,values\n"
    assert "could not be read as CSV" in messages(validate_results(data, max_marks=100))


def test_normalize_header():
    assert normalize_header("  Student ID ") == "student_id"
    assert normalize_header("Social-Studies (Theory)") == "social_studies_theory"
