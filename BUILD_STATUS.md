# Build status

This file records what was checked for CampusKit 3.0.0, what the checks showed, and what was **not** verified. Every result below was produced on 23 October 2026 (India Standard Time) in this working copy, unless it says otherwise. Earlier reports are in the git history.

## Summary

| Area                                                                                    | Status                                                                                      |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Learning studio: overview, architecture, code walkthrough, checklist, troubleshooting   | Implemented and tested                                                                      |
| Viva practice: quick, topic, mixed and review modes; self-assessment; saved ratings     | Implemented and tested                                                                      |
| Submission workspace: new sections, facts appendix, demonstration checklist, slide list | Implemented and tested                                                                      |
| Comparison page and goal suggestions                                                    | Implemented and tested                                                                      |
| Customization studio: app preview, files per setting, unavailable settings, saved draft | Implemented and tested                                                                      |
| Learning guides for all three templates                                                 | Written; every file, function and label they name is checked against the templates          |
| Templates (unchanged, version 1.0.0)                                                    | Verified on macOS on 23 October 2026; Linux and macOS also pass in GitHub Actions (2.0 run) |
| GitHub Actions on Windows and the Pages deployment                                      | Failing on GitHub for 2.0; see “Not run or not verified”                                    |

## Environment

- macOS 26.2 on Apple silicon (arm64)
- Node.js 24.12.0, pnpm 10.34.7 (run through `npx pnpm@10.34.7`), npm 11.6.2
- Python 3.11.7 from python.org, passed with `CAMPUSKIT_PYTHON` (Homebrew's Python 3.11.15 on this computer can't create virtual environments; that problem is now an “observed” troubleshooting entry)
- Playwright's Chromium headless shell 156.0.8078.4

## Commands run

| Command                          | Result                                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Passed; the lockfile is in sync                                                                                                   |
| `pnpm check`                     | Passed: validate, format check, lint, type check, unit tests and build                                                            |
| `pnpm validate`                  | Catalog OK: 3 projects, each with a learning guide and each **Verified**, no warnings. Repository check OK                        |
| `pnpm test`                      | 312 tests passed in 38 files (238 in 28 files before this release; no test was removed)                                           |
| `pnpm test:e2e`                  | 146 passed and 2 skipped by design (84 passed before this release)                                                                |
| `pnpm verify:generated --record` | 6 of 6 generated projects installed, tested and built; the macOS entries in `packages/project-catalog/verification/` were updated |
| `pnpm screenshots web`           | Recaptured the website screenshots, including three new ones: learning studio, viva practice and comparison                       |

For each template, `pnpm verify:generated` generated two projects (default settings, and every setting changed with a name full of special characters and Unicode), extracted the ZIPs, checked every file, customization, exclusion, `GETTING_STARTED.md` and `docs/PROJECT_REPORT_DRAFT.md`, then ran:

| Template                  | Tests                                           | Build or start                                   |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| Student Attendance System | `npm test`: 34 passed, in both projects         | `npm run build` passed                           |
| Personal Expense Tracker  | `npm test`: 39 passed, in both projects         | `npm run build` passed                           |
| Student Result Analyzer   | `python -m pytest`: 49 passed, in both projects | `streamlit run app.py` answered its health check |

## What the new tests cover

- **Learning guides:** the schema (unknown components, duplicate ids, unsafe paths), `findSymbolLine` for TypeScript, Python, JSON and TOML, the unsafe-command filter, and the validator's checks against the real attendance template: missing files, undefined functions, invented navigation labels, advice for the wrong stack and destructive commands. Colour swatches must be colours the template uses.
- **Viva practice:** question selection for every mode with a repeatable random source, review ordering, word-boundary matching for key ideas, the outcome rule, saved and reset ratings, malformed saved values ignored, and typed answers never stored. Component tests run a topic session, a skipped question, the review list and the reset dialog.
- **Learning studio:** section navigation and focus, architecture links to the real files and definitions, the walkthrough's links, checklist ticks saved and reset after confirmation, troubleshooting search and the “Seen during verification” marking.
- **Comparison:** every goal rule, labelled fallbacks, verified-only suggestions, address parsing and the plain-language trade-off sentences.
- **Customization studio:** files per setting, unavailable settings, the preview model (name, institution and the real theme colour), draft restoring and its use across a remount.
- **Submission workspace:** the new sections, the facts appendix with and without verification results, the demonstration appendix, the slide list, “CampusKit draft” versus “Edited by you”, and restoring a draft saved before the new sections existed.
- **End to end:** every new page loads directly with no console errors, failed requests or sideways scrolling at 1280, 360 and 320 pixels; axe with every rule in both themes on the new pages, an open troubleshooting entry and a revealed viva answer; a walkthrough link landing on the highlighted definition; viva ratings surviving a reload; the workspace download containing the appendices.

## GitHub Actions for 2.0 (read from the public API on 23 October 2026)

- CI for the 2.0 commit: validation, lint, type check, unit tests, build, end-to-end tests, and generated-project verification on **Linux and macOS passed**. Generated-project verification on **Windows failed**, as it did for 1.0. The job log needs a signed-in GitHub account, so the cause is not known.
- 3.0 hardens two Windows-specific weak points in `scripts/verify-generated-projects.ts`: it now waits for the Streamlit process to exit and retries deleting temporary folders (Windows keeps files locked briefly). Whether this was the cause can only be confirmed by the next Windows run.
- **Deploy to GitHub Pages failed** for both commits at `actions/configure-pages` with “Get Pages site failed … verify that the repository has Pages enabled and configured to build using GitHub Actions”. This is a repository setting (Settings → Pages → Source: GitHub Actions), not a code problem.

## Not run or not verified

- **Windows and Linux** were not run locally. The templates' records are macOS only; GitHub's Linux run passed for 2.0 and Windows failed (see above).
- **Firefox and Safari:** browser tests used Chromium only.
- **Real deployments:** nothing was deployed.
- **Assistive technology:** no testing with real screen readers. Accessibility was checked with axe-core, role-based queries and keyboard tests.
- **Learning guide prose:** the validator proves every file, function, label and command reference is real and safe; whether each explanation is pedagogically ideal was checked by reading the code while writing it, not by an independent reviewer.
- **Dependency audits** were not run. No dependency was added.

## Known issues and limitations

- There are three templates. The AI and machine learning category is empty, and the comparison page says so.
- The key-idea check in viva practice only looks for words; students judge their own answers.
- Learning progress and report drafts live in one browser's localStorage, with no sync. The workspace downloads Markdown and copies a plain slide list; there is no PDF or PowerPoint export.
- The generator only changes what each manifest declares, and the app preview is an illustration (clearly labelled), not a screenshot of the generated app.

## How to run it

```bash
npm install --global pnpm@10.34.7   # or: corepack enable
pnpm install
pnpm dev                            # http://localhost:5173/
pnpm check                          # validate, format:check, lint, typecheck, test, build
pnpm playwright:install             # once, then:
pnpm test:e2e
pnpm verify:generated               # needs Python 3.11+ for the Python template
```

See [README.md](README.md) for every command and [CONTRIBUTING.md](CONTRIBUTING.md) for the pull request checklist.
