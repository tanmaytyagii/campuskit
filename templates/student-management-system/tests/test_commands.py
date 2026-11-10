"""The database commands: flask --app studentms init-db, seed-db, reset-db and backup-db."""

import sqlite3

from conftest import make_app


def count(path, table="students"):
    connection = sqlite3.connect(path)
    try:
        return connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    finally:
        connection.close()


def test_reset_needs_confirmation_and_keeps_a_backup(app, tmp_path):
    runner = app.test_cli_runner()
    refused = runner.invoke(args=["reset-db"])
    assert refused.exit_code != 0 and "--yes" in refused.output
    assert count(app.config["DATABASE"]) == 12

    result = runner.invoke(args=["reset-db", "--yes", "--empty"])
    assert result.exit_code == 0, result.output
    assert "Saved a backup" in result.output
    assert count(app.config["DATABASE"]) == 0
    backups = list((tmp_path / "backups").glob("students-*.db"))
    assert len(backups) == 1 and count(backups[0]) == 12


def test_seed_refuses_a_database_with_data(app):
    result = app.test_cli_runner().invoke(args=["seed-db"])
    assert result.exit_code != 0 and "already has data" in result.output


def test_seed_and_init_on_an_empty_database(empty_app):
    runner = empty_app.test_cli_runner()
    assert runner.invoke(args=["init-db"]).exit_code == 0
    assert count(empty_app.config["DATABASE"]) == 0
    assert runner.invoke(args=["seed-db"]).exit_code == 0
    assert count(empty_app.config["DATABASE"]) == 12


def test_backup_command(app, tmp_path):
    result = app.test_cli_runner().invoke(args=["backup-db"])
    assert result.exit_code == 0, result.output
    assert len(list((tmp_path / "backups").glob("students-*.db"))) == 1


def test_an_emptied_database_stays_empty_after_a_restart(app, tmp_path):
    # Regression: starting the app used to refill any empty database with the sample data.
    assert app.test_cli_runner().invoke(args=["reset-db", "--yes", "--empty"]).exit_code == 0
    restarted = make_app(tmp_path)
    assert count(restarted.config["DATABASE"]) == 0
    assert restarted.test_client().get("/").status_code == 200


def test_only_a_new_database_file_gets_the_sample_data(app, tmp_path):
    connection = sqlite3.connect(app.config["DATABASE"])
    connection.execute("DELETE FROM students")
    connection.commit()
    connection.close()
    assert count(make_app(tmp_path).config["DATABASE"]) == 0
