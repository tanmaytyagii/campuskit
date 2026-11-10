import json
import os
import stat

import pytest

from studentms.config import (
    ConfigError,
    check_debug,
    load_config,
    load_env_file,
    parse_config,
    secret_key,
    server_host,
    server_port,
    trusted_hosts,
)

VALID = {
    "app_name": "Campus Records",
    "institution_name": "",
    "author_name": "",
    "students_per_page": 10,
    "seed_demo_data": True,
}


def test_the_shipped_config_is_valid():
    assert load_config().students_per_page >= 5


def test_invalid_values_are_refused_with_a_reason():
    with pytest.raises(ConfigError, match="students_per_page"):
        parse_config({**VALID, "students_per_page": 500})
    with pytest.raises(ConfigError, match="students_per_page"):
        parse_config({**VALID, "students_per_page": True})
    with pytest.raises(ConfigError, match="seed_demo_data"):
        parse_config({**VALID, "seed_demo_data": "yes"})
    with pytest.raises(ConfigError, match="app_name"):
        parse_config({**VALID, "app_name": "   "})


def test_a_broken_file_names_the_line(tmp_path):
    path = tmp_path / "app_config.json"
    path.write_text('{"app_name": "x",', encoding="utf-8")
    with pytest.raises(ConfigError, match="not valid JSON"):
        load_config(path)
    path.write_text(json.dumps({**VALID, "app_name": "केंद्रीय विद्यालय"}, ensure_ascii=False), encoding="utf-8")
    assert load_config(path).app_name == "केंद्रीय विद्यालय"


def test_env_file_sets_only_missing_variables(tmp_path, monkeypatch):
    monkeypatch.setenv("PORT", "8000")
    monkeypatch.delenv("HOST", raising=False)
    env = tmp_path / ".env"
    env.write_text("# comment\n\nHOST=127.0.0.1\nPORT=5000\n", encoding="utf-8")
    load_env_file(env)
    import os

    assert os.environ["HOST"] == "127.0.0.1"
    assert os.environ["PORT"] == "8000"
    env.write_text("this is not a setting\n", encoding="utf-8")
    with pytest.raises(ConfigError, match="line 1"):
        load_env_file(env)


def test_secret_key_is_created_once_and_kept(tmp_path, monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)
    first = secret_key(tmp_path)
    assert len(first) == 64
    assert secret_key(tmp_path) == first
    monkeypatch.setenv("SECRET_KEY", "from-the-environment")
    assert secret_key(tmp_path) == "from-the-environment"


@pytest.mark.skipif(os.name == "nt", reason="Windows has no Unix file permissions")
def test_secret_key_file_is_readable_by_its_owner_only(tmp_path, monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)
    secret_key(tmp_path)
    assert stat.S_IMODE((tmp_path / "secret_key").stat().st_mode) == 0o600


def test_host_and_port_come_from_the_environment():
    assert server_host({}) == "127.0.0.1"
    assert server_host({"HOST": " 0.0.0.0 "}) == "0.0.0.0"
    assert server_port({}) == 5000
    assert server_port({"PORT": "5050"}) == 5050


@pytest.mark.parametrize("text", ["abc", "0", "65536", "-1", "50.5", "\u00b2"])
def test_a_wrong_port_is_refused_with_a_reason(text):
    with pytest.raises(ConfigError, match="PORT must be a whole number"):
        server_port({"PORT": text})


def test_only_this_computer_s_names_are_trusted_when_listening_locally():
    assert trusted_hosts("127.0.0.1") == ["127.0.0.1", "localhost"]
    assert trusted_hosts("localhost") == ["127.0.0.1", "localhost"]
    assert trusted_hosts("0.0.0.0") is None


def test_the_debugger_is_refused_when_other_computers_can_connect():
    check_debug("127.0.0.1", True)
    check_debug("0.0.0.0", False)
    with pytest.raises(ConfigError, match="FLASK_DEBUG=1"):
        check_debug("0.0.0.0", True)
