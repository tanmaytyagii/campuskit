from __future__ import annotations

import json

import pytest

from analyzer.config import CONFIG_PATH, ConfigError, load_config, parse_config

VALID = {
    "app_name": "Result Analyzer",
    "institution_name": "",
    "author_name": "",
    "pass_mark": 33,
    "max_marks": 100,
}


def test_the_shipped_config_is_valid():
    config = load_config(CONFIG_PATH)
    assert config.app_name
    assert 30 <= config.pass_mark <= 60


def test_parse_config_accepts_valid_values():
    config = parse_config(VALID)
    assert config.pass_mark == 33
    assert config.institution_name == ""


@pytest.mark.parametrize(
    ("key", "value", "message"),
    [
        ("app_name", "  ", "must not be empty"),
        ("pass_mark", 75, "from 30 to 60"),
        ("pass_mark", 40.5, "whole number"),
        ("pass_mark", True, "whole number"),
        ("max_marks", 0, "from 10 to 1000"),
        ("author_name", 5, "must be text"),
    ],
)
def test_parse_config_explains_invalid_values(key, value, message):
    with pytest.raises(ConfigError, match=message):
        parse_config({**VALID, key: value})


def test_load_config_reports_invalid_json(tmp_path):
    path = tmp_path / "app_config.json"
    path.write_text('{"app_name": "x",', encoding="utf-8")
    with pytest.raises(ConfigError, match="not valid JSON"):
        load_config(path)


def test_load_config_reads_unicode(tmp_path):
    path = tmp_path / "app_config.json"
    path.write_text(json.dumps({**VALID, "institution_name": "केंद्रीय विद्यालय"}, ensure_ascii=False), encoding="utf-8")
    assert load_config(path).institution_name == "केंद्रीय विद्यालय"
