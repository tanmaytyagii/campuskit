# CampusKit 5.0: progress log

This file records the state of the CampusKit 5.0 work so another session can continue it. Nothing here is a claim that a check passed unless the result is listed. Nothing is committed, pushed or deployed: the maintainer publishes.

## Starting point (30 October 2026)

- `main` at `245fb2a` (CampusKit 4.0.0), working tree clean.
- Baseline on macOS, Node.js 24.12.0, pnpm 10.34.7:
  - `pnpm check` passed: 3 templates Verified, 444 tests in 52 files, build.
- GitHub Actions for `245fb2a`: every CI job passed, including "Generated projects (windows-latest)" for the first time. A manual Pages deployment succeeded on 27 October.
- Job logs need a signed-in account, so why Windows started passing can't be read. The first passing run is also the first with all the verifier changes from the 4.0 audit and hardening pass:
  - the real temporary path instead of the 8.3 short name;
  - Streamlit bound to `127.0.0.1`;
  - stopping the whole process tree on Windows;
  - a time limit on each health-check request.

## Plan (priority order)

- P0:
  - verifier diagnostics (command, exit code or signal, time limits);
  - a post-deployment smoke test;
  - accessibility, with a manual screen-reader test guide.
- P1: Flask + SQLite student management template: app, tests, docs, learning guide, demo, verification.
- P2: My Projects dashboard; progress export and import; spaced-repetition viva; report export (.docx, print to PDF).
- P3: more templates (library, quiz, ML notebook); Extend Your Project guides; generator options.
- P4: PWA, Hindi, performance.

## Done

- **P0.1 Verifier diagnostics:** `runCommand` in `scripts/lib/processes.ts`. Failures name the command, the exit code or the signal (not "code null"), and the end of the output. Each command has a time limit (15 minutes by default) that stops its whole process tree. Five tests in `tests/processes.test.ts`.
- **P0.2 Smoke test after deployment:**
  - `pnpm smoke <url> [--expect-entry …]` (`scripts/smoke-site.ts`, `scripts/lib/smoke.ts`, ten tests in `tests/smoke.test.ts`).
  - In `deploy-pages.yml`, the build job outputs its entry script and deploy outputs `page_url`. A new read-only `smoke` job waits until the live site serves that build, then checks it in Chromium. Screenshots of failures are uploaded.
  - Run against the live site on 30 Oct: 9 of 9 checks passed. actionlint is clean.
- **P0.3 Accessibility:**
  - Readiness announces the new score after a tick (test added).
  - `docs/accessibility-testing.md`: what the automated checks cover, and manual scripts for VoiceOver (macOS, iPhone) and NVDA. Registered on the site. No screen reader has been used.

