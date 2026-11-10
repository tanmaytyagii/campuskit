# Build status

This file records the checks on CampusKit **6.0.0-rc.1**, a release candidate, on 31 October 2026 (India Standard Time). Every result was produced in this working copy on the final code unless it says otherwise. Nothing was committed, pushed or deployed. The detailed test results, the problems QA found and the release-readiness matrix are in `QA_REPORT.md`; the security review is in `SECURITY_REVIEW.md`. The 5.0.0-rc.1 record is kept at the end of this file.

## Summary

| Area                                                  | Status                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validate, format, lint, type check, tests, build      | Pass on macOS: All passed: catalog validation, repository and secret scan, format, lint, typecheck, 694 tests in 76 files, build. A clean copy of the release package: installed with `pnpm install --frozen-lockfile` and passed `pnpm check` (694 tests, build) on macOS and in a Linux container (`node:24-slim`, Node.js 24.21.0) |
| End-to-end tests                                      | Chromium desktop and phone: 309 passed, 7 skipped by design. WebKit desktop: 155 passed, 3 skipped. Firefox desktop: 155 passed, 3 skipped                                                                                                                                                                                            |
| Accessibility                                         | axe (WCAG 2.2 AA and best practices) in both themes on every new page and dialog, in Chromium, WebKit and Firefox; Hindi pages too                                                                                                                                                                                                    |
| Lighthouse (median of 3, production build, local)     | Mobile: home 100, gallery 85, dashboard 90, assistant 87. Desktop: 99–100. Accessibility, best practices and SEO 100 on all four pages                                                                                                                                                                                                |
| Generated projects                                    | 8 of 8 verified on macOS: attendance and expense tracker (tests and build), student management (69 pytest tests, Flask health check, home page, database), result analyzer (51 pytest tests, Streamlit health check), each with default and customised options                                                                        |
| Smoke test                                            | 10 of 10 checks against a production build                                                                                                                                                                                                                                                                                            |
| Security                                              | `pnpm audit --prod`: no known vulnerabilities. Secret scan clean. See `SECURITY_REVIEW.md`                                                                                                                                                                                                                                            |
| AI assistant against the live API                     | **Not run**: no API key in this environment. Verified with the real SDK against a mocked API in Chromium, WebKit and Firefox                                                                                                                                                                                                          |
| Hindi translation review by a native speaker          | **Not done**                                                                                                                                                                                                                                                                                                                          |
| GitHub CI (including the new Firefox and WebKit jobs) | **Not run**: nothing was pushed                                                                                                                                                                                                                                                                                                       |
| Windows, real phones, Safari on iOS, screen readers   | **Not run**                                                                                                                                                                                                                                                                                                                           |

## Environment

- macOS 26.2 on Apple silicon (arm64), Node.js 24.12.0, pnpm 10.34.7 (the pinned version, through a Corepack shim in a temporary folder)
- Playwright 1.64.1: Chromium 156 (build 1248), WebKit (build 2370), Firefox 157 (build 1555, downloaded for this run)
- Lighthouse 13.6.0 through `pnpm dlx`, on Playwright's Chrome for Testing
- Python 3.11.7 from python.org for `pnpm verify:generated`
- Docker 29.3.1 with `node:24-slim` for the clean Linux copy

## Commands run

| Command or check                                                                        | Result                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                                            | All passed: catalog validation, repository and secret scan, format, lint, typecheck, 694 tests in 76 files, build                                                                                                                                              |
| `playwright test --project=desktop --project=mobile`                                    | 309 passed, 7 skipped by design                                                                                                                                                                                                                                |
| `CAMPUSKIT_E2E_BROWSERS=firefox,webkit playwright test --project=webkit`                | 155 passed, 3 skipped by design                                                                                                                                                                                                                                |
| `CAMPUSKIT_E2E_BROWSERS=firefox,webkit playwright test --project=firefox`               | 155 passed, 3 skipped by design                                                                                                                                                                                                                                |
| Lighthouse, 4 pages × mobile and desktop × 3 runs, before and after the two fixes below | Before: dashboard 80 and assistant 78 on mobile (layout shift 0.16–0.20, all from the footer), SEO 91–92 (no `robots.txt`). After: see the summary                                                                                                             |
| `pnpm verify:generated`                                                                 | 8 of 8 verified on macOS: attendance and expense tracker (tests and build), student management (69 pytest tests, Flask health check, home page, database), result analyzer (51 pytest tests, Streamlit health check), each with default and customised options |
| `pnpm smoke http://127.0.0.1:4174/` against `vite preview`                              | 10 of 10 checks passed                                                                                                                                                                                                                                         |
| `pnpm audit --prod`; `pnpm audit`                                                       | No known vulnerabilities; with development tools, 2 moderate in `minimatch` under ESLint                                                                                                                                                                       |
| `git diff --check`; invisible and bidirectional character scan                          | Clean                                                                                                                                                                                                                                                          |
| Release ZIP, extracted into a clean folder                                              | installed with `pnpm install --frozen-lockfile` and passed `pnpm check` (694 tests, build) on macOS and in a Linux container (`node:24-slim`, Node.js 24.21.0)                                                                                                 |

