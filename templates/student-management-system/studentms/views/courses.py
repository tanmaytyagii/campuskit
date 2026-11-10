"""Listing, adding, viewing, editing and deleting courses."""

from __future__ import annotations

from flask import Blueprint, abort, current_app, flash, redirect, render_template, request, url_for
from werkzeug.wrappers import Response

from .. import repository
from ..db import get_db
from ..validation import validate_course

bp = Blueprint("courses", __name__, url_prefix="/courses")


def _course_or_404(course_id: int):  # noqa: ANN202 - a database row
    course = repository.get_course(get_db(), course_id)
    if course is None:
        abort(404)
    return course


@bp.get("/")
def list_courses() -> str:
    return render_template("courses/list.html", courses=repository.list_courses(get_db()))


def _course_form(course=None) -> tuple[str, int] | Response:  # noqa: ANN001 - a database row or None
    form = request.form if request.method == "POST" else (dict(course) if course else {"credits": "3"})
    errors: dict[str, str] = {}
    if request.method == "POST":
        result = validate_course(request.form)
        errors = result.errors
        if result.ok:
            try:
                if course is None:
                    course_id = repository.create_course(get_db(), result.values)
                    flash(f"Added {result.values['code']} {result.values['title']}.")
                else:
                    course_id = course["id"]
                    repository.update_course(get_db(), course_id, result.values)
                    flash("Saved the changes.")
            except repository.DuplicateError as error:
                errors = {error.field: str(error)}
            else:
                current_app.logger.info("Saved course %s", course_id)
                return redirect(url_for("courses.show_course", course_id=course_id))
    page = render_template("courses/form.html", form=form, errors=errors, course=course)
    return page, 400 if errors else 200


@bp.route("/new", methods=["GET", "POST"])
def new_course() -> tuple[str, int] | Response:
    return _course_form()


@bp.get("/<int:course_id>")
def show_course(course_id: int) -> str:
    course = _course_or_404(course_id)
    return render_template(
        "courses/detail.html",
        course=course,
        roster=repository.course_roster(get_db(), course_id),
        days=repository.marked_dates(get_db(), course_id),
    )


@bp.route("/<int:course_id>/edit", methods=["GET", "POST"])
def edit_course(course_id: int) -> tuple[str, int] | Response:
    return _course_form(_course_or_404(course_id))


@bp.route("/<int:course_id>/delete", methods=["GET", "POST"])
def delete_course(course_id: int) -> str | Response:
    course = _course_or_404(course_id)
    roster = repository.course_roster(get_db(), course_id)
    if request.method == "POST":
        repository.delete_course(get_db(), course_id)
        current_app.logger.info("Deleted course %s", course_id)
        flash(f"Deleted {course['code']} {course['title']}, its enrollments and attendance.")
        return redirect(url_for("courses.list_courses"))
    return render_template("courses/delete.html", course=course, roster=roster)
