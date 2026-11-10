"""The database layer on its own: schema, sample data, queries and constraints."""

import sqlite3
from datetime import date

import pytest

from studentms import repository
from studentms.db import backup_db, connect, init_db, is_empty, seed_db

TODAY = date(2026, 10, 21)


@pytest.fixture
def db(tmp_path):
    connection = connect(tmp_path / "test.db")
    init_db(connection)
    yield connection
    connection.close()


@pytest.fixture
def seeded(db):
    seed_db(db, TODAY)
    return db


def student(**changes):
    values = {
        "roll_number": "25CS100",
        "first_name": "Test",
        "last_name": "Student",
        "email": None,
        "class_name": "BCA 1-C",
        "admission_date": "2025-07-15",
        "status": "active",
    }
    return {**values, **changes}


def test_schema_can_run_twice_and_keeps_data(seeded):
    before = seeded.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    init_db(seeded)
    assert seeded.execute("SELECT COUNT(*) FROM students").fetchone()[0] == before == 12


def test_sample_data_is_the_same_every_time(tmp_path):
    def snapshot(name):
        connection = connect(tmp_path / name)
        init_db(connection)
        seed_db(connection, TODAY)
        rows = connection.execute("SELECT * FROM attendance ORDER BY 1, 2, 3").fetchall()
        connection.close()
        return [tuple(row) for row in rows]

    assert snapshot("a.db") == snapshot("b.db")


def test_new_database_is_empty_until_seeded(db):
    assert is_empty(db)
    seed_db(db, TODAY)
    assert not is_empty(db)


def test_create_read_update_delete(db):
    student_id = repository.create_student(db, student())
    assert repository.get_student(db, student_id)["first_name"] == "Test"
    repository.update_student(db, student_id, student(first_name="Changed"))
    assert repository.get_student(db, student_id)["first_name"] == "Changed"
    assert repository.delete_student(db, student_id) is True
    assert repository.get_student(db, student_id) is None
    assert repository.delete_student(db, student_id) is False


def test_duplicate_roll_number_and_email_are_reported_by_field(db):
    repository.create_student(db, student(email="a@example.edu"))
    with pytest.raises(repository.DuplicateError) as error:
        repository.create_student(db, student(roll_number="25cs100", email=None))
    assert error.value.field == "roll_number"
    with pytest.raises(repository.DuplicateError) as error:
        repository.create_student(db, student(roll_number="25CS101", email="A@EXAMPLE.EDU"))
    assert error.value.field == "email"


def test_check_constraints_back_up_the_validation(db):
    with pytest.raises(sqlite3.IntegrityError):
        repository.create_student(db, student(status="expelled"))


def test_deleting_a_student_cascades_to_enrollments_and_attendance(seeded):
    student_id = seeded.execute("SELECT id FROM students WHERE roll_number = '24CS001'").fetchone()[0]
    assert seeded.execute("SELECT COUNT(*) FROM attendance WHERE student_id = ?", (student_id,)).fetchone()[0] > 0
    repository.delete_student(seeded, student_id)
    for table in ("enrollments", "attendance"):
        count = seeded.execute(f"SELECT COUNT(*) FROM {table} WHERE student_id = ?", (student_id,)).fetchone()[0]
        assert count == 0, table


def test_search_filters_sorting_and_pages(seeded):
    rows, total = repository.list_students(seeded, repository.StudentQuery(search="sharma"), 10)
    assert total == 1 and rows[0]["roll_number"] == "24CS001"
    rows, total = repository.list_students(seeded, repository.StudentQuery(search="aarav sharma"), 10)
    assert total == 1
    _, total = repository.list_students(seeded, repository.StudentQuery(class_name="BCA 1-B"), 10)
    assert total == 4
    _, total = repository.list_students(seeded, repository.StudentQuery(status="graduated"), 10)
    assert total == 1
    rows, total = repository.list_students(seeded, repository.StudentQuery(sort="roll", page=2), 5)
    assert total == 12 and len(rows) == 5
    names = [row["last_name"] for row in repository.list_students(seeded, repository.StudentQuery(), 20)[0]]
    assert names == sorted(names, key=str.lower)
    descending = repository.list_students(seeded, repository.StudentQuery(sort="admitted", descending=True), 20)[0]
    assert descending[0]["admission_date"] >= descending[-1]["admission_date"]