## Performance

- First visit (entry plus preloaded scripts): 712.4 kB of JavaScript, 217.0 kB gzipped. 5.0.0-rc.1: 661.3 kB, 200.8 kB. The +16.2 kB gzipped comes from features that are on every page: the command palette, shortcuts, toasts, offline notice and the two language catalogs.
- The Anthropic SDK (352 kB, 79 kB gzipped) is a separate chunk, loaded only when an AI request is sent. It's left out of the offline precache.
- Fixed during QA: the loading placeholder for lazily loaded pages is now at least a screen tall, so the footer no longer jumps (layout shift 0.20 → 0). Also added a `robots.txt`.
- Remaining: on Lighthouse's simulated slow 4G, a lazily loaded page's own chunk starts only after the entry script, so mobile LCP is 3.7–4.3 s on the gallery, dashboard and assistant. Preloading the likely next chunks is the next step.

## Before publishing

1. Make one AI request with a real key (any task) and check the answer, the Stop button and an invalid-key error.
2. Have a native speaker review `apps/web/src/i18n/hi.ts`.
3. With the owner's permission, commit and push, then confirm every CI job passes, including `e2e-browsers` (Firefox, WebKit) and the generated-project matrix on Windows.
4. If all pass, change the version to 6.0.0, and move the CHANGELOG entry's date.

## 5.0.0-rc.1 record (kept for reference)

This file records the checks on CampusKit **5.0.0-rc.1**, a release candidate, on 30–31 October 2026 (India Standard Time). Every result below was produced in this working copy on the final code unless it says otherwise. Nothing was committed, pushed or deployed. The report for 4.0.0 is in the Git history (commit `245fb2a`).

### Summary

| Area                                                              | Status                                                                                                                                                                           |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validate, format, lint, type check, tests, build                  | Pass on macOS: 595 tests in 58 files, 4 templates **Verified**. A clean copy of the package passed too, on macOS and in a Linux container                                        |
| End-to-end tests                                                  | Chromium and WebKit, desktop and phone sizes: 263 passed and 7 skipped by design in each engine                                                                                  |
| Generated projects                                                | 8 of 8 verified on macOS (all four templates, default and customized)                                                                                                            |
| New template                                                      | Student Management System 1.0.0 (Flask, SQLite): 69 pytest tests; **Verified on macOS** and recorded. Linux and Windows: not run here; CI runs them after a push                 |
| Demo simulation                                                   | The Flask demo's validation, sample data, 18 queries, statistics and rounding match the template's Python code (78 tests against recorded results)                               |
| Accessibility                                                     | axe (WCAG 2.2 AA and best practices) in both themes in Chromium and WebKit, including every new page and dialog; no sideways scrolling at 360 and 320 px on the new demo screens |
| Performance                                                       | First visit: 661.3 kB of JavaScript, 200.8 kB gzipped (4.0.0: 733.0 kB, 221.5 kB gzipped)                                                                                        |
| Security                                                          | No known vulnerabilities (`pnpm audit --prod`, `pip-audit` on the Flask template). Template hardened against DNS rebinding and debugger exposure                                 |
| Windows, Firefox, Safari on a device, screen readers, real phones | **Not run**                                                                                                                                                                      |

### Environment

