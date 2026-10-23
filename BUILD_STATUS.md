# Build status

This file records what was checked for CampusKit 2.0.0, what the checks showed, and what was **not** verified. Every result below was produced on 22 October 2026 (India Standard Time) in this working copy. The 1.0.0 report, which covered a Linux run, is in the git history.

## Summary

| Area                                                                                    | Status                                                                             |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Website: gallery, project pages, generator, learning center, documentation              | Implemented and tested                                                             |
| Template verification statuses and records                                              | Implemented and tested; all three templates have a passing macOS record            |
| Template engine: options, declared edits, generated documents, escaping, path safety    | Implemented and tested                                                             |
| Project catalog: schema, validator, fingerprints, JSON Schema for editors               | Implemented and tested                                                             |
| Templates: Student Attendance System, Personal Expense Tracker, Student Result Analyzer | Unchanged since 1.0.0; verified as generated projects on macOS                     |
| CI and deployment workflows                                                             | Updated; the GitHub Actions workflows were not run (see "Not run or not verified") |

## Environment

- macOS 26.2 on Apple silicon (arm64)
- Node.js 24.12.0, pnpm 10.34.7 (run through `npx pnpm@10.34.7`), npm 11.6.2
- Python 3.11.7 from python.org, passed with `CAMPUSKIT_PYTHON`. The Homebrew Python 3.11.15 on this computer could not create virtual environments (its `ensurepip` fails), which is a problem with that installation, not with the template.
- Playwright's Chromium headless shell 156.0.8078.4, installed with `pnpm playwright:install`

## Commands run

| Command                                | Result                                                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`       | Passed; the lockfile is in sync                                                                                                                 |
| `pnpm check`                           | Passed. It runs the six commands below in order                                                                                                 |
| `pnpm validate`                        | Catalog OK: 3 projects (44, 45 and 30 template files; 13, 12 and 8 edits), each **Verified**, no warnings. Repository check OK                  |
| `pnpm format:check`                    | Every file matches the Prettier style                                                                                                           |
| `pnpm lint`                            | No problems with `--max-warnings=0`                                                                                                             |
| `pnpm typecheck`                       | No errors                                                                                                                                       |
| `pnpm test`                            | 238 tests passed in 28 files (202 in 23 files before this release; no test was removed)                                                         |
| `pnpm build`                           | Passed                                                                                                                                          |
| `pnpm test:e2e`                        | 84 passed and 2 skipped by design (the skip-link test runs only at desktop size and the mobile-menu test only at phone size)                    |
| `pnpm verify:generated --record`       | 6 of 6 generated projects verified, and a macOS entry recorded for each template in `packages/project-catalog/verification/`                    |
| `pnpm verify:generated` (final, again) | 6 of 6 verified after the last code change                                                                                                      |
| `pnpm screenshots web`                 | Recaptured the eight website screenshots in `docs/screenshots/`. Template screenshots were not recaptured, because the templates did not change |
| `pnpm changed-templates origin/main`   | Ran; printed "(no templates changed)", as expected with no new commits on the branch                                                            |

For each template, `pnpm verify:generated` generated two projects (default settings, and every setting changed with a name full of special characters and Unicode), extracted each ZIP with the safe extractor, compared every file byte for byte with the engine's output, checked every declared customization, the exclusions, the hidden files, `GETTING_STARTED.md` and `docs/PROJECT_REPORT_DRAFT.md`, then ran:

| Template                  | Install                                                       | Tests                                           | Build or start                                   |
| ------------------------- | ------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| Student Attendance System | `npm ci`                                                      | `npm test`: 34 passed, in both projects         | `npm run build` passed                           |
| Personal Expense Tracker  | `npm ci`                                                      | `npm test`: 39 passed, in both projects         | `npm run build` passed                           |
| Student Result Analyzer   | `python -m venv .venv`, `pip install -r requirements-dev.txt` | `python -m pytest`: 49 passed, in both projects | `streamlit run app.py` answered its health check |

## What the new tests cover

- Template statuses: verified only with a matching, passing entry; out-of-date entries, failed entries, drafts and missing fingerprints.
- Fingerprints: stable across file order; changed by a file, a setup command or the version; unchanged by rewording prose. A website test checks that the site computes exactly the fingerprint the validator computes from the files it serves.
- Verification records: writing per platform, rejecting malformed, misnamed and orphaned records.
- The validator: credential files in a template folder, orphaned and out-of-date records (warnings do not fail validation).
- The engine: generated documents, and refusing documents that would replace a template file or escape the project folder; `isSecretPath`.
- The report draft and `GETTING_STARTED.md`: the student's values are escaped, only manifest facts are used, and environment variables, limitations and document links are present.
- Related projects, setup facts, changed-template selection.
- The website: the review step's file preview shows the real generated files; the done step shows environment variables and limitations; the ZIP contains the report draft; project pages show verification and related projects.
- End to end: axe with every rule in both themes on the open project guide and on the generator's review and done steps, and the report draft in a downloaded ZIP.

## Not run or not verified

- **GitHub Actions:** `ci.yml` (including the new changed-templates job) and `deploy-pages.yml` were not run. Their steps are the commands above; the YAML parses.
- **Linux and Windows:** nothing ran on them in this release, so the templates have macOS records only, and the website says so. The CI workflow verifies all three operating systems on every push to `main`.
- **Firefox and Safari:** browser tests used Chromium only.
- **Real deployments:** nothing was deployed. The Netlify build command change (`pnpm validate && pnpm build`) and the sub-path build for GitHub Pages were not tried on those services in this release.
- **Assistive technology:** no testing with real screen readers. Accessibility was checked with axe-core, role-based test queries and keyboard tests.
- **Dependency audits:** `pnpm audit`, `npm audit` and `pip-audit` were not run for this release. No dependency was added or upgraded.

## Known issues and limitations

- There are three templates. The AI and machine learning category is empty, and the website says so.
- The generator only changes what each manifest declares: names, branding, theme colours, sample data and a few settings.
- Verification records are written on a maintainer's computer. CI repeats the verification but does not write records.
- A record covers a template's files and manifest settings, not the template engine. Engine changes are covered by CI, which verifies every template when the engine or catalog code changes.
- The React templates keep their data in `localStorage` and have no accounts. The Python template runs on `localhost` with no login. They are learning projects, not systems for real records.
- Report drafts on the Learn page are saved in one browser's `localStorage` only.

## How to run it

```bash
npm install --global pnpm@10.34.7   # or: corepack enable
pnpm install
pnpm dev                            # http://localhost:5173/
pnpm check                          # validate, format:check, lint, typecheck, test, build
pnpm playwright:install             # once, then:
pnpm test:e2e
pnpm verify:generated               # needs Python 3.11+ for the Python template
pnpm verify:generated <id> --record # verify one template and save its record
```

See [README.md](README.md) for every command and [CONTRIBUTING.md](CONTRIBUTING.md) for the pull request checklist.
