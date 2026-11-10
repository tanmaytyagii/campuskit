-- The database schema. db.init_db() runs this file; every statement can run again safely.
-- Dates are stored as text in the ISO format YYYY-MM-DD, which sorts correctly.

CREATE TABLE IF NOT EXISTS students (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    roll_number    TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    first_name     TEXT    NOT NULL,
    last_name      TEXT    NOT NULL,
    email          TEXT    UNIQUE COLLATE NOCASE,
    class_name     TEXT    NOT NULL,
    admission_date TEXT    NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'inactive', 'graduated')),
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    title       TEXT    NOT NULL,
    credits     INTEGER NOT NULL CHECK (credits BETWEEN 1 AND 10),
    description TEXT    NOT NULL DEFAULT ''
);

-- Which student takes which course: a many-to-many relationship.
CREATE TABLE IF NOT EXISTS enrollments (
    student_id  INTEGER NOT NULL REFERENCES students (id) ON DELETE CASCADE,
    course_id   INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    enrolled_on TEXT    NOT NULL,
    PRIMARY KEY (student_id, course_id)
);

-- One mark per student, course and day. A mark belongs to an enrollment, so removing a
-- student from a course removes their attendance for it too.
CREATE TABLE IF NOT EXISTS attendance (
    student_id INTEGER NOT NULL,
    course_id  INTEGER NOT NULL,
    date       TEXT    NOT NULL,
    status     TEXT    NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    PRIMARY KEY (student_id, course_id, date),
    FOREIGN KEY (student_id, course_id)
        REFERENCES enrollments (student_id, course_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_students_class ON students (class_name);
CREATE INDEX IF NOT EXISTS idx_students_name ON students (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_attendance_course_date ON attendance (course_id, date);
