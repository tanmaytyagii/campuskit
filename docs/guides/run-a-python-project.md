# Run a Python project

This guide is for the CampusKit Python template (Student Result Analyzer), a Streamlit app that uses pandas. It takes about ten minutes the first time.

Every generated project also contains a `GETTING_STARTED.md` file with the exact commands for that project. If anything here differs from that file, follow `GETTING_STARTED.md`.

## 1. Install Python

Download Python 3.11 or newer from [python.org](https://www.python.org/downloads/).

- **Windows:** on the first screen of the installer, tick **Add python.exe to PATH**, then choose **Install Now**.
- **macOS:** run the installer package. You can also use Homebrew if you already have it.
- **Linux:** Python 3 is usually installed. If `python3 -m venv` fails, install your distribution's `python3-venv` package.

Open a **new** terminal and check the version:

```bash
python --version
```

On macOS and Linux, use `python3 --version`. It must print `Python 3.11` or newer.

## 2. Open a terminal in the project folder

Extract the ZIP and open a terminal in the folder that contains `app.py` and `requirements.txt` (see [Run a React project](run-a-react-project.md#2-open-a-terminal-in-the-project-folder) for how to do this on each system).

## 3. Create and activate a virtual environment

A virtual environment keeps this project's packages separate from the rest of your computer.

**Windows (PowerShell):**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**macOS and Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

When it is active, your prompt starts with `(.venv)`. Activate it again every time you open a new terminal for this project. Type `deactivate` to leave it.

## 4. Install the dependencies

```bash
pip install -r requirements.txt
```

This needs an internet connection and downloads Streamlit, pandas, Altair and their dependencies into `.venv` (about 500 MB).

## 5. Start the app

```bash
streamlit run app.py
```

Streamlit opens `http://localhost:8501/` in your browser. Press `Ctrl+C` in the terminal to stop it. The project's `.streamlit/config.toml` turns off Streamlit's anonymous usage statistics.

## 6. Run the tests

```bash
pip install -r requirements-dev.txt
python -m pytest
```

`requirements-dev.txt` adds pytest to the packages you already installed.

## Common problems

| What you see                                                                         | What to do                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'python' is not recognized`, or typing `python` opens the Microsoft Store (Windows) | Python is not on your PATH. Reinstall it with **Add python.exe to PATH** ticked, or try the launcher: `py -m venv .venv`. You can also turn off the `python.exe` alias in **Settings → Apps → Advanced app settings → App execution aliases**.                          |
| `Activate.ps1 cannot be loaded because running scripts is disabled`                  | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once in PowerShell, then activate again.                                                                                                                                                                      |
| `error: externally-managed-environment`                                              | You ran `pip install` outside the virtual environment. Activate `.venv` first (step 3).                                                                                                                                                                                 |
| `ModuleNotFoundError: No module named 'streamlit'`                                   | The virtual environment is not active, or step 4 failed. Activate it and run `pip install -r requirements.txt` again.                                                                                                                                                   |
| The app opens on port 8502, or `Port 8501 is not available`                          | Another Streamlit app is using port 8501. Streamlit normally moves to the next free port and prints the address it chose. If you set the port yourself with `--server.port` and it is busy, it stops instead: stop the other app with `Ctrl+C`, or choose another port. |
| The app says your CSV can't be analysed                                              | The message lists each problem with its row and column. Fix them in the file and upload it again. The README explains the expected columns.                                                                                                                             |

If something is badly broken, delete the `.venv` folder and repeat steps 3 and 4.
