"""Starts the app: python run.py, then open http://127.0.0.1:5000/ in your browser.

The first start creates instance/students.db (with sample data unless app_config.json says
otherwise). Press Ctrl+C in the terminal to stop."""

from __future__ import annotations

import sys

from studentms import create_app
from studentms.config import ConfigError, check_debug, server_host, server_port

app = create_app()

if __name__ == "__main__":
    # 127.0.0.1 means only this computer can open the app. See the README before changing it.
    try:
        host, port = server_host(), server_port()
        check_debug(host, app.config["DEBUG"])
    except ConfigError as error:
        sys.exit(f"Can't start the app: {error}.")
    app.run(host=host, port=port, debug=app.config["DEBUG"])
