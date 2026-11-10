"""Every SQL query the app runs. Values always go in as ? parameters, never into the SQL
text, so what someone types can't change a query (SQL injection). The only parts built from
input are ORDER BY columns, and those come from the fixed SORT_COLUMNS table."""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Mapping

# The sort options the student list offers, and the SQL each one means.
SORT_COLUMNS = {
    "name": "s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE",
    "roll": "s.roll_number COLLATE NOCASE",
    "class": "s.class_name COLLATE NOCASE, s.last_name COLLATE NOCASE",
    "admitted": "s.admission_date, s.roll_number",
}

# Present and late both count as attending a class.
ATTENDED = "SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END)"


class DuplicateError(ValueError):
    """Raised when a value that must be unique, such as a roll number, is already used."""

    def __init__(self, field: str, message: str) -> None:
        super().__init__(message)
        self.field = field


def _duplicate(error: sqlite3.IntegrityError, fields: Mapping[str, str]) -> DuplicateError | None:
    """Turns SQLite's "UNIQUE constraint failed: students.roll_number" into a form error."""
    text = str(error)
    for column, message in fields.items():
        if f".{column}" in text:
            return DuplicateError(column, message)
    return None


def like_pattern(text: str) -> str:
    """A LIKE pattern that matches `text` anywhere. % and _ in the text are matched literally."""
    escaped = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


@dataclass(frozen=True)
class StudentQuery:
    search: str = ""
    class_name: str = ""
    status: str = ""
    sort: str = "name"
    descending: bool = False
    page: int = 1


def list_students(db: sqlite3.Connection, query: StudentQuery, per_page: int) -> tuple[list[sqlite3.Row], int]:
    """One page of students matching the search and filters, and how many match in total."""
    conditions: list[str] = []
    parameters: list[object] = []
    if query.search:
        pattern = like_pattern(query.search)
        conditions.append(
            "(s.first_name || ' ' || s.last_name LIKE ? ESCAPE '\\'"
            " OR s.roll_number LIKE ? ESCAPE '\\' OR s.email LIKE ? ESCAPE '\\')"
        )
        parameters += [pattern, pattern, pattern]
    if query.class_name:
        conditions.append("s.class_name = ?")
        parameters.append(query.class_name)
    if query.status:
        conditions.append("s.status = ?")
        parameters.append(query.status)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    total = db.execute(f"SELECT COUNT(*) FROM students s {where}", parameters).fetchone()[0]
    order = SORT_COLUMNS.get(query.sort, SORT_COLUMNS["name"])
    if query.descending:
        order = ", ".join(f"{part} DESC" for part in order.split(", "))
    page = max(1, query.page)
    rows = db.execute(
        f"SELECT s.*, (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = s.id) AS course_count"
        f" FROM students s {where} ORDER BY {order} LIMIT ? OFFSET ?",
        [*parameters, per_page, (page - 1) * per_page],
    ).fetchall()
    return rows, total


def class_names(db: sqlite3.Connection) -> list[str]:
    return [row[0] for row in db.execute("SELECT DISTINCT class_name FROM students ORDER BY 1")]


def get_student(db: sqlite3.Connection, student_id: int) -> sqlite3.Row | None:
    return db.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()


STUDENT_DUPLICATES = {
    "roll_number": "Another student already has this roll number.",
    "email": "Another student already has this email address.",
}


def create_student(db: sqlite3.Connection, values: Mapping[str, object]) -> int:
    try:
        cursor = db.execute(
            "INSERT INTO students (roll_number, first_name, last_name, email, class_name,"
            " admission_date, status) VALUES (:roll_number, :first_name, :last_name, :email,"
            " :class_name, :admission_date, :status)",
            values,
        )
    except sqlite3.IntegrityError as error:
        db.rollback()
        raise _duplicate(error, STUDENT_DUPLICATES) or error
    db.commit()
    return int(cursor.lastrowid or 0)


def update_student(db: sqlite3.Connection, student_id: int, values: Mapping[str, object]) -> None:
    try:
        db.execute(
            "UPDATE students SET roll_number = :roll_number, first_name = :first_name,"
            " last_name = :last_name, email = :email, class_name = :class_name,"
            " admission_date = :admission_date, status = :status, updated_at = datetime('now')"
            " WHERE id = :id",
            {**values, "id": student_id},
        )
    except sqlite3.IntegrityError as error:
        db.rollback()
        raise _duplicate(error, STUDENT_DUPLICATES) or error
    db.commit()


