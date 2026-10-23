# Build status

This file records what was checked for CampusKit 3.1.0, what the checks showed, and what was **not** verified. Every result below was produced on 23 October 2026 (India Standard Time) in this working copy, unless it says otherwise. Earlier reports are in the git history.

3.1.0 is a redesign of the website. The templates, the template engine, the catalog code and the format of saved data did not change.

## Summary

| Area                                                                                | Status                                                                                   |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Design tokens, type scale, motion and shared components                             | Implemented; documented in `docs/design-system.md`                                       |
| Header (Compare, search), breadcrumbs, page headers, footer                         | Implemented and tested                                                                   |
| Home page, gallery, project pages, generator stepper                                | Redesigned and tested                                                                    |
| Learning studio, learning center, viva practice, submission workspace               | Redesigned and tested; saved progress and drafts load as before                          |
| Compare on phones, documentation, 404 and error pages                               | Redesigned and tested                                                                    |
| Accessibility (axe, WCAG 2.2 AA and best practices, both themes, desktop and phone) | No violations on any checked page                                                        |
| Templates (unchanged, version 1.0.0)                                                | All three **Verified**; the records from 23 October 2026 still match the published files |
| GitHub Actions on Windows and the Pages deployment                                  | Still failing on GitHub for the 3.0 commit; see “GitHub Actions for 3.0”                 |

## Environment

- macOS 26.2 on Apple silicon (arm64)
- Node.js 24.12.0, pnpm 10.34.7 (run through `npx pnpm@10.34.7`)
- Playwright 1.64.1 with its Chromium headless shell

## Commands run

| Command                          | Result                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Passed; the lockfile is in sync                                                                                                              |
| `pnpm check`                     | Passed: validate, format check, lint, type check, unit tests and build                                                                       |
| `pnpm validate`                  | Catalog OK: 3 projects, each with a learning guide and each **Verified**. Repository check OK                                                |
| `pnpm test`                      | 319 tests passed in 40 files (312 in 38 files before this release; no test was removed)                                                      |
| `pnpm test:e2e`                  | 149 passed and 3 skipped by design (146 passed and 2 skipped before this release)                                                            |
| `pnpm screenshots web`           | Recaptured all 11 website screenshots after the redesign; the home page tour uses five of them                                               |
| Sideways-scrolling sweep         | A one-off Playwright script loaded 21 routes at 320, 360, 390, 768, 1024, 1440 and 1920 px: no page scrolled sideways (after one fix, below) |

The skipped end-to-end tests apply to one screen size only: the skip-link test runs on desktop, and the menu-button and folding document menu tests run on phones.

`pnpm verify:generated` was **not** re-run: no template, engine or catalog code changed, and the website still shows every template as Verified because the recorded fingerprints match the published files.

### Found and fixed during the checks

- At 320 px, the code walkthrough's “next step” button overflowed the screen because button labels don't wrap. Previous and next are now links whose titles wrap.
- axe reported two unnamed search landmarks on the home page (the header search and the hero search). Both now have names.
- Lint rejected a key handler on the tour's tab list (it isn't focusable); the handler moved to the tabs, with the same behaviour.
- Under the parallel full test run, one submission workspace test occasionally waited longer than Testing Library's 1-second default for the lazily loaded page; the wait is now 5 seconds.

## What the new tests cover

- **Header:** the navigation lists every section, including Compare; the header search sends the text to the gallery (unit test, and end to end on desktop and phone).
- **Home page:** the verification count matches the records, the tour has five tabs with real screenshots, the learning tools and the closing call to action link to the right pages.
- **Product tour:** clicking a tab shows its panel and screenshot; arrow keys move and wrap, Home and End jump, and only the selected tab is in the tab order.
- **Markdown:** the copy button copies the code without its trailing newline and code stays focusable; raw HTML in a document is not rendered.
- **Generator:** the step with errors is announced as needing attention, the completed step is a button, the current step is marked, and the warning clears once the field is fixed.
- **Comparison:** the phone layout lists each attribute with every chosen project's value.
- **Learning center:** progress is shown as labelled amounts, and each card links to its report workspace.
- **Documentation on phones:** the document list starts folded, opens, navigates and folds again.

## GitHub Actions for 3.0 (read from the public API on 23 October 2026)

- CI for the 3.0 commit (`6625ed0`): validation, lint, type check, unit tests and build, end-to-end tests, and generated-project verification on **Linux and macOS passed**. Generated-project verification on **Windows failed** again. Its only public annotation is “Process completed with exit code 1”; the log needs a signed-in GitHub account, so the cause is still not known.
- **Deploy to GitHub Pages failed** at `actions/configure-pages`, as before. This is a repository setting (Settings → Pages → Source: GitHub Actions), not a code problem.

## Not run or not verified

- **Windows and Linux** were not run locally, and the Windows failure on GitHub is not diagnosed.
- **Firefox and Safari:** browser tests used Chromium only.
- **Visual regression:** there are no automated screenshot comparisons. The redesigned pages were reviewed in screenshots, mostly at desktop size, with the main pages also checked on a phone and in the dark theme.
- **Assistive technology:** no testing with real screen readers. Accessibility was checked with axe-core, role-based queries and keyboard tests.
- **Real deployments:** nothing was deployed.
- **Dependency audits** were not run. No dependency was added.

## Known issues and limitations

- The README and home page screenshots are only as current as the last `pnpm build` followed by `pnpm screenshots web`; a later visual change needs a recapture.
- The submission workspace is still a long page on phones: thirteen draft sections, each with its own text area.
- There are three templates. The AI and machine learning category is empty, and the site says so.
- The key-idea check in viva practice only looks for words; students judge their own answers.
- Learning progress and report drafts live in one browser's localStorage, with no sync. The workspace downloads Markdown and copies a plain slide list; there is no PDF or PowerPoint export.

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
