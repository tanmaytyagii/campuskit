# Architecture

Student Management System is a server-rendered web application. The browser asks for a page, Flask runs a Python function that reads or changes the SQLite database, and the function sends back finished HTML. There is no JavaScript: links and forms are enough.

## Layers

| Layer          | Files                                      | Responsibility                                                  |
| -------------- | ------------------------------------------ | --------------------------------------------------------------- |
| Start-up       | `run.py`, `studentms/__init__.py`          | Build the app: settings, database, security, pages, error pages |
| Configuration  | `studentms/config.py`, `app_config.json`   | Read and check settings, `.env` and the secret key              |
| Routes (views) | `studentms/views/*.py`                     | One function per page: read the request, call the logic, render |
| Validation     | `studentms/validation.py`                  | Check and clean form input; pure functions with no database     |
| Data access    | `studentms/repository.py`                  | Every SQL query, always with parameters                         |
| Database       | `studentms/db.py`, `studentms/schema.sql`  | Connections, schema, sample data, backup and reset commands     |
| Security       | `studentms/security.py`                    | CSRF tokens and security headers                                |
| Presentation   | `studentms/templates/`, `static/style.css` | HTML templates (Jinja) and styles                               |

Each layer only talks to the one below it: templates never run SQL, and the repository never sees a request. That is what makes the validation and the queries easy to test on their own.

## Following a request: adding a student

1. The browser opens `/students/new`. Flask matches the URL to `new_student()` in `studentms/views/students.py`.
2. For a GET request, the function renders `students/form.html`. The template calls `csrf_token()`, which stores a random token in the signed session cookie and puts the same value in a hidden form field.
3. The student fills in the form and presses **Add student**. The browser sends a POST request with the fields and the token.
4. Before any page function runs, `check_csrf()` in `security.py` compares the form's token with the session's. A missing or wrong token stops the request with 400 Bad Request.
5. `new_student()` calls `validate_student()` in `validation.py`. It trims the text, upper-cases the roll number, checks each field and returns the cleaned values and a dictionary of errors.
6. With errors, the same form is rendered again with the values the student typed, an error summary at the top and a message under each field, and the status is 400.
7. Without errors, `create_student()` in `repository.py` runs an `INSERT` with named parameters. If SQLite reports a `UNIQUE` constraint failure (the roll number or email is taken), it is turned into a form error.
8. After a successful insert the function calls `flash()` with a confirmation and redirects to the new student's page (the Post/Redirect/Get pattern, so reloading the page doesn't submit the form twice).
9. `teardown_appcontext` closes the database connection at the end of every request.

## The database

```text
students ──(1 to many)── enrollments ──(many to 1)── courses
                              │
                         (1 to many)
                              │
                          attendance
```

- **students** and **courses** are independent tables with an `INTEGER PRIMARY KEY`. Roll numbers and course codes are `UNIQUE COLLATE NOCASE`, so `24cs001` and `24CS001` count as the same.
- **enrollments** joins them: a student takes many courses and a course has many students. Its primary key is the pair `(student_id, course_id)`, so the same enrollment can't exist twice.
- **attendance** has one row per student, course and day, and refers to an _enrollment_, not to the student and course separately. A mark can only exist for a student who takes the course.
- `ON DELETE CASCADE`: deleting a student deletes their enrollments, and deleting an enrollment deletes its attendance. SQLite only enforces this when `PRAGMA foreign_keys = ON`, which `connect()` in `db.py` sets on every connection.
- `CHECK` constraints repeat the most important validation rules (status values, credits from 1 to 10) in the database itself.
- Dates are stored as `YYYY-MM-DD` text. That format sorts correctly as text and is what SQLite's date functions expect.

## Important queries

- **Search** (`list_students`): `first_name || ' ' || last_name LIKE ?`, so “aarav sharma” finds the full name. `like_pattern()` escapes `%` and `_` so they are matched literally.
- **Sorting**: `ORDER BY` can't take a `?` parameter, so the column comes from the fixed `SORT_COLUMNS` dictionary; anything else falls back to sorting by name.
- **Pages**: `LIMIT ? OFFSET ?`, with a separate `COUNT(*)` for the total.
- **Attendance percentage**: `SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END)` divided by the number of marks. Late counts as attending.
- **Saving attendance** (`save_attendance`): `INSERT … ON CONFLICT (student_id, course_id, date) DO UPDATE`, an “upsert” that adds a mark or changes the existing one.

## Start-up

`create_app()` loads `.env` (without replacing variables that are already set), reads `app_config.json`, works out the database path, and gets the secret key. That is `SECRET_KEY` if it is set; otherwise a random key is created once in `instance/secret_key`, readable only by your own account. It also sets Flask's `TRUSTED_HOSTS` with `trusted_hosts()`: while the app listens only on this computer, a request must use `127.0.0.1` or `localhost` in its address, which blocks DNS rebinding.

`run.py` reads `HOST` and `PORT` with `server_host()` and `server_port()`, and `check_debug()` refuses `FLASK_DEBUG=1` unless the app listens only on this computer.

It then registers the database commands, the CSRF check and security headers, and the four blueprints (dashboard, students, courses, attendance). Last, `prepare_database()` creates any missing tables. It adds the sample data only when the database file didn't exist before and `seed_demo_data` is `true`.

## Testing

The tests (`tests/`) build the app with `create_app()` and a temporary database for each test. The date is fixed at 21 October 2026, so the results don't change from day to day. `conftest.py` reads the CSRF token from a form exactly as a browser would, so the tests also prove that forms carry it.
