"""Runs the Streamlit app headlessly with Streamlit's own testing tool."""

from __future__ import annotations

from pathlib import Path

from streamlit.testing.v1 import AppTest

from analyzer.config import load_config

APP = str(Path(__file__).resolve().parent.parent / "app.py")


def test_app_runs_with_the_sample_dataset():
    app = AppTest.from_file(APP, default_timeout=60).run()
    assert not app.exception, app.exception
    config = load_config()
    assert app.title[0].value == config.app_name
    labels = [metric.label for metric in app.metric]
    assert labels == ["Students", "Subjects", "Average percentage", "Passed every subject"]
    assert app.metric[0].value == "40"
    assert any("passed validation" in success.value for success in app.success)
    assert len(app.tabs) == 6


def test_upload_mode_asks_for_a_file():
    app = AppTest.from_file(APP, default_timeout=60).run()
    app.radio(key="source").set_value("Upload a CSV file").run()
    assert not app.exception, app.exception
    assert any("Upload a CSV file" in info.value for info in app.info)


def test_student_search_filters_results():
    app = AppTest.from_file(APP, default_timeout=60).run()
    app.text_input[0].input("Sharma").run()
    assert not app.exception, app.exception
    captions = " ".join(caption.value for caption in app.caption)
    assert "Showing" in captions and "of 40 students" in captions
