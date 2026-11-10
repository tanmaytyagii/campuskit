"""Settings: app_config.json (what the app shows) and environment variables (how it runs)."""

from __future__ import annotations

import json
import os
import re
import secrets
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = PROJECT_ROOT / "app_config.json"
ENV_PATH = PROJECT_ROOT / ".env"
INSTANCE_PATH = PROJECT_ROOT / "instance"
# The addresses that mean "this computer only".
LOCAL_HOSTS = ("127.0.0.1", "localhost")


class ConfigError(ValueError):
    """Raised when app_config.json or .env contains an invalid value."""


@dataclass(frozen=True)
class AppConfig:
    app_name: str
    institution_name: str
    author_name: str
    students_per_page: int
    """How many students each page of the student list shows (5 to 50)."""
    seed_demo_data: bool
    """Fill a new, empty database with fictional sample students and courses."""


def _text(data: dict[str, Any], key: str, required: bool, max_length: int) -> str:
    value = data.get(key)
    if not isinstance(value, str):
        raise ConfigError(f'"{key}" must be text')
    value = value.strip()
    if required and not value:
        raise ConfigError(f'"{key}" must not be empty')
    if len(value) > max_length:
        raise ConfigError(f'"{key}" must be at most {max_length} characters')
    return value


def parse_config(data: Any) -> AppConfig:
    if not isinstance(data, dict):
        raise ConfigError("the file must contain a JSON object")
    per_page = data.get("students_per_page")
    # bool is a subclass of int in Python, so exclude it explicitly.
    if isinstance(per_page, bool) or not isinstance(per_page, int) or not 5 <= per_page <= 50:
        raise ConfigError('"students_per_page" must be a whole number from 5 to 50')
    seed = data.get("seed_demo_data")
    if not isinstance(seed, bool):
        raise ConfigError('"seed_demo_data" must be true or false')
    return AppConfig(
        app_name=_text(data, "app_name", required=True, max_length=60),
        institution_name=_text(data, "institution_name", required=False, max_length=80),
        author_name=_text(data, "author_name", required=False, max_length=60),
        students_per_page=per_page,
        seed_demo_data=seed,
    )


def load_config(path: Path = CONFIG_PATH) -> AppConfig:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ConfigError(f"{path.name} was not found next to run.py") from error
    except json.JSONDecodeError as error:
        raise ConfigError(f"{path.name} is not valid JSON (line {error.lineno}): {error.msg}") from error
    return parse_config(data)


def load_env_file(path: Path = ENV_PATH) -> None:
    """Reads KEY=VALUE lines from .env into the environment, without replacing variables
    that are already set. Blank lines and lines starting with # are skipped."""
    if not path.exists():
        return
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, separator, value = line.partition("=")
        key = key.strip()
        if not separator or not key.isidentifier():
            raise ConfigError(f".env line {number} must look like NAME=value")
        os.environ.setdefault(key, value.strip().strip('"').strip("'"))


def server_host(environ: Mapping[str, str] = os.environ) -> str:
    """Where python run.py listens: HOST, or 127.0.0.1 (only this computer)."""
    return environ.get("HOST", "").strip() or "127.0.0.1"


def server_port(environ: Mapping[str, str] = os.environ) -> int:
    """The port python run.py listens on: PORT, or 5000."""
    text = environ.get("PORT", "").strip() or "5000"
    port = int(text) if re.fullmatch(r"[0-9]{1,5}", text) else 0
    if not 1 <= port <= 65535:
        raise ConfigError(f"PORT must be a whole number from 1 to 65535, not “{text}”")
    return port


def trusted_hosts(host: str) -> list[str] | None:
    """The names a request may give in its Host header (Flask's TRUSTED_HOSTS).

    When the app listens only on this computer, that is 127.0.0.1 and localhost. This stops
    "DNS rebinding": a website pointing a name it controls at 127.0.0.1, so that its scripts
    can open this app's pages and send its forms. When HOST makes the app listen on the
    network, people may use any of the computer's addresses, so every name is accepted."""
    return list(LOCAL_HOSTS) if host in LOCAL_HOSTS else None


def check_debug(host: str, debug: bool) -> None:
    """FLASK_DEBUG=1 turns on Werkzeug's debugger, whose error pages can run any Python code
    typed into them. That is safe only when nobody else can open the app."""
    if debug and host not in LOCAL_HOSTS:
        raise ConfigError(
            "FLASK_DEBUG=1 works only with HOST=127.0.0.1,"
            " because the debugger can run any code typed into an error page"
        )


def secret_key(instance_path: Path = INSTANCE_PATH) -> str:
    """The key Flask signs session cookies with. SECRET_KEY from the environment wins;
    otherwise a random key is created once in instance/secret_key, which is never committed."""
    from_environment = os.environ.get("SECRET_KEY", "").strip()
    if from_environment:
        return from_environment
    key_file = instance_path / "secret_key"
    if key_file.exists():
        return key_file.read_text(encoding="utf-8").strip()
    instance_path.mkdir(parents=True, exist_ok=True)
    key = secrets.token_hex(32)
    # Created readable by its owner only (0o600) from the start, so no other account on the
    # computer can read it, even for a moment. O_EXCL never overwrites an existing key.
    try:
        descriptor = os.open(key_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:  # another process created it first
        return key_file.read_text(encoding="utf-8").strip()
    with os.fdopen(descriptor, "w", encoding="utf-8") as file:
        file.write(key)
    return key
