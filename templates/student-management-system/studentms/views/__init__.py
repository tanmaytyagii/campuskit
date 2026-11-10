"""The pages, in one Flask blueprint per area, and helpers they share."""

from __future__ import annotations

from datetime import date

from flask import current_app, request

from ..validation import whole_number


def today() -> date:
    """Today's date. Tests can fix it with app.config["TODAY"]."""
    return current_app.config.get("TODAY") or date.today()


def int_arg(name: str, default: int, minimum: int = 1) -> int:
    """A whole number from the query string; anything else falls back to `default`."""
    number = whole_number(request.args.get(name, ""))
    return default if number is None else max(minimum, number)
