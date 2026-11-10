"""Protection against cross-site request forgery (CSRF), and the security headers.

CSRF: another website could make a visitor's browser submit a form to this app, for example
one that deletes a student. To stop that, every form carries a secret token that only pages
from this app know, and every POST request must send it back."""

from __future__ import annotations

import hmac
import secrets

from flask import Flask, Response, abort, request, session

CSRF_FIELD = "csrf_token"
# What browsers may load on these pages: only files from this app, and no scripts at all.
CONTENT_SECURITY_POLICY = (
    "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self';"
    " form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
)


def csrf_token() -> str:
    """The token for this visitor's session, created on first use. Templates call it
    as {{ csrf_token() }} in a hidden form field."""
    if CSRF_FIELD not in session:
        session[CSRF_FIELD] = secrets.token_urlsafe(32)
    return str(session[CSRF_FIELD])


def check_csrf() -> None:
    """Runs before every request: a POST without the session's token is refused with 400."""
    if request.method != "POST":
        return
    expected = session.get(CSRF_FIELD)
    sent = request.form.get(CSRF_FIELD, "")
    # compare_digest takes the same time however much matches, so timing reveals nothing.
    if not expected or not hmac.compare_digest(str(expected), sent):
        abort(400, description="The form expired or didn’t come from this app. Go back, reload the page and try again.")


def add_security_headers(response: Response) -> Response:
    response.headers["Content-Security-Policy"] = CONTENT_SECURITY_POLICY
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "same-origin"
    return response


def init_security(app: Flask) -> None:
    app.before_request(check_csrf)
    app.after_request(add_security_headers)
    app.jinja_env.globals["csrf_token"] = csrf_token
