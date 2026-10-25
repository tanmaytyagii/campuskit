# Build status

This file records the second QA pass on CampusKit 4.0.0, the “hardening pass” of 24–25 October 2026 (India Standard Time). It followed the release audit of 24 October; the audit's findings are summarised at the end. Every result below was produced in this working copy on the final code, unless it says otherwise. Nothing was committed, pushed or deployed.

## Summary

| Area                                             | Status                                                                                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validate, format, lint, type check, tests, build | Pass on macOS with Node.js 24.12.0 and 22.18.0: 444 unit tests in 52 files, 3 templates **Verified**. A clean copy of the package passed too, on macOS and in a Linux container (Node.js 24.21.0) |
| End-to-end tests                                 | Chromium, desktop and phone: 227 passed and 7 skipped by design, in 3 runs out of 3. WebKit and Firefox at desktop size: see “Browsers”                                                           |
| Generated projects                               | 6 of 6 verified on macOS. All three templates were fixed in this pass and recorded again                                                                                                          |
| Analyzer demo                                    | Matches the Python code with pandas 3.1.0 and PyArrow 26.0.0, as students install it: 28 recorded cases and 29,700 generated files                                                                |
| Accessibility                                    | axe in both themes, in all three browser engines; keyboard tests; focus after deletions and WCAG 1.4.12 text spacing fixed                                                                        |
| Sideways scrolling                               | None on 44 routes at 7 widths, and none with WCAG text spacing at 5 widths, in Chromium, WebKit and Firefox                                                                                       |
| Security                                         | No known vulnerable dependencies, no new dependencies, no secrets                                                                                                                                 |
| GitHub Actions                                   | Both workflows pass actionlint. The Windows verification and the Pages deployment are still unverified on GitHub                                                                                  |
| Windows, Safari, screen readers, real phones     | **Not run**                                                                                                                                                                                       |

## Environment

- macOS 26.2 on Apple silicon (arm64), Node.js 24.12.0, pnpm 10.34.7 (the pinned version, through Corepack shims in a temporary folder)
- Node.js 22.18.0, the oldest supported version: the official macOS build, checksum-checked against nodejs.org, in a temporary folder
- Playwright 1.64.1 with its Chromium 156 headless shell, Firefox 157 and WebKit 27.2 builds. The Firefox and WebKit builds were installed for the runs and removed afterwards
- Python 3.11.7 from python.org for `pnpm verify:generated`
- For the analyzer comparison and `pip-audit`, a temporary environment with what the template's requirements install today: pandas 3.1.0, PyArrow 26.0.0, numpy 2.4.6, Streamlit 1.66.1, Altair 6.3.0, pytest 9.1.1
- Docker Desktop for actionlint and a clean Linux container (`node:24-slim`, Debian, arm64)

## Commands run

| Command or check                                                                  | Result                                                                                                                                               | Where                                         |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `pnpm check`                                                                      | Passed: validate (3 templates **Verified**), format check, lint, type check, 444 tests in 52 files, build                                            | macOS, Node.js 24.12.0                        |
| `pnpm check`                                                                      | Passed: 444 tests in 52 files, build                                                                                                                 | macOS, Node.js 22.18.0                        |
| `pnpm test`, repeated                                                             | 3 of 3 runs passed, about 18 s each, with nothing else running                                                                                       | macOS                                         |
| `pnpm test:e2e` (Chromium, desktop and phone), repeated                           | 3 of 3 runs: 227 passed, 7 skipped by design                                                                                                         | macOS                                         |
| Every e2e spec at desktop size, WebKit 27.2                                       | 2 of 2 runs: 114 passed, 3 skipped                                                                                                                   | macOS, Playwright build                       |
| Every e2e spec at desktop size, Firefox 157                                       | Runs 2 and 3: 114 passed, 3 skipped. Run 1: 5 timeouts while the Mac was asleep (see “Browsers”)                                                     | macOS, Playwright build                       |
| `pnpm verify:generated`                                                           | 6 of 6: attendance (39 tests, build), expense tracker (48 tests, build), result analyzer (51 tests, Streamlit health check), defaults and customized | macOS                                         |
| `pnpm verify:generated <id> --record`                                             | Passing macOS records for attendance 1.0.1, expense tracker 1.0.2 and result analyzer 1.0.2                                                          | macOS                                         |
| `pnpm demo:compare`                                                               | 29,700 generated files (5 seeds × 5,400, 1 × 2,700), 0 differences, 0 Python exceptions                                                              | macOS, pandas 3.1.0 with PyArrow              |
| The analyzer's Streamlit app on 7 file shapes (`AppTest`, one-off)                | No exceptions. It found the “nan%” average, now fixed                                                                                                | macOS                                         |
| Sideways-scrolling sweep: 44 routes at 320, 360, 390, 768, 1024, 1440 and 1920 px | No sideways scrolling                                                                                                                                | Chromium, WebKit, Firefox                     |
| The same with WCAG 1.4.12 text spacing, at 320, 360, 390, 768 and 1280 px         | No sideways scrolling, after fixing the five pages that scrolled at 320 px                                                                           | Chromium, WebKit, Firefox                     |
| actionlint 1.7.12 (with shellcheck)                                               | No problems in either workflow                                                                                                                       | Docker                                        |
| `pnpm audit`; `npm audit` in both React templates; `pip-audit` for the Python one | No known vulnerabilities                                                                                                                             | macOS                                         |
| `git diff --check`; a scan for invisible and control characters                   | Clean. Two literal byte-order marks in the analyzer's tests became `﻿` escapes; the parity fixture's are test data                                   | macOS                                         |
| Clean copy of the package: `pnpm install --frozen-lockfile`, then `pnpm check`    | Passed, lockfile unchanged: 3 templates **Verified**, 444 tests in 52 files, build                                                                   | macOS; Linux (Debian, arm64), Node.js 24.21.0 |

