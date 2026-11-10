"""The SQLite connection, schema set-up, sample data and the database commands."""

from __future__ import annotations

import sqlite3
from contextlib import closing
from datetime import date, datetime, timedelta
from pathlib import Path

import click
from flask import Flask, current_app, g

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def connect(path: str | Path) -> sqlite3.Connection:
    """Opens the database with the settings every connection needs."""
    connection = sqlite3.connect(path, detect_types=0)
    # Rows can be read by column name: row["first_name"].
    connection.row_factory = sqlite3.Row
    # SQLite only enforces REFERENCES ... ON DELETE CASCADE when this is on, per connection.
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def get_db() -> sqlite3.Connection:
    """The connection for the current request, opened on first use and closed after it."""
    if "db" not in g:
        g.db = connect(current_app.config["DATABASE"])
    return g.db


def close_db(_error: BaseException | None = None) -> None:
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


def init_db(connection: sqlite3.Connection) -> None:
    """Creates any missing tables and indexes. Existing data is kept."""
    connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    connection.commit()


def is_empty(connection: sqlite3.Connection) -> bool:
    students = connection.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    courses = connection.execute("SELECT COUNT(*) FROM courses").fetchone()[0]
    return students == 0 and courses == 0


# Fictional sample data: none of these people exist.
SAMPLE_COURSES = [
    ("CS101", "Introduction to Programming", 4, "Variables, control flow, functions and debugging in Python."),
    ("MA102", "Discrete Mathematics", 3, "Sets, logic, relations, counting and graphs."),
    ("EN103", "Technical Communication", 2, "Writing reports, presenting and documenting software."),
    ("CS201", "Database Systems", 4, "Relational design, SQL, normalisation and transactions."),
]

SAMPLE_STUDENTS = [
    ("24CS001", "Aarav", "Sharma", "aarav.sharma@example.edu", "BCA 1-A", "active"),
    ("24CS002", "Diya", "Patel", "diya.patel@example.edu", "BCA 1-A", "active"),
    ("24CS003", "Kabir", "Singh", None, "BCA 1-A", "active"),
    ("24CS004", "Meera", "Iyer", "meera.iyer@example.edu", "BCA 1-A", "active"),
    ("24CS005", "Rohan", "Das", "rohan.das@example.edu", "BCA 1-B", "active"),
    ("24CS006", "Sara", "Thomas", "sara.thomas@example.edu", "BCA 1-B", "active"),
    ("24CS007", "Arjun", "Nair", None, "BCA 1-B", "inactive"),
    ("24CS008", "Ananya", "Gupta", "ananya.gupta@example.edu", "BCA 1-B", "active"),
    ("23CS011", "Vikram", "Rao", "vikram.rao@example.edu", "BCA 2-A", "active"),
    ("23CS012", "Zoya", "Khan", "zoya.khan@example.edu", "BCA 2-A", "active"),
    ("23CS013", "Ishaan", "Verma", None, "BCA 2-A", "active"),
    ("22CS021", "Priya", "Menon", "priya.menon@example.edu", "BCA 3-A", "graduated"),
]