def test_search_treats_percent_and_underscore_literally(seeded):
    assert repository.list_students(seeded, repository.StudentQuery(search="%"), 10)[1] == 0
    assert repository.list_students(seeded, repository.StudentQuery(search="_"), 10)[1] == 0
    assert repository.like_pattern("50%_off") == "%50\\%\\_off%"


def test_search_text_cannot_change_the_query(seeded):
    rows, total = repository.list_students(seeded, repository.StudentQuery(search="' OR '1'='1"), 10)
    assert total == 0 and rows == []
    assert seeded.execute("SELECT COUNT(*) FROM students").fetchone()[0] == 12


def test_unknown_sort_falls_back_to_name(seeded):
    rows, _ = repository.list_students(seeded, repository.StudentQuery(sort="1; DROP TABLE students"), 20)
    assert len(rows) == 12


def test_enrollment_rules(seeded):
    student_id = repository.create_student(seeded, student())
    course_id = seeded.execute("SELECT id FROM courses WHERE code = 'CS101'").fetchone()[0]
    assert repository.enroll(seeded, student_id, course_id, TODAY) is True
    assert repository.enroll(seeded, student_id, course_id, TODAY) is False
    assert repository.enroll(seeded, student_id, 9999, TODAY) is False
    assert [row["code"] for row in repository.student_courses(seeded, student_id)] == ["CS101"]
    assert repository.unenroll(seeded, student_id, course_id) is True


def test_attendance_upsert_and_only_enrolled_students(seeded):
    course_id = seeded.execute("SELECT id FROM courses WHERE code = 'CS101'").fetchone()[0]
    sheet = repository.attendance_sheet(seeded, course_id, TODAY)
    assert sheet and all(row["status"] is None for row in sheet)
    first, second = sheet[0]["id"], sheet[1]["id"]
    outsider = seeded.execute("SELECT id FROM students WHERE class_name = 'BCA 2-A'").fetchone()[0]
    saved = repository.save_attendance(seeded, course_id, TODAY, {first: "present", second: "absent", outsider: "present"})
    assert saved == 2
    repository.save_attendance(seeded, course_id, TODAY, {second: "late"})
    marks = {row["id"]: row["status"] for row in repository.attendance_sheet(seeded, course_id, TODAY)}
    assert marks[first] == "present" and marks[second] == "late"


def test_removing_an_enrollment_removes_its_attendance(seeded):
    row = seeded.execute("SELECT student_id, course_id FROM attendance LIMIT 1").fetchone()
    repository.unenroll(seeded, row["student_id"], row["course_id"])
    count = seeded.execute(
        "SELECT COUNT(*) FROM attendance WHERE student_id = ? AND course_id = ?", (row["student_id"], row["course_id"])
    ).fetchone()[0]
    assert count == 0


def test_statistics_match_the_data(seeded):
    stats = repository.statistics(seeded, TODAY)
    assert stats["students"] == 12
    assert stats["by_status"] == {"active": 10, "inactive": 1, "graduated": 1}
    assert stats["courses"] == 4
    marked, attended = seeded.execute(
        "SELECT COUNT(*), SUM(status IN ('present', 'late')) FROM attendance WHERE date >= '2026-09-21'"
    ).fetchone()
    assert stats["marks_last_30_days"] == marked
    assert stats["attendance_rate"] == round(100 * attended / marked, 1)


def test_statistics_on_an_empty_database(db):
    stats = repository.statistics(db, TODAY)
    assert stats["students"] == 0 and stats["attendance_rate"] is None


def test_percent():
    assert repository.percent(1, 3) == 33.3
    assert repository.percent(0, 0) is None


def test_backup_is_a_complete_copy(seeded, tmp_path):
    seeded.commit()
    target = backup_db(tmp_path / "test.db", tmp_path / "backups")
    copy = connect(target)
    assert copy.execute("SELECT COUNT(*) FROM students").fetchone()[0] == 12
    copy.close()
