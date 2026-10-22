# Build status

This file records what was built, which checks were run, what they showed, and what was **not** verified.

Unless a line says otherwise, every result below was produced on 22 October 2026 (India Standard Time) by extracting the release archive, `campuskit.zip`, into an empty folder and running the commands there. The archive was then rebuilt with two kinds of change, and nothing else: this file, and three README screenshots of the home page (`docs/screenshots/home.png`, `home-dark.png` and `mobile-home.png`) recaptured with `pnpm screenshots` because the search box's placeholder text had changed. The rebuilt archive was extracted again and passed `pnpm check`.

## Summary

| Area                                                                                    | Status                                                         |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Website: gallery, project pages, generator, learning center, documentation              | Implemented and tested                                         |
| Template engine: options, declared edits, escaping, path safety, exclusions, ZIP files  | Implemented and tested                                         |
| Project catalog: Zod schema, validator, JSON Schema for editors                         | Implemented and tested                                         |
| Templates: Student Attendance System, Personal Expense Tracker, Student Result Analyzer | Implemented, tested, and verified as generated projects        |
| Documentation, contribution files, issue and pull request templates, CI and deployment  | Written; the GitHub Actions workflows were not run (see below) |

## Environment

- Linux x86-64 container
- Node.js 22.22.0 for every command below, and Node.js 24.22.0 for a second run of the unit tests, the build and the React template verification
- pnpm 10.34.7 and npm 10.9.4
- Python 3.13.16, and Python 3.11.17 for a second verification of the Python template
- Chromium 153.0.8010.0 from the `@sparticuz/chromium` npm package, passed to Playwright with `CAMPUSKIT_CHROMIUM`. Playwright's own browser download (`pnpm playwright:install`) could not be reached from this environment, so it was not used.

## Commands run in the extracted copy

