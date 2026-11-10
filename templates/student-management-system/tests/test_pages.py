"""The app through its pages, as a browser uses it (Flask's test client)."""

import re

from conftest import csrf_from, post_form

NEW = {
    "roll_number": "25CS200",
    "first_name": "Kavya",
    "last_name": "Rao",
    "email": "",
    "class_name": "BCA 1-C",
    "admission_date": "2025-07-15",
    "status": "active",
}


def text(response) -> str:
    return response.get_data(as_text=True)


def test_dashboard_shows_figures_from_the_data(client):
    page = text(client.get("/"))
    assert "<h1>Dashboard</h1>" in page
    assert "<dt>Students</dt><dd>12</dd>" in page
    assert "Attendance by course" in page


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200 and response.get_json() == {"status": "ok"}


def test_every_main_page_opens(client):
    for path in ("/", "/students/", "/courses/", "/attendance/", "/statistics", "/students/new", "/courses/new"):
        assert client.get(path).status_code == 200, path


def test_add_student_then_see_edit_and_delete(client):
    response = post_form(client, "/students/new", NEW)
    assert response.status_code == 302
    location = response.headers["Location"]
    student_id = int(re.search(r"/students/(\d+)", location).group(1))
    page = text(client.get(location))
    assert "Added Kavya Rao." in page and "<h1>Kavya Rao</h1>" in page

    response = post_form(client, f"/students/{student_id}/edit", {**NEW, "first_name": "Kavitha"})
    assert response.status_code == 302
    assert "<h1>Kavitha Rao</h1>" in text(client.get(location))

    confirm = text(client.get(f"/students/{student_id}/delete"))
    assert "Delete Kavitha Rao?" in confirm and "0 attendance marks" in confirm
    response = post_form(client, f"/students/{student_id}/delete", {})
    assert response.status_code == 302
    assert "Deleted Kavitha Rao" in text(client.get("/students/"))
    assert client.get(location).status_code == 404


def test_form_errors_are_shown_and_keep_what_was_typed(client):
    response = post_form(client, "/students/new", {**NEW, "roll_number": "", "email": "nope"})
    page = text(response)
    assert response.status_code == 400
    assert "Please fix 2 problems" in page
    assert 'aria-invalid="true"' in page and 'aria-describedby="roll_number-hint roll_number-error"' in page
    assert 'value="Kavya"' in page


def test_duplicate_roll_number_is_a_form_error(client):
    response = post_form(client, "/students/new", {**NEW, "roll_number": "24cs001"})
    assert response.status_code == 400
    assert "Another student already has this roll number." in text(response)


def test_search_filter_sort_and_pagination(client):
    page = text(client.get("/students/?q=khan"))
    assert "Zoya Khan" in page and "Showing 1–1 of 1 student." in page
    page = text(client.get("/students/?class=BCA+1-B&status=active"))
    assert "Showing 1–3 of 3 students." in page
    page = text(client.get("/students/?page=2"))
    assert "Showing 6–10 of 12 students." in page and 'aria-current="page" href="/students/?page=2"' in page
    # Past the last page goes to the last page; nonsense values fall back to defaults.
    assert client.get("/students/?page=99").headers["Location"].endswith("page=3")
    assert client.get("/students/?sort=password&status=hacked&page=abc").status_code == 200


def test_enroll_and_remove(client):
    page = text(client.get("/students/?q=24CS003"))
    student_id = int(re.search(r'href="/students/(\d+)"', page).group(1))
    detail = text(client.get(f"/students/{student_id}"))
    course_id = re.search(r'<option value="(\d+)">CS201', detail).group(1)
    response = post_form(client, f"/students/{student_id}/enroll", {"course_id": course_id}, f"/students/{student_id}")
    assert "Enrolled in CS201" in text(client.get(response.headers["Location"]))
    response = post_form(client, f"/students/{student_id}/courses/{course_id}/remove", {}, f"/students/{student_id}")
    assert "Removed from the course" in text(client.get(response.headers["Location"]))


def test_course_crud(client):
    response = post_form(client, "/courses/new", {"code": "py150", "title": "Python Projects", "credits": "3"})
    assert response.status_code == 302
    location = response.headers["Location"]
    assert "<h1>PY150 Python Projects</h1>" in text(client.get(location))
    assert post_form(client, "/courses/new", {"code": "PY150", "title": "Again", "credits": "3"}).status_code == 400
    course_id = location.rsplit("/", 1)[1]
    post_form(client, f"/courses/{course_id}/edit", {"code": "PY150", "title": "Python Projects II", "credits": "4"})
    assert "Python Projects II" in text(client.get(location))
    post_form(client, f"/courses/{course_id}/delete", {})
    assert client.get(location).status_code == 404


def test_mark_attendance(client):
    courses = text(client.get("/attendance/"))
    course_id = re.search(r'href="/attendance/(\d+)">CS101', courses).group(1)
    sheet = text(client.get(f"/attendance/{course_id}?date=2026-10-21"))
    student_ids = re.findall(r'name="status-(\d+)" value="present"', sheet)
    assert student_ids
    marks = {f"status-{student_id}": "present" for student_id in student_ids}
    marks[f"status-{student_ids[0]}"] = "absent"
    response = post_form(client, f"/attendance/{course_id}", {**marks, "date": "2026-10-21", "status-999": "present"})
    page = text(client.get(response.headers["Location"]))
    assert f"Saved attendance for {len(student_ids)} students on 21 October 2026." in page
    assert re.search(rf'name="status-{student_ids[0]}" value="absent"\s+checked', page)


def test_future_attendance_date_is_refused(client):
    response = client.get("/attendance/1?date=2026-12-01")
    assert response.status_code == 302
    assert "future date" in text(client.get(response.headers["Location"]))


def test_empty_database_shows_how_to_start(empty_app):
    client = empty_app.test_client()
    page = text(client.get("/"))
    assert "No data yet" in page
    assert "No students yet." in text(client.get("/students/"))


def test_unusual_digits_in_the_address_or_a_form_dont_crash(client):
    # Regression: ?page=² was a 500 error.
    assert client.get("/students/?page=%C2%B2").status_code == 200
    assert client.get("/students/?page=%D9%A3").status_code == 200
    response = post_form(client, "/students/1/enroll", {"course_id": "²"}, "/students/1")
    assert response.status_code == 302
    assert "Choose a course" in text(client.get(response.headers["Location"]))
