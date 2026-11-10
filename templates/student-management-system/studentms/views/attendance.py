"""Marking attendance for a course on a day."""

from __future__ import annotations

from flask import Blueprint, abort, current_app, flash, redirect, render_template, request, url_for
from werkzeug.wrappers import Response

from .. import repository
from ..db import get_db
from ..validation import ATTENDANCE_STATUSES, validate_attendance_date, whole_number
from . import today

bp = Blueprint("attendance", __name__, url_prefix="/attendance")


@bp.get("/")
def choose() -> str:
    return render_template("attendance/choose.html", courses=repository.list_courses(get_db()), today=today())


@bp.route("/<int:course_id>", methods=["GET", "POST"])
def mark(course_id: int) -> tuple[str, int] | Response:
    course = repository.get_course(get_db(), course_id)
    if course is None:
        abort(404)
    date_text = (request.form if request.method == "POST" else request.args).get("date", today().isoformat())
    day = validate_attendance_date(date_text, today())
    if isinstance(day, str):
        flash(day, "error")
        return redirect(url_for("attendance.mark", course_id=course_id))
    if request.method == "POST":
        marks: dict[int, str] = {}
        for key, value in request.form.items():
            # Fields are named status-<student id>; anything else, or an unknown status, is ignored.
            student_id = whole_number(key.removeprefix("status-")) if key.startswith("status-") else None
            if student_id is not None and value in ATTENDANCE_STATUSES:
                marks[student_id] = value
        saved = repository.save_attendance(get_db(), course_id, day, marks)
        current_app.logger.info("Saved %s attendance marks for course %s on %s", saved, course_id, day)
        flash(f"Saved attendance for {saved} students on {day:%d %B %Y}.")
        return redirect(url_for("attendance.mark", course_id=course_id, date=day.isoformat()))
    sheet = repository.attendance_sheet(get_db(), course_id, day)
    page = render_template(
        "attendance/mark.html", course=course, day=day, sheet=sheet, statuses=ATTENDANCE_STATUSES, today=today()
    )
    return page, 200