The skipped end-to-end tests apply to one screen size only: keyboard tests run on desktop, phone-layout tests on phones.

## Found and fixed

### Defects

- **Saved data (Student Attendance System 1.0.1, Personal Expense Tracker 1.0.2):**
  - One damaged record made the app start fresh. It now loads everything that passes its checks, leaves out the rest and says what was wrong.
  - An unreadable value went to one backup key, so a second incident replaced the first copy. Copies are no longer replaced; later ones get the time added to their key.
  - A full browser storage made the backup write throw while the app loaded, so it showed a blank page. Now the app says so and saves nothing, so the saved data isn't overwritten.
  - Tests cover each case, in the storage module and in the app.
- **Student Result Analyzer 1.0.2:** a file where every score is absent showed the average as “nan%” in the Overview, its explanation and the Markdown report. Found by running the real Streamlit app on edge-case files. It now says there is no average yet, and the demo says the same.
- **Analyzer demo, measured against the wrong Python:**
  - The audit's comparison (and this pass's first runs) used pandas 3 without PyArrow, but Streamlit always installs PyArrow.
  - With PyArrow, pandas 3.1 runs `str.replace(r"\s+", " ")` on RE2 when a column is all ASCII, and RE2's `\s` leaves out U+000B and U+001C–U+001F. `pnpm demo:compare` found it once PyArrow was installed.
  - The demo now applies pandas' rule. `analyzer_parity.py` refuses to run without PyArrow and records its version, and the fixture has cases for both paths.
- **Keyboard focus:**
  - Deleting a row in a demo left focus on the page body. It now moves to the next row's delete button, or to the empty state or the filter reset. The confirmation dialog closes in a layout effect, before the page moves focus.
  - Removing the last filter chip in the gallery also lost focus; it now moves to the next chip or the result count.
- **Screen-reader semantics:**
  - Confirmation dialogs are now `alertdialog`s whose text is their description.
  - Each chart's “Table view” button names its chart.
- **Text spacing (WCAG 1.4.12):**
  - With wider letter, word and line spacing, five pages scrolled sideways at 320 px. The causes were a long word in the home page heading, the docs header, the checklist's fieldset, a file path in the demo panel, and the generator's buttons.
  - `overflow-wrap: break-word` on the body, `min-width: 0` on fieldsets, `min-w-0` on flex text, and a `wrap` option for `Button` fixed them.

### CI and tooling

- **`pnpm verify:generated`:**
  - A failed Streamlit health check now quotes the end of the app's output; before, it said only that the app didn't answer. This may finally show why the Windows job fails.
  - Each try has a 5-second limit, so a server that never answers can't hold the check past its deadline. A test fails without the limit.
  - An app stopped by a signal ends the wait at once.
  - On Windows, the whole process tree is stopped (`taskkill /T`), because a virtual environment's `python.exe` is a launcher. This is untested without Windows.
  - The helpers are in `scripts/lib/processes.ts`, with tests.
- **`pnpm demo:compare --shapes`** adds files random ones rarely have: one student, everyone absent, a subject nobody sat, hundreds of ties, every subject, and averages that round.
- **End-to-end tests:**
  - In WebKit on macOS they press Option-Tab, as Safari users must to reach links and buttons (`nextKey()` in `e2e/fixtures.ts`). That fixed the audit's two WebKit failures without weakening either test.
  - Four new journeys go from discovery to download, from learning to viva practice, from demo to presentation and back, and from readiness to the report and back.

## Cross-platform status

