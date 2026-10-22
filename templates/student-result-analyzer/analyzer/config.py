"""Reads app_config.json, the file you edit to change the app's settings."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

CONFIG_PATH = Path(__file__).resolve().parent.parent / "app_config.json"


class ConfigError(ValueError):
    """Raised when app_config.json contains an invalid value."""


@dataclass(frozen=True)
class AppConfig:
    app_name: str
    institution_name: str
    author_name: str
    pass_mark: int
    """Minimum percentage needed to pass a subject (30 to 60)."""
    max_marks: int
    """Maximum marks for each subject, for example 100."""


def _text(data: dict[str, Any], key: str, required: bool) -> str:
    value = data.get(key)
    if not isinstance(value, str):
        raise ConfigError(f'"{key}" must be text')
    value = value.strip()
    if required and not value:
        raise ConfigError(f'"{key}" must not be empty')
    return value


def _whole_number(data: dict[str, Any], key: str, low: int, high: int) -> int:
    value = data.get(key)
    # bool is a subclass of int in Python, so exclude it explicitly.
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ConfigError(f'"{key}" must be a whole number from {low} to {high}')
    return value


def parse_config(data: Any) -> AppConfig:
    if not isinstance(data, dict):
        raise ConfigError("the file must contain a JSON object")
    return AppConfig(
        app_name=_text(data, "app_name", required=True),
        institution_name=_text(data, "institution_name", required=False),
        author_name=_text(data, "author_name", required=False),
        pass_mark=_whole_number(data, "pass_mark", 30, 60),
        max_marks=_whole_number(data, "max_marks", 10, 1000),
    )


def load_config(path: Path = CONFIG_PATH) -> AppConfig:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ConfigError(f"{path.name} was not found next to app.py") from error
    except json.JSONDecodeError as error:
        raise ConfigError(f"{path.name} is not valid JSON (line {error.lineno}): {error.msg}") from error
    return parse_config(data)
