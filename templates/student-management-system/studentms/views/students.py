"""Listing, adding, viewing, editing and deleting students, and their course enrollments."""

from __future__ import annotations

import math

from flask import Blueprint, abort, current_app, flash, redirect, render_template, request, url_for
from werkzeug.wrappers import Response

from .. import repository
from ..db import get_db
from ..validation import STATUSES, validate_student, whole_number
from . import int_arg, today

bp = Blueprint("students", __name__, url_prefix="/students")

SORT_LABELS = {"name": "Name", "roll": "Roll number", "class": "Class", "admitted": "Admission date"}


def _student_or_404(student_id: int):  # noqa: ANN202 - a database row
    student = repository.get_student(get_db(), student_id)
    if student is None:
        abort(404)
    return student


@bp.get("/")
def list_students() -> str | Response:
    query = repository.StudentQuery(
        search=" ".join(request.args.get("q", "").split())[:60],
        class_name=request.args.get("class", ""),
        status=request.args.get("status", "") if request.args.get("status") in STATUSES else "",
        sort=request.args.get("sort", "name") if request.args.get("sort") in SORT_LABELS else "name",
        descending=request.args.get("order") == "desc",
        page=int_arg("page", 1),
    )
    per_page = current_app.config["APP"].students_per_page
    rows, total = repository.list_students(get_db(), query, per_page)
    pages = max(1, math.ceil(total / per_page))
    if query.page > pages:
        # Past the last page, for example after a search narrowed the list: go to the last one.
        args = request.args.to_dict()
        args["page"] = str(pages)
        return redirect(url_for("students.list_students", **args))
    return render_template(
        "students/list.html",
        students=rows,
        total=total,
        query=query,
        pages=pages,
        per_page=per_page,
        classes=repository.class_names(get_db()),
        statuses=STATUSES,
        sort_labels=SORT_LABELS,
    )


@bp.route("/new", methods=["GET", "POST"])
def new_student() -> tuple[str, int] | Response:
    form = request.form if request.method == "POST" else {"admission_date": today().isoformat()}
    errors: dict[str, str] = {}
    if request.method == "POST":
        result = validate_student(request.form, today())
        errors = result.errors
        if result.ok:
            try:
                student_id = repository.create_student(get_db(), result.values)
            except repository.DuplicateError as error:
                errors = {error.field: str(error)}
            else:
                current_app.logger.info("Added student %s", student_id)
                flash(f"Added {result.values['first_name']} {result.values['last_name']}.")
                return redirect(url_for("students.show_student", student_id=student_id))
    # 400 tells the browser (and tests) that the form had mistakes; the page shows them.
    page = render_template("students/form.html", form=form, errors=errors, student=None, statuses=STATUSES)
    return page, 400 if errors else 200


@bp.get("/<int:student_id>")
def show_student(student_id: int) -> str:
    student = _student_or_404(student_id)
    return render_template(
        "students/detail.html",
        student=student,
        courses=repository.student_courses(get_db(), student_id),
        available=repository.courses_not_taken(get_db(), student_id),
    )


@bp.route("/<int:student_id>/edit", methods=["GET", "POST"])
def edit_student(student_id: int) -> tuple[str, int] | Response:
    student = _student_or_404(student_id)
    form = request.form if request.method == "POST" else dict(student)
    errors: dict[str, str] = {}
    if request.method == "POST":
        result = validate_student(request.form, today())
        errors = result.errors
        if result.ok:
            try:
                repository.update_student(get_db(), student_id, result.values)
            except repository.DuplicateError as error:
                errors = {error.field: str(error)}
            else:
                current_app.logger.info("Updated student %s", student_id)
                flash("Saved the changes.")
                return redirect(url_for("students.show_student", student_id=student_id))
    page = render_template("students/form.html", form=form, errors=errors, student=student, statuses=STATUSES)
    return page, 400 if errors else 200


@bp.route("/<int:student_id>/delete", methods=["GET", "POST"])
def delete_student(student_id: int) -> str | Response:
    """GET shows what will be deleted and asks to confirm; only the POST deletes."""
    student = _student_or_404(student_id)
    courses = repository.student_courses(get_db(), student_id)
    if request.method == "POST":
        repository.delete_student(get_db(), student_id)
        current_app.logger.info("Deleted student %s", student_id)
        flash(f"Deleted {student['first_name']} {student['last_name']} and their attendance records.")
        return redirect(url_for("students.list_students"))
    marks = sum(course["marked"] for course in courses)
    return render_template("students/delete.html", student=student, courses=courses, marks=marks)


@bp.post("/<int:student_id>/enroll")
def enroll(student_id: int) -> Response:
    _student_or_404(student_id)
    course_id = whole_number(request.form.get("course_id", ""))
    course = repository.get_course(get_db(), course_id) if course_id is not None else None
    if course is None:
        flash("Choose a course to enroll the student in.", "error")
    elif repository.enroll(get_db(), student_id, course["id"], today()):
        flash(f"Enrolled in {course['code']} {course['title']}.")
    else:
        flash(f"Already enrolled in {course['code']}.", "error")
    return redirect(url_for("students.show_student", student_id=student_id))


@bp.post("/<int:student_id>/courses/<int:course_id>/remove")
def unenroll(student_id: int, course_id: int) -> Response:
    _student_or_404(student_id)
    if repository.unenroll(get_db(), student_id, course_id):
        flash("Removed from the course, with the attendance marks for it.")
    return redirect(url_for("students.show_student", student_id=student_id))