| Platform | Status                 | Evidence                                                                                                                                                                                                            |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS    | **Verified**           | Everything in “Commands run”                                                                                                                                                                                        |
| Linux    | **Partially verified** | A clean copy of the package passed `pnpm install --frozen-lockfile` and `pnpm check` in a Debian arm64 container. End-to-end tests and generated projects weren't run on Linux in this pass; CI runs them on Ubuntu |
| Windows  | **Not run**            | No Windows machine was available. GitHub's Windows job has failed on every release; the cause is unknown (see below)                                                                                                |

## Browsers

Every end-to-end spec ran at desktop size in Playwright's Firefox 157 and WebKit 27.2, through a configuration kept outside the repository.

- **WebKit:** both runs of the final gate passed.
  - On 24 October, the first run after installing WebKit failed once: “switching templates keeps the name…” found the template's default name instead of the typed one.
  - It didn't come back in 80 reruns of the same steps that day, including runs under CPU load and with random network delays, or in the final gate's two full runs.
  - The Mac's power log shows no sleep during that run. The cause is unknown.
- **Firefox:** runs 2 and 3 passed. In run 1, five axe tests timed out at once, 38 seconds in. The power log shows the Mac in idle sleep from 01:24:11 to 01:39:11. The trace shows one step taking 898 seconds, and on waking, every test that was running had passed its 45-second limit. Later runs used `caffeinate -i`, but a closed lid on battery still sends the Mac to sleep, which interrupted three sweeps; they were run again.

These builds are close to the browsers people use but not the same: Safari itself wasn't tested.

## What still needs GitHub

- **Windows generated-project verification:**
  - It failed for `b5f11ee` (3.1.0) and `ad52b02`, and Linux and macOS passed. The public annotation says only “exit code 1”.
  - Ruled out locally: line endings (`.gitattributes` forces LF), implicit text encodings in the Python template, and template file names.
  - After the push, any failure appears as an annotation, in the job summary and in the `verify-generated-windows-latest` artifact. A failed health check now includes Streamlit's own output.
- **GitHub Pages:** the deployment can't succeed until Pages is enabled (Settings → Pages → Source: GitHub Actions). The hosted site is unverified.
- **The workflows** pass actionlint, but only GitHub can run them.

## Not run or not verified

- Windows, and Safari itself.
- Screen readers: no screen reader was used. Accessibility was checked with axe-core, role-based queries (names, descriptions, roles) and keyboard tests in three engines.
- Real phones: phone layouts ran in Chromium's Pixel 7 emulation and at 320–390 px in all three engines.
- End-to-end tests on Linux: Playwright's Linux image needs about 2 GB, and the disk had under 3 GB free.
- The hosted website.
- The analyzer demo beyond the recorded and generated files: other inputs could still expose differences.

## Known issues and limitations

- The analyzer demo follows pandas 3 with PyArrow. A student with pandas 2.2, which `requirements.txt` still allows, or without PyArrow, can see differences:
  - numbers like `1e400` are called “not a number” instead of “out of range”;
  - five control characters inside names are kept or turned into spaces differently;
  - class averages can differ in a digit that doesn't show.
- The real analyzer still calls a CSV whose first line is blank “empty”, whatever follows; the demo does the same.
- Saved data that some other code damaged is copied once per incident, so repeated incidents add backup keys until the student removes them in the developer tools.
- The disk on this Mac was 99–100% full. That limited what could run: no Playwright Linux image, and one browser build at a time.

## Earlier: the release audit (24 October 2026)

- **Node.js:** the minimum is 22.18. Node.js 22.12 couldn't build or test, because the workspace TypeScript is loaded directly. `engines` says `^22.18.0 || >=23.6.0`, and CI tests and builds on 22.18.
- **Templates:**
  - The expense tracker accepted 100,000,000.01 and then couldn't read its own saved data (1.0.1).
  - The analyzer crashed on two identical non-ASCII column names (1.0.1).
- **Analyzer demo:** differences in whitespace, `1e400`, empty files, line numbers, duplicate columns, the sign of zero and class averages were found and fixed.
- **Focus:** the generator, route changes, learning studio sections and slides move focus in layout effects. A dialog that the page removes returns focus to its opener.
- **CI:**
  - time limits on every job;
  - no cancelled runs on `main`;
  - a pinned `pnpm/action-setup`;
  - a Node.js 22.18 job;
  - least-privilege Pages deployment;
  - annotations and job summaries from `verify:generated`;
  - a 2-minute limit for the internal-link test.

## How to run it

```bash
sudo corepack enable pnpm          # once, if `pnpm` is "command not found"
pnpm install
pnpm check                         # validate, format:check, lint, typecheck, test, build
pnpm playwright:install            # once, then:
pnpm test:e2e
pnpm verify:generated              # Python 3.11+ with the template's requirements for the analyzer
pnpm demo:compare                  # the same Python, with pandas 3 and PyArrow
```

See [README.md](README.md) for every command and [CONTRIBUTING.md](CONTRIBUTING.md) for the pull request checklist.
