from __future__ import annotations

from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture
def sample_bytes() -> bytes:
    return (ROOT / "data" / "sample_results.csv").read_bytes()


@pytest.fixture
def error_sample_bytes() -> bytes:
    return (ROOT / "data" / "sample_with_errors.csv").read_bytes()


def csv_bytes(text: str) -> bytes:
    """Builds CSV bytes from an indented triple-quoted string."""
    lines = [line.strip() for line in text.strip().splitlines()]
    return ("\n".join(lines) + "\n").encode("utf-8")