def delete_student(db: sqlite3.Connection, student_id: int) -> bool:
    """Deletes a student; their enrollments and attendance go with them (ON DELETE CASCADE)."""
    deleted = db.execute("DELETE FROM students WHERE id = ?", (student_id,)).rowcount
    db.commit()
    return deleted == 1


def student_courses(db: sqlite3.Connection, student_id: int) -> list[sqlite3.Row]:
    """The student's courses, each with their attendance so far."""
    return db.execute(
        f"SELECT c.id, c.code, c.title, c.credits, e.enrolled_on,"
        f" COUNT(a.date) AS marked, COALESCE({ATTENDED}, 0) AS attended"
        f" FROM enrollments e JOIN courses c ON c.id = e.course_id"
        f" LEFT JOIN attendance a ON a.student_id = e.student_id AND a.course_id = e.course_id"
        f" WHERE e.student_id = ? GROUP BY c.id ORDER BY c.code",
        (student_id,),
    ).fetchall()


def courses_not_taken(db: sqlite3.Connection, student_id: int) -> list[sqlite3.Row]:
    return db.execute(
        "SELECT id, code, title FROM courses WHERE id NOT IN"
        " (SELECT course_id FROM enrollments WHERE student_id = ?) ORDER BY code",
        (student_id,),
    ).fetchall()


def enroll(db: sqlite3.Connection, student_id: int, course_id: int, today: date) -> bool:
    """Adds the student to the course. False when they already take it, or either doesn't exist."""
    try:
        db.execute(
            "INSERT INTO enrollments (student_id, course_id, enrolled_on) VALUES (?, ?, ?)",
            (student_id, course_id, today.isoformat()),
        )
    except sqlite3.IntegrityError:
        db.rollback()
        return False
    db.commit()
    return True


def unenroll(db: sqlite3.Connection, student_id: int, course_id: int) -> bool:
    """Removes the student from the course, with their attendance for it."""
    removed = db.execute(
        "DELETE FROM enrollments WHERE student_id = ? AND course_id = ?", (student_id, course_id)
    ).rowcount
    db.commit()
    return removed == 1


# ---------------------------------------------------------------------------
# Courses
# ---------------------------------------------------------------------------

COURSE_DUPLICATES = {"code": "Another course already has this code."}


def list_courses(db: sqlite3.Connection) -> list[sqlite3.Row]:
    return db.execute(
        "SELECT c.*, COUNT(e.student_id) AS student_count FROM courses c"
        " LEFT JOIN enrollments e ON e.course_id = c.id GROUP BY c.id ORDER BY c.code"
    ).fetchall()


def get_course(db: sqlite3.Connection, course_id: int) -> sqlite3.Row | None:
    return db.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()


def create_course(db: sqlite3.Connection, values: Mapping[str, object]) -> int:
    try:
        cursor = db.execute(
            "INSERT INTO courses (code, title, credits, description)"
            " VALUES (:code, :title, :credits, :description)",
            values,
        )
    except sqlite3.IntegrityError as error:
        db.rollback()
        raise _duplicate(error, COURSE_DUPLICATES) or error
    db.commit()
    return int(cursor.lastrowid or 0)


def update_course(db: sqlite3.Connection, course_id: int, values: Mapping[str, object]) -> None:
    try:
        db.execute(
            "UPDATE courses SET code = :code, title = :title, credits = :credits,"
            " description = :description WHERE id = :id",
            {**values, "id": course_id},
        )
    except sqlite3.IntegrityError as error:
        db.rollback()
        raise _duplicate(error, COURSE_DUPLICATES) or error
    db.commit()


def delete_course(db: sqlite3.Connection, course_id: int) -> bool:
    deleted = db.execute("DELETE FROM courses WHERE id = ?", (course_id,)).rowcount
    db.commit()
    return deleted == 1


def course_roster(db: sqlite3.Connection, course_id: int) -> list[sqlite3.Row]:
    """The students taking a course, each with their attendance in it."""
    return db.execute(
        f"SELECT s.id, s.roll_number, s.first_name, s.last_name, s.class_name, s.status,"
        f" COUNT(a.date) AS marked, COALESCE({ATTENDED}, 0) AS attended"
        f" FROM enrollments e JOIN students s ON s.id = e.student_id"
        f" LEFT JOIN attendance a ON a.student_id = e.student_id AND a.course_id = e.course_id"
        f" WHERE e.course_id = ? GROUP BY s.id ORDER BY s.last_name, s.first_name",
        (course_id,),
    ).fetchall()


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------