| Command                                     | Result                                                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`            | Passed; the lockfile is in sync                                                                                             |
| `pnpm check`                                | Passed. It runs the seven commands below in order                                                                           |
| `pnpm validate:catalog`                     | 3 projects valid: 44, 45 and 30 template files, with 13, 12 and 8 declared edits                                            |
| `pnpm check:repo`                           | No secrets, generated files, broken links or documented commands without a script                                           |
| `pnpm format:check`                         | Every file matches the Prettier style                                                                                       |
| `pnpm lint`                                 | No problems with `--max-warnings=0`                                                                                         |
| `pnpm typecheck`                            | No errors in the template engine, project catalog, website, scripts and tests                                               |
| `pnpm test`                                 | 202 tests passed in 23 files: template engine 117, project catalog 19, website 62, repository 4                             |
| `pnpm build`                                | Passed                                                                                                                      |
| `pnpm test:e2e` (with `CAMPUSKIT_CHROMIUM`) | 76 passed and 2 skipped by design: the skip-link test runs only at desktop size and the mobile-menu test only at phone size |
| `pnpm verify:generated`                     | 6 of 6 generated projects verified: each template with its default values and with every option changed                     |

For each generated project, `pnpm verify:generated` packaged the ZIP, extracted it with the safe extractor, compared every file byte for byte with the engine's output, checked every declared customization and the exclusion rules, then ran inside the extracted copy:

| Template                  | Install                                                       | Tests                                           | Build or start                                   |
| ------------------------- | ------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| Student Attendance System | `npm ci`                                                      | `npm test`: 34 passed, in both projects         | `npm run build` passed                           |
| Personal Expense Tracker  | `npm ci`                                                      | `npm test`: 39 passed, in both projects         | `npm run build` passed                           |
| Student Result Analyzer   | `python -m venv .venv`, `pip install -r requirements-dev.txt` | `python -m pytest`: 49 passed, in both projects | `streamlit run app.py` answered its health check |

## Additional checks

- **Node.js 24.22.0:** `pnpm test` (202 passed), `pnpm build`, and `pnpm verify:generated attendance-system expense-tracker` (4 of 4 verified) passed.
- **Python 3.11.17:** `pnpm verify:generated student-result-analyzer` with `CAMPUSKIT_PYTHON=python3.11` verified 2 of 2 projects (49 tests passed in each).
- **Python dependency range:** the Result Analyzer's 49 tests passed with the newest versions that `requirements.txt` allowed on the day (Streamlit 1.66.1, pandas 3.0.6, Altair 6.3.0, pytest 9.1.1) and with the oldest allowed versions (Streamlit 1.50.0, pandas 2.2.3, Altair 5.5.0, pytest 8.4.2).
- **Deployment to a sub-path:** a build with `CAMPUSKIT_BASE=/campuskit/` was served only under `/campuskit/` (any other path returned 404, as on GitHub Pages) with a single-page app fallback. Six pages loaded directly, client-side navigation kept the base path, and a ZIP was generated and downloaded, with no console errors, failed requests or Content Security Policy violations.
- **Accessibility:** the end-to-end tests run axe-core with every rule, including colour contrast, on nine page types in the light and dark themes, at desktop and phone sizes. They also check the skip link with the keyboard and that Escape closes the mobile menu and returns focus to its button. The unit tests run axe-core in jsdom on twelve routes. No violations were reported.
- **Layout:** the end-to-end tests load nine pages at 1280 and 360 pixels wide, and at 320 pixels on the phone viewport, and found no sideways scrolling.
- **Security:** every end-to-end test fails on a Content Security Policy violation, a console error or a failed request, and none occurred. `pnpm audit` (workspace) and `npm audit` (both React templates) reported no known vulnerabilities on 22 October 2026.
- **Screenshots** (in the working copy the archive is built from): every template and website screenshot was captured from the real running apps with `pnpm screenshots`, with the browser clock fixed to 21 October 2026. Recapturing all 18 gave byte-identical files for 13 of them. The three home page images had changed because the search box's placeholder text had changed since they were taken, so they were replaced. The other two (the project page and the Result Analyzer overview) differed in at most ten pixels of anti-aliasing, and the committed copies were kept.
- **Workflows:** the workflow and issue form files are valid YAML. Each action is pinned to its latest major release, checked with `git ls-remote` on 22 October 2026, and every input the workflows pass exists in that release's `action.yml`.

## Not run or not verified

- **GitHub Actions:** `ci.yml` and `deploy-pages.yml` were not run, because no GitHub runner was available. Their steps are the commands listed above.
- **Windows and macOS:** everything ran on Linux. The CI workflow runs `pnpm verify:generated` on Windows and macOS, and the guides give the Windows commands, but neither was run here.
- **Firefox and Safari:** automated browser tests used Chromium only.
- **Real deployments:** nothing was deployed to GitHub Pages or Netlify, and `netlify.toml` is untested.
- **Assistive technology:** no testing with real screen readers. Accessibility was checked with axe-core, role-based test queries and keyboard tests.
- **Playwright's bundled Chromium** was not used (see the environment section).
- **Python packages** were not audited for known vulnerabilities (`pip-audit` was not run).

## Verified and assumed

**Verified** by running it here: everything in the two command tables and the additional checks above.

**Assumed**, because it could not be run here: that the workflows behave on GitHub's runners as they do locally; that the generated projects install and run on Windows and macOS with the documented commands; that current Firefox and Safari render the site correctly; that GitHub Pages and Netlify apply the documented single-page app fallbacks.

## Known issues and limitations

- There are three templates. The AI and machine learning category is empty, and the website says so.
- The generator only changes what each manifest declares: names, branding, theme colours, sample data and a few settings.
- The React templates keep their data in `localStorage` and have no accounts. The Python template runs on `localhost` with no login. They are learning projects, not systems for real records.
- Report drafts are saved in one browser's `localStorage` only.
- The expense tracker's production bundle is about 650 kB (190 kB gzipped) because of Recharts. Its Vite size warning threshold is raised, with a comment explaining why.
- `pnpm screenshots` needs Chromium, and `pnpm verify:generated` needs Python 3.11 or newer for the Python template. Neither is part of `pnpm check`.

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
