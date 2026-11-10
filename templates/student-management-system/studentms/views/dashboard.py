"""The dashboard, the statistics page and the health check."""

from __future__ import annotations

from flask import Blueprint, jsonify, render_template

from .. import repository
from ..db import get_db
from . import today

bp = Blueprint("dashboard", __name__)


@bp.get("/")
def index() -> str:
    return render_template("dashboard.html", stats=repository.statistics(get_db(), today()))


@bp.get("/statistics")
def statistics() -> str:
    return render_template("statistics.html", stats=repository.statistics(get_db(), today()))


@bp.get("/health")
def health():  # noqa: ANN201 - a JSON response
    """For scripts that check the app is running: answers 200 when the database can be read."""
    get_db().execute("SELECT 1 FROM students LIMIT 1").fetchall()
    return jsonify(status="ok")
