"""Shared test set-up: an app with its own temporary database and a fixed date."""

from __future__ import annotations

import re
from dataclasses import replace
from datetime import date

import pytest

from studentms import create_app
from studentms.config import load_config

TODAY = date(2026, 10, 21)


def make_app(tmp_path, seed: bool = True):
    config = replace(load_config(), seed_demo_data=seed, students_per_page=5)
    return create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-only-key",
            "DATABASE": str(tmp_path / "test.db"),
            "APP": config,
            "TODAY": TODAY,
        }
    )


@pytest.fixture
def app(tmp_path):
    return make_app(tmp_path)


@pytest.fixture
def empty_app(tmp_path):
    return make_app(tmp_path, seed=False)


@pytest.fixture
def client(app):
    return app.test_client()


def csrf_from(client, path: str) -> str:
    """Opens a page and reads the CSRF token from its form, the way a browser would."""
    html = client.get(path).get_data(as_text=True)
    match = re.search(r'name="csrf_token" value="([^"]+)"', html)
    assert match, f"no CSRF token on {path}"
    return match.group(1)


def post_form(client, path: str, data: dict, token_page: str | None = None):
    """Submits a form with a valid CSRF token, taken from `token_page` (default: the same page)."""
    token = csrf_from(client, token_page or path)
    return client.post(path, data={**data, "csrf_token": token})
