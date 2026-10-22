from __future__ import annotations

import math

import pytest

from analyzer import analysis, explain
from analyzer.grading import describe_scale, grade_for
from analyzer.validation import validate_results
from conftest import csv_bytes

SMALL = csv_bytes(
    """
    Student ID,Name,Class,Maths,Science
    S1,Asha,A,90,80
    S2,Ravi,A,70,30
    S3,Meena,B,50,
    S4,John,B,90,80
    """
)


@pytest.fixture
def small():
    result = validate_results(SMALL, max_marks=100)
    assert result.ok
    return result.data, result.subjects


@pytest.mark.parametrize(
    ("percentage", "pass_mark", "grade"),
    [
        (100, 40, "A+"),
        (90, 40, "A+"),
        (89.99, 40, "A"),
        (80, 40, "A"),
        (70, 40, "B"),
        (60, 40, "C"),
        (59.9, 40, "D"),
        (40, 40, "D"),
        (39.9, 40, "F"),
        (35, 33, "D"),
        (float("nan"), 40, None),
    ],
)
def test_grade_boundaries(percentage, pass_mark, grade):
    assert grade_for(percentage, pass_mark) == grade


def test_grading_scale_description_handles_a_60_percent_pass_mark():
    assert dict(describe_scale(60))["D"].startswith("not used")


def test_subject_statistics_match_hand_calculations(small):
    data, subjects = small
    stats = analysis.subject_statistics(data, subjects, pass_mark=40, max_marks=100).set_index("Subject")
    maths = stats.loc["Maths"]
    assert maths["Count"] == 4
    assert maths["Mean"] == pytest.approx(75.0)
    assert maths["Median"] == pytest.approx(80.0)
    assert maths["Std dev"] == pytest.approx(19.148542, rel=1e-6)  # sample standard deviation
    assert maths["Q1"] == pytest.approx(65.0)
    assert maths["Pass rate %"] == pytest.approx(100.0)
    science = stats.loc["Science"]
    assert science["Count"] == 3 and science["Missing"] == 1
    assert science["Mean"] == pytest.approx(63.333333, rel=1e-6)
    assert science["Passed"] == 2


def test_student_results_percentages_results_and_ranks(small):
    data, subjects = small
    results = analysis.student_results(data, subjects, pass_mark=40, max_marks=100).set_index("Student ID")
    assert results.loc["S1", "Percentage"] == pytest.approx(85.0)
    assert results.loc["S1", "Grade"] == "A"
    assert results.loc["S1", "Result"] == "Pass"
    # Meena has only one score: 50 out of 100.
    assert results.loc["S3", "Percentage"] == pytest.approx(50.0)
    assert results.loc["S3", "Result"] == "Incomplete"
    # Ravi failed Science (30 < 40).
    assert results.loc["S2", "Result"] == "Fail"
    assert results.loc["S2", "Below pass mark in"] == "Science"
    # Asha and John tie on 85% and share rank 1.
    assert results.loc["S1", "Rank"] == 1 and results.loc["S4", "Rank"] == 1
    assert results.loc["S2", "Rank"] == 3


def test_a_failed_subject_outranks_a_missing_one():
    data = csv_bytes("Student ID,Name,Maths,Science\nS1,Asha,20,")
    result = validate_results(data, max_marks=100)
    results = analysis.student_results(result.data, result.subjects, pass_mark=40, max_marks=100)
    assert results.loc[0, "Result"] == "Fail"


def test_grade_distribution_includes_every_grade(small):
    data, subjects = small
    results = analysis.student_results(data, subjects, pass_mark=40, max_marks=100)
    distribution = analysis.grade_distribution(results["Grade"])
    assert distribution["Grade"].tolist() == ["A+", "A", "B", "C", "D", "F"]
    assert dict(zip(distribution["Grade"], distribution["Students"])) == {"A+": 0, "A": 2, "B": 0, "C": 0, "D": 2, "F": 0}
    assert distribution["Share %"].sum() == pytest.approx(100.0)


def test_missing_value_detection(small):
    data, subjects = small
    missing = analysis.missing_summary(data, subjects).set_index("Subject")
    assert missing.loc["Science", "Missing"] == 1
    assert missing.loc["Science", "Missing %"] == pytest.approx(25.0)
    students = analysis.students_with_missing(data, subjects)
    assert students.to_dict("records") == [{"Student ID": "S3", "Name": "Meena", "Missing subjects": "Science"}]


def test_class_summary(small):
    data, subjects = small
    results = analysis.student_results(data, subjects, pass_mark=40, max_marks=100)
    summary = analysis.class_summary(results).set_index("Class")
    assert summary.loc["A", "Students"] == 2
    assert summary.loc["A", "Average %"] == pytest.approx(67.5)
    assert summary.loc["B", "Passed"] == 1


def test_explanations_use_the_actual_numbers(small):
    data, subjects = small
    stats = analysis.subject_statistics(data, subjects, 40, 100)
    results = analysis.student_results(data, subjects, 40, 100)
    summary = analysis.overview(results, stats)
    assert summary.highest_subject == "Maths" and summary.lowest_subject == "Science"
    text = " ".join(explain.explain_overview(summary, 40) + explain.explain_subjects(stats))
    assert "4 students and 2 subjects" in text
    assert "Maths has the highest average (75.0)" in text
    assert "Science has the lowest pass rate: 2 of 3 students (66.7%)" in text
    missing = analysis.missing_summary(data, subjects)
    assert "1 score(s) are missing" in " ".join(explain.explain_missing(missing, 1))


def test_sample_dataset_end_to_end(sample_bytes):
    result = validate_results(sample_bytes, max_marks=100)
    stats = analysis.subject_statistics(result.data, result.subjects, 40, 100)
    results = analysis.student_results(result.data, result.subjects, 40, 100)
    summary = analysis.overview(results, stats)
    assert summary.students == 40
    assert summary.passed + summary.failed + summary.incomplete == 40
    assert not math.isnan(summary.average_percentage)