def seed_db(connection: sqlite3.Connection, today: date | None = None) -> None:
    """Adds the sample courses, students, enrollments and two weeks of attendance.
    The marks follow a fixed pattern, so every run gives the same data."""
    today = today or date.today()
    connection.executemany(
        "INSERT INTO courses (code, title, credits, description) VALUES (?, ?, ?, ?)",
        SAMPLE_COURSES,
    )
    for roll, first, last, email, class_name, status in SAMPLE_STUDENTS:
        # The roll number starts with the year of admission: 24CS001 joined in July 2024.
        admitted = date(2000 + int(roll[:2]), 7, 15)
        connection.execute(
            "INSERT INTO students (roll_number, first_name, last_name, email, class_name,"
            " admission_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (roll, first, last, email, class_name, admitted.isoformat(), status),
        )
    students = connection.execute("SELECT id, class_name, status FROM students ORDER BY id").fetchall()
    courses = connection.execute("SELECT id, code FROM courses ORDER BY id").fetchall()
    term_start = (today - timedelta(days=30)).isoformat()
    for student in students:
        for course in courses:
            first_year = student["class_name"].startswith("BCA 1")
            if course["code"] == "CS201" and first_year:
                continue  # Database Systems starts in the second year.
            if course["code"] == "CS101" and not first_year:
                continue
            connection.execute(
                "INSERT INTO enrollments (student_id, course_id, enrolled_on) VALUES (?, ?, ?)",
                (student["id"], course["id"], term_start),
            )
    # Ten school days of attendance for active students, with a few absences and late marks.
    school_days = [today - timedelta(days=offset) for offset in range(1, 15)]
    school_days = [day for day in school_days if day.weekday() < 5][:10]
    enrollments = connection.execute(
        "SELECT e.student_id, e.course_id FROM enrollments e"
        " JOIN students s ON s.id = e.student_id WHERE s.status = 'active' ORDER BY 1, 2"
    ).fetchall()
    for day_index, day in enumerate(school_days):
        for row in enrollments:
            pattern = (row["student_id"] * 7 + row["course_id"] * 3 + day_index) % 13
            status = "absent" if pattern == 0 else "late" if pattern == 1 else "present"
            connection.execute(
                "INSERT INTO attendance (student_id, course_id, date, status) VALUES (?, ?, ?, ?)",
                (row["student_id"], row["course_id"], day.isoformat(), status),
            )
    connection.commit()


def prepare_database(app: Flask) -> None:
    """Runs when the app starts: creates any missing tables, and fills a database file that
    didn't exist before with the sample data, when seed_demo_data is true in app_config.json.
    A database someone emptied on purpose (reset-db --empty) stays empty."""
    path = Path(app.config["DATABASE"])
    path.parent.mkdir(parents=True, exist_ok=True)
    is_new = not path.exists()
    connection = connect(path)
    try:
        init_db(connection)
        if app.config["APP"].seed_demo_data and is_new:
            seed_db(connection)
            app.logger.info("Created %s with the sample data", path.name)
    finally:
        connection.close()


def backup_db(source: Path, folder: Path) -> Path:
    """Copies the database with SQLite's backup API, which is safe while the app is running."""
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f"students-{datetime.now():%Y%m%d-%H%M%S}.db"
    # closing(): a `with` block on a connection only commits; on Windows an open file stays locked.
    with closing(connect(source)) as original, closing(sqlite3.connect(target)) as copy:
        original.backup(copy)
    return target


def register_commands(app: Flask) -> None:
    @app.cli.command("init-db")
    def init_db_command() -> None:
        """Create any missing tables (existing data is kept)."""
        with closing(connect(app.config["DATABASE"])) as connection:
            init_db(connection)
        click.echo(f"Tables are ready in {app.config['DATABASE']}.")

    @app.cli.command("seed-db")
    def seed_db_command() -> None:
        """Add the fictional sample data to an empty database."""
        with closing(connect(app.config["DATABASE"])) as connection:
            init_db(connection)
            if not is_empty(connection):
                raise click.ClickException("The database already has data. Use reset-db to start again.")
            seed_db(connection)
        click.echo("Added the sample courses, students and attendance.")

    @app.cli.command("reset-db")
    @click.option("--yes", is_flag=True, help="Confirm that every record should be deleted.")
    @click.option("--empty", is_flag=True, help="Leave the database empty instead of adding the samples.")
    def reset_db_command(yes: bool, empty: bool) -> None:
        """Delete every record (after a backup) and start again."""
        if not yes:
            raise click.ClickException("This deletes every record. Run it again with --yes to confirm.")
        path = Path(app.config["DATABASE"])
        if path.exists():
            backup = backup_db(path, path.parent / "backups")
            click.echo(f"Saved a backup in {backup}.")
        with closing(connect(path)) as connection:
            for table in ("attendance", "enrollments", "students", "courses"):
                connection.execute(f"DROP TABLE IF EXISTS {table}")  # noqa: S608 - fixed names
            init_db(connection)
            if not empty:
                seed_db(connection)
        click.echo("The database was reset.")

    @app.cli.command("backup-db")
    def backup_db_command() -> None:
        """Save a copy of the database in instance/backups."""
        path = Path(app.config["DATABASE"])
        if not path.exists():
            raise click.ClickException("There is no database yet. Start the app once first.")
        click.echo(f"Saved {backup_db(path, path.parent / 'backups')}.")