- macOS 26.2 on Apple silicon (arm64), Node.js 24.12.0, pnpm 10.34.7 (the pinned version, through Corepack shims in a temporary folder)
- Playwright with its Chromium headless shell and WebKit 27.2 (playwright webkit v2370, downloaded for this run)
- Python 3.11.7 from python.org for `pnpm verify:generated`; a temporary virtual environment with Flask 3.1.3, Werkzeug 3.1.9 and pytest for the parity fixture, plus python-docx 1.2.0 and pip-audit
- Docker with `node:24-slim` (Debian 12, Node.js 24.21.0) for the clean Linux copy

### Commands run

| Command or check                                                                 | Result                                                                                                                                                                                              | Where                   |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `pnpm validate`, `format:check`, `lint`, `typecheck`, `vitest run`, `pnpm build` | All passed: 4 templates **Verified**, 595 tests in 58 files. Run step by step, with 4 test workers, because the disk was nearly full during the session                                             | macOS                   |
| The same in a clean copy of the package                                          | All passed: 595 tests, build                                                                                                                                                                        | macOS; Linux container  |
| `playwright test` (Chromium, desktop and phone)                                  | 263 passed, 7 skipped by design                                                                                                                                                                     | macOS                   |
| `playwright test` (WebKit, desktop Safari and iPhone 13 profiles)                | 263 passed, 7 skipped by design                                                                                                                                                                     | macOS, Playwright build |
| `pnpm verify:generated`                                                          | 8 of 8: attendance (39 tests, build), expense tracker (48 tests, build), student management (69 tests, Flask health check, home page, database), result analyzer (51 tests, Streamlit health check) | macOS                   |
| `pnpm verify:generated student-management-system --record`                       | Passing macOS record for 1.0.0, after the final template change                                                                                                                                     | macOS                   |
| `pnpm smoke http://127.0.0.1:4174/` against a production build                   | 10 of 10 checks passed, including every project page and demo and a downloaded ZIP                                                                                                                  | macOS, `vite preview`   |
| `pnpm demo:fixtures:students` and `model.test.ts`                                | Fixture recorded from the template's Python code; 78 tests passed. A deliberate change to the simulation makes them fail                                                                            | macOS                   |
| A real exported report opened with python-docx 1.2.0                             | Title, heading styles, lists, quotes, 3 tables and checklist boxes read back                                                                                                                        | macOS                   |
| `pnpm audit --prod`; `pip-audit` on the Flask template's requirements            | No known vulnerabilities                                                                                                                                                                            | macOS                   |
| `git diff --check`; scan for control and invisible characters                    | Clean: 149 changed or new files, 0 hits                                                                                                                                                             | macOS                   |

### What changed, and how it was checked

- **Student Management System template (Flask, SQLite):** CRUD for students and courses, enrollments, attendance with an upsert, search, filters, sorting and pages, statistics. CSRF tokens, parameterized SQL, a script-free CSP, escaped output, a secret key created readable by its owner only, `TRUSTED_HOSTS` against DNS rebinding, and no debugger when other computers could connect. Bugs found while building it are fixed with regression tests (see the changelog).
- **Demo Studio simulation:** a clearly labelled `simulation` fidelity; the page says the browser runs no Python and no SQL. Parity tests against the real code found and fixed two simulation bugs (rounding of ties, years 1 to 99).
- **Student workspace:** My projects, backup and restore (strict validation, preview, replace per project), spaced viva review, Word and print/PDF report export.
- **Reliability:** the verifier's command diagnostics, a smoke job after each Pages deployment, and support for Flask apps in the generated-project verification.
- **Performance:** the ZIP code is off the first page load (see “Performance” in the changelog).

### Not done, and why

- Windows and Linux verification of the new template, Firefox, Safari on a real device, screen readers and real phones: not available on this computer, or not run. CI verifies every template on Linux, Windows and macOS after a push. [Accessibility testing](docs/accessibility-testing.md) has manual screen-reader scripts.
- More templates, “Extend your project” guides, more generator options, offline use (PWA) and a Hindi interface: left out of this release so that what shipped could be finished and tested.

### Before publishing

1. Review the working tree and push it.
2. Watch the CI run, especially “Generated projects (windows-latest)” and “(ubuntu-latest)” for the new template, then record those platforms (`pnpm verify:generated student-management-system --record` on each, or keep the macOS record).
3. Watch “Deploy to GitHub Pages”: its new smoke job checks the live site after deployment.
