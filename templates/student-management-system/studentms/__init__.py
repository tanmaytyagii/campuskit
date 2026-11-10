"""The application factory: create_app() builds the Flask app with its settings, database,
security checks, pages and error pages. run.py and the tests call it."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from flask import Flask, render_template, request
from werkzeug.exceptions import SecurityError

from . import db
from .config import INSTANCE_PATH, load_config, load_env_file, secret_key, server_host, trusted_hosts
from .security import init_security


def create_app(overrides: dict[str, Any] | None = None) -> Flask:
    load_env_file()
    app = Flask(__name__, instance_path=str(INSTANCE_PATH))
    app.config.update(
        APP=load_config(),
        DATABASE=os.environ.get("DATABASE_PATH") or str(Path(app.instance_path) / "students.db"),
        DEBUG=os.environ.get("FLASK_DEBUG") == "1",
        # Requests must name this computer in their Host header, which blocks DNS rebinding.
        TRUSTED_HOSTS=trusted_hosts(server_host()),
        # Session cookies can't be read by scripts and aren't sent with requests from other sites.
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        MAX_CONTENT_LENGTH=1024 * 1024,
    )
    if overrides:
        app.config.update(overrides)
    if "SECRET_KEY" not in (overrides or {}):
        app.config["SECRET_KEY"] = secret_key(Path(app.instance_path))

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    app.teardown_appcontext(db.close_db)
    db.register_commands(app)
    init_security(app)
    db.prepare_database(app)

    from .views import attendance, courses, dashboard, students

    for module in (dashboard, students, courses, attendance):
        app.register_blueprint(module.bp)

    @app.context_processor
    def settings() -> dict[str, Any]:
        return {"settings": app.config["APP"]}

    for code in (400, 404, 405, 413, 500):
        app.register_error_handler(code, _error_page)
    return app


def _error_page(error: Any) -> tuple[str, int]:
    if isinstance(error, SecurityError) or isinstance(request.routing_exception, SecurityError):
        # The Host header named another computer (see config.trusted_hosts). Flask builds no
        # links for an untrusted name, so the answer is one sentence instead of a full page.
        return "Open this app with 127.0.0.1 or localhost in the address.", 400
    code = getattr(error, "code", 500) or 500
    if code == 500:
        logging.getLogger(__name__).exception("Unexpected error", exc_info=error)
    message = getattr(error, "description", None) if code == 400 else None
    return render_template("errors/error.html", code=code, message=message), code