def attendance_sheet(db: sqlite3.Connection, course_id: int, day: date) -> list[sqlite3.Row]:
    """Every active student taking the course, with their mark for `day` (None if unmarked)."""
    return db.execute(
        "SELECT s.id, s.roll_number, s.first_name, s.last_name, a.status"
        " FROM enrollments e JOIN students s ON s.id = e.student_id"
        " LEFT JOIN attendance a ON a.student_id = e.student_id AND a.course_id = e.course_id"
        " AND a.date = ? WHERE e.course_id = ? AND s.status = 'active'"
        " ORDER BY s.last_name, s.first_name",
        (day.isoformat(), course_id),
    ).fetchall()


def save_attendance(db: sqlite3.Connection, course_id: int, day: date, marks: Mapping[int, str]) -> int:
    """Saves one mark per student for the day, replacing earlier marks. Students who don't
    take the course are skipped. Returns how many marks were saved."""
    enrolled = {
        row[0]
        for row in db.execute("SELECT student_id FROM enrollments WHERE course_id = ?", (course_id,))
    }
    rows = [
        (student_id, course_id, day.isoformat(), status)
        for student_id, status in marks.items()
        if student_id in enrolled
    ]
    # INSERT ... ON CONFLICT ... DO UPDATE is an "upsert": insert, or update the existing mark.
    db.executemany(
        "INSERT INTO attendance (student_id, course_id, date, status) VALUES (?, ?, ?, ?)"
        " ON CONFLICT (student_id, course_id, date) DO UPDATE SET status = excluded.status",
        rows,
    )
    db.commit()
    return len(rows)


def marked_dates(db: sqlite3.Connection, course_id: int, limit: int = 10) -> list[sqlite3.Row]:
    """The most recent days with marks for the course, with counts."""
    return db.execute(
        f"SELECT a.date, COUNT(*) AS marked, {ATTENDED} AS attended FROM attendance a"
        f" WHERE a.course_id = ? GROUP BY a.date ORDER BY a.date DESC LIMIT ?",
        (course_id, limit),
    ).fetchall()


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------


def percent(part: int, whole: int) -> float | None:
    """`part` as a percentage of `whole`, to one decimal place; None when there is nothing to count."""
    return round(100 * part / whole, 1) if whole else None


def statistics(db: sqlite3.Connection, today: date) -> dict[str, object]:
    """The figures the dashboard and the statistics page show, all calculated from the data."""
    by_status = {row["status"]: row["count"] for row in db.execute(
        "SELECT status, COUNT(*) AS count FROM students GROUP BY status")}
    since = (today - timedelta(days=30)).isoformat()
    recent = db.execute(
        f"SELECT COUNT(*) AS marked, COALESCE({ATTENDED}, 0) AS attended FROM attendance a WHERE a.date >= ?",
        (since,),
    ).fetchone()
    return {
        "students": sum(by_status.values()),
        "by_status": {status: by_status.get(status, 0) for status in ("active", "inactive", "graduated")},
        "courses": db.execute("SELECT COUNT(*) FROM courses").fetchone()[0],
        "enrollments": db.execute("SELECT COUNT(*) FROM enrollments").fetchone()[0],
        "attendance_rate": percent(recent["attended"], recent["marked"]),
        "marks_last_30_days": recent["marked"],
        "by_class": db.execute(
            "SELECT class_name, COUNT(*) AS count FROM students GROUP BY class_name ORDER BY class_name"
        ).fetchall(),
        "by_course": db.execute(
            f"SELECT c.id, c.code, c.title, COUNT(DISTINCT e.student_id) AS students,"
            f" COUNT(a.date) AS marked, COALESCE({ATTENDED}, 0) AS attended"
            f" FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id"
            f" LEFT JOIN attendance a ON a.course_id = c.id AND a.student_id = e.student_id"
            f" GROUP BY c.id ORDER BY c.code"
        ).fetchall(),
        "newest": db.execute(
            "SELECT id, roll_number, first_name, last_name, class_name, admission_date FROM students"
            " ORDER BY admission_date DESC, id DESC LIMIT 5"
        ).fetchall(),
    }
