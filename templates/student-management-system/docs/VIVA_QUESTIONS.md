# Viva questions

Questions an examiner may ask about this project, with answers based on how this code actually works. Read the referenced files and be ready to explain each answer in your own words.

## 1. What does the project do?

It keeps student records in a SQLite database: students, courses, which students take which courses, and attendance. You can add, view, edit and delete students and courses, search and filter the student list, mark attendance and see statistics. It runs as a Flask web app on your own computer.

## 2. Why Flask and SQLite?

Flask is a small Python web framework: a URL is matched to a Python function that returns a page, which is easy to follow and explain. SQLite is a complete SQL database in one file, built into Python (`sqlite3`), so there is no database server to install. Both are enough for one user on one computer.

## 3. What is the structure of the database?

Four tables (`studentms/schema.sql`):

- `students` and `courses`;
- `enrollments`, which links them, because a student takes many courses and a course has many students (a many-to-many relationship);
- `attendance`, with one mark per student, course and day.

The attendance table refers to an enrollment, so a mark can only exist for a student who takes the course.

## 4. What is a primary key, and what are the primary keys here?

A primary key identifies each row uniquely.

- `students` and `courses` use an `INTEGER PRIMARY KEY AUTOINCREMENT` id.
- `enrollments` uses the pair `(student_id, course_id)`, so the same enrollment can't be stored twice.
- `attendance` uses `(student_id, course_id, date)`, so there is one mark per day.

## 5. What happens to a student's attendance when the student is deleted?

It is deleted too. `enrollments.student_id` has `REFERENCES students (id) ON DELETE CASCADE`, and attendance refers to enrollments the same way. SQLite only enforces foreign keys when `PRAGMA foreign_keys = ON`, which `connect()` in `studentms/db.py` sets on every connection. The confirmation page says how many marks will be deleted before you confirm.

## 6. How does the app prevent SQL injection?

Every query passes values as parameters (`?` or `:name`), so SQLite treats them as data, never as SQL. The only part of a query built from input is the `ORDER BY` column, which can't be a parameter, so it comes from the fixed `SORT_COLUMNS` dictionary in `studentms/repository.py`. A test searches for `' OR '1'='1` and checks that nothing matches.

## 7. What is CSRF and how is it prevented?

Cross-site request forgery: another website makes your browser submit a form to this app, for example to delete a student. `studentms/security.py` gives every session a random token. Every form includes it in a hidden field, and `check_csrf()` refuses any POST whose token doesn't match, with 400 Bad Request. The session cookie also has `SameSite=Lax`.

## 8. How is user input validated?

`studentms/validation.py` has pure functions such as `validate_student()`, which clean the input (trim spaces, upper-case roll numbers) and return a dictionary of errors by field. The form is shown again with the values that were typed and a message under each field. The database repeats key rules with `UNIQUE` and `CHECK` constraints, and a duplicate roll number is turned into a form error.

## 9. Why are deletes done with a POST form instead of a link?

A link makes a GET request, and GET requests must not change data: browsers prefetch links, and search engines follow them. The delete link only opens a confirmation page; the form on it sends a POST with the CSRF token, and only that deletes.

## 10. What is the Post/Redirect/Get pattern?

After a successful form submission the app redirects to another page instead of rendering one. Reloading the result page then repeats the harmless GET, not the POST, so a student isn't added twice. `flash()` carries the confirmation message to the next page.

## 11. How does search work?

`list_students()` builds a `WHERE` clause with `LIKE` on the full name, the roll number and the email, plus optional filters for class and status. `like_pattern()` escapes `%` and `_` so they are matched literally. Results are counted with `COUNT(*)` and one page is fetched with `LIMIT ? OFFSET ?`.

## 12. How is the attendance percentage calculated?

The number of marks that are present or late, divided by the number of marks recorded, times 100. In SQL: `SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END)`. A course or student with no marks shows “No marks yet” instead of a misleading 0%.

## 13. What is an upsert, and where is it used?

An insert that updates the row instead when it already exists. `save_attendance()` uses `INSERT … ON CONFLICT (student_id, course_id, date) DO UPDATE SET status = excluded.status`, so marking a day again changes the existing marks.

## 14. What does `create_app()` do, and why use a factory?

It builds and configures the app: settings, database path, secret key, commands, security checks, blueprints and error pages. A factory lets the tests create a fresh app with its own temporary database and settings for each test, instead of sharing one global app.

## 15. Where is the secret key, and why does it matter?

Flask signs the session cookie, which holds the CSRF token and flash messages, with `SECRET_KEY`. Anyone who knows the key could forge cookies. The app uses `SECRET_KEY` from the environment if it is set; otherwise it creates a random key once in `instance/secret_key`, readable only by your own account from the moment it is created. The `instance` folder is in `.gitignore`, so the key is never committed.

## 16. The app only listens on 127.0.0.1. Can a website still reach it?

Yes, with _DNS rebinding_: a website points a name it controls at `127.0.0.1`, so its scripts can open this app's pages and, with a token from a page they read, send its forms. There is no login to stop them. `create_app()` sets Flask's `TRUSTED_HOSTS` from `trusted_hosts()` in `studentms/config.py`, so a request whose Host header isn't `127.0.0.1` or `localhost` is refused with 400 before any page runs. When `HOST` makes the app listen on the network, any name is accepted, because people may use any of the computer's addresses.

## 17. How is the project tested?

With pytest, on a temporary database for each test (`tests/`). There are tests for:

- the validation rules and the configuration;
- the queries, constraints and cascades;
- every page through Flask's test client, including the CSRF tokens;
- the database commands;
- security: escaping, SQL injection attempts and headers.

The date is fixed so the results never change.

## 18. What are the limitations?

- There is no login, so anyone who can open the app can change records.
- Flask's development server and SQLite suit one user on one computer.
- Attendance is per course per day.
- Times are shown in UTC.
- There is no import or export.

## 19. How would you add authentication?

Add a `users` table with a username and a password hash made by `werkzeug.security.generate_password_hash`. A login form would check the hash with `check_password_hash` and store the user's id in the session. A `before_request` check, or a decorator on the views, would redirect visitors who aren't logged in. Never store plain passwords.