- **P1 Flask + SQLite template:** `templates/student-management-system` (package `studentms`), version 1.0.0.
  - Flask only, plus pytest: CSRF, `.env` loading and validation are written by hand. There's no JavaScript, and the CSP has `script-src 'none'`.
  - SQLite through `sqlite3`, with parameterized queries, foreign keys with cascades, `CHECK` constraints and an attendance upsert.
  - 69 pytest tests: validation, config, database, pages, security and CLI commands.
  - Bugs found and fixed, each with regression tests:
    - startup re-seeded any empty database, so `reset-db --empty` didn't last (now only a new file is seeded);
    - `str.isdigit()` accepted “²” (a crash) and Arabic-Indic digits (read as numbers): now `whole_number()` accepts only 0 to 9.
  - axe clean on 13 pages in light and dark mode (after fixing dark contrast, landmark names and the invalid-field style); no overflow at 320 px. Screenshots are in `docs/screenshots`.
  - Manifest registered. The schema's `localUrl` now also allows `127.0.0.1` (JSON schema regenerated).
  - The verifier starts `python run.py` for Flask apps: health check, home page title and database file.
  - Security review (30 Oct), each with tests:
    - DNS rebinding: Flask's `TRUSTED_HOSTS` allows only `127.0.0.1` and `localhost` while `HOST` is local. Untrusted hosts get a plain 400, because Flask builds no links for them.
    - `FLASK_DEBUG=1` is refused unless `HOST` is local, and a bad `PORT` gets a clear message.
    - `instance/secret_key` is created with `os.open(..., O_EXCL, 0o600)`.
  - **Verified on macOS, 30 Oct:** `verify:generated student-management-system --record` passed both variants (69 tests each, health check, home page, database created). Recorded in `packages/project-catalog/verification/student-management-system.json`. Linux and Windows: not run here; CI runs them on push.
  - Learning guide `packages/project-catalog/learning/student-management-system.json`: validates (architecture, 13 walkthrough entries, 22 checklist items, 25 viva questions, 7 troubleshooting entries).
  - The Jinja templates are in `.prettierignore` (Prettier can't parse `{% %}` inside tags). The other template files are Prettier-formatted, so the theme colour edits now use lowercase hex.
  - To run it by hand, use a copy (e.g. rsync to the scratchpad), never the template folder, which would get `instance/` and `__pycache__/`.
- **P1 Demo Studio simulation** (`apps/web/src/features/demo/demos/students/`):
  - New fidelity `simulation` (types, notice wording, demos page label): an educational simulation, clearly labelled. The browser runs no Python and no SQL.
  - `model.ts` reproduces validation.py, seed_db(), list_students() (search, filters, sorting, pages), statistics() and the database rules (UNIQUE NOCASE, AUTOINCREMENT, cascades, upsert). Every change logs the SQL statement the real app runs, with its parameters.
  - `scripts/python/sms_parity.py` runs the template's real code, and `pnpm demo:fixtures:students` saves `sms.fixture.json`. `model.test.ts` has 78 tests: every validation case, sample data, 18 queries, statistics, rounding and database behaviour. A deliberate mutation makes them fail.
  - Parity bugs found in the simulation and fixed: ties in percentages (Python rounds 81.25 to 81.2), years 1 to 99 in dates.
  - Screens: Dashboard, Students (list, record page, add/edit form, delete confirmation), Courses, Attendance (sheet, upsert), Database (tables, SQL log, constraints). The messages are the template's flash messages.
  - 10 UI tests in `StudentsDemo.test.tsx`. e2e: gallery and journey counts for 4 projects; axe on 5 demo pages and on the form, record and confirmation, in both themes, on desktop and mobile; no overflow at 360 and 320 px.
- Web unit tests: 332 passed (31 files) after these changes.
- Full check after P1 (run step by step because of disk pressure: validate, format:check, lint, typecheck, `vitest run --maxWorkers=4`, build): all passed, 554 tests in 55 files. Entry script 497.38 kB (149.47 kB gzip).
- **P2.1 Progress backup and restore** (`apps/web/src/lib/backup.ts`, 20 tests):
  - File format `campuskit-progress` version 1: per project, the checklist, demonstration and readiness ticks, viva ratings, the rehearsal and the report draft.
  - Strict checks: anything malformed refuses the whole file, with the reason; newer versions are refused; unknown projects are listed and left out; reports are rebuilt from known fields only. A `MIGRATIONS` table for future versions is empty, because v1 is the first format.
  - Restore replaces only the projects in the file. Typed viva answers are never saved; demo data, the generator draft and the theme are left out.
  - `isStoredReport` now refuses non-text info fields, which would have crashed the report builder.
- **P2.2 My projects** (`/my-projects`, `features/workspace/`): started projects with checklist and viva meters, guided demo, report, demonstration and readiness status, a rule-based suggested next step, per-project deletion with confirmation, and backup download plus restore with a preview. Linked from the Learn page and the footer. 7 page tests; e2e round trip through a real download and file chooser (desktop and mobile); axe on the empty page, the preview and a populated page in both themes.

- **P2.3 Spaced review** (`features/viva/logic.ts`): intervals 1 day (Not yet), 2 days (Partly), 3/7/14/30 days by consecutive confident days (`confidentStreak`, optional, so old ratings stay valid; a second rating on the same day doesn't lengthen the streak). "Spaced review" card with the due count or the next date. 6 schedule tests, 1 page test.
- **P2.4 Report export:** `lib/docx.ts` (remark → WordprocessingML → JSZip; `unified`, `remark-parse` and `jszip` now declared in apps/web at the versions already installed, nothing downloaded; loaded on click). 5 unit tests, 1 page test. python-docx 1.2.0 (scratch venv) opened a real exported report: styles, 3 tables, lists, checkboxes. "Print or save as PDF" prints only the report (portal plus `.print-report` CSS), black on white in either theme. Checked in Chromium with print media. e2e covers the .docx download and the print view.

- **P4 Performance (31 Oct):** 4.0.0 (`245fb2a`, built in a temporary detached worktree, since removed) vs now, both production builds, entry plus modulepreloaded scripts: 733.0 kB / 221.5 kB gzip (entry 484.5 kB) → 661.3 kB / 200.8 kB gzip (entry 374.1 kB). JSZip is off the first load (`packaging.ts` in the engine, `./spec` export, `features/generator/zip.ts` loaded on click). Tests: 595 passed (58 files); e2e generator, journeys and workspace pass on desktop and mobile.

- **Final gate (31 Oct):** see BUILD_STATUS.md. All check steps pass (595 tests); e2e 263 passed, 7 skipped in Chromium and in WebKit; verify:generated 8 of 8; smoke 10 of 10 against a local build; clean copy passes on macOS and Linux (Docker); audits clean. Version 5.0.0-rc.1 in all package.json files. Release package: `~/Downloads/campuskit-5.0.0-rc.zip`.

## Next action

The maintainer reviews and pushes. Then: CI on Windows and Linux for the new template, the Pages smoke job, and the remaining 5.0 items (more templates, Extend guides, generator options, PWA, Hindi) in a later release.
