# Changelog

## 6.0.0-rc.1 (31 October 2026, release candidate)

A release candidate for CampusKit 6.0. It adds:

- a project workspace for the student's own projects;
- a dashboard, a command palette and recently visited pages;
- onboarding and settings;
- mock vivas and a viva progress page;
- offline use as an installable app;
- an optional AI assistant that uses the student's own key and asks before every request;
- a README and viva-sheet generator;
- menus in Hindi.

Everything from 5.0 works as before. Backups from 5.0 still restore, and typed viva answers are still never saved.

Not in this release:

- new templates;
- translating the workspace, onboarding and content pages;
- a second AI provider;
- Tooltip and Card components.

The Hindi text hasn't been reviewed by a native speaker yet. See `CAMPUSKIT_6_ROADMAP.md` and `QA_REPORT.md`.

### Project workspace

- **Your own projects** on My projects:
  - title, description, category, status, tags, technology, an optional template link, favourite and pinned;
  - notes saved as you type;
  - milestones with due dates, links, and a timeline of what changed;
  - search, filters, sorting and an archive.
- **A page for each project** (`/my-projects/:id`): change the status quickly, track milestones and progress, edit, duplicate, archive and restore. A project can be deleted for good only from the archive, and only after a confirmation.
- **Never silently discarded:** saved entries that can't be read are kept aside, with a notice offering to download or delete them.
- **Backups, format version 2**, now include projects and the profile:
  - a version 1 file is upgraded as it's read;
  - restoring merges projects by id and first shows how many will be added, replaced, or replaced by an older copy;
  - projects that exist only in this browser are kept.
- **Documentation studio** (`/my-projects/:id/docs`): a README and a viva preparation sheet drafted from the project's own details.
  - Parts without details are marked “To write” and listed above the preview.
  - Content from a linked template is labelled as the template's.
  - Download as Word or Markdown, or print and save as PDF.

### Navigation and dashboard

- **Command palette** (Ctrl+K or ⌘K, or the header button):
  - goes to pages, your projects, every template's pages, documents and actions;
  - follows the ARIA combobox pattern and works by keyboard only;
  - `?` lists the keyboard shortcuts.
- **Recently visited pages**, in the palette and on the dashboard.
- **Dashboard** (`/dashboard`), with real figures only: projects, deadlines in the next 14 days and overdue ones, recent activity, quick actions, and viva practice due for review.

### Onboarding and settings

- **A welcome guide** (`/welcome`) with three skippable steps: level, interests, and suggested templates, each with the reason it was suggested. It can also start a project labelled as a sample.
- **Settings** (`/settings`):
  - profile, theme and language;
  - store every template for offline use;
  - reopen the welcome guide;
  - delete everything CampusKit saved in this browser, after a confirmation.

### Viva practice

- **Mock viva:** 8 questions taken from each topic in turn, with an optional 2-minute timer per answer that only informs (it never submits).
- **Viva progress** (`/viva/progress`):
  - ratings over the last 14 days;
  - each template's topics: practised, confident, needs work;
  - weak topics and questions below confident;
  - a revision report as Word or Markdown.

  A topic never counts as known because a question was opened: only the student's own ratings count.

### Offline and installable

- A web app manifest and icons; CampusKit can be installed.
- A service worker:
  - stores the site and keeps saved work, the dashboard and viva practice working offline after one visit;
  - updates on request ("Reload to update");
  - handles only same-origin GET requests.
- The AI assistant's SDK isn't stored for offline use, because the assistant needs a connection.

### Optional AI assistant

- `/assistant`: explain a template's architecture, a piece of code or an error message; write practice viva questions; plan what to learn; review documentation.
- The student's own Anthropic API key:
  - kept in memory, or until the tab closes if they choose;
  - never in localStorage, backups or the code.
- Before every request, a review shows the provider, address, model and the exact text to be sent. Nothing is sent until the student agrees.
- A request limit per tab, changeable by the student. Offline or without a key nothing can be sent, and links point to the human-written guides instead.
- Answers are labelled "Written by AI" and are never saved.
- Uses `claude-opus-5-5` through the official `@anthropic-ai/sdk`, with the API's server-side refusal fallback turned on.
- The Content Security Policy allows connections to `https://api.anthropic.com` and nowhere else outside the site.

### Language

- Hindi for the menus, footer, command palette, shortcut list, dashboard and the language setting, chosen in Settings.
- Pages that are still in English are marked `lang="en"`, so screen readers pronounce them correctly.

### Fixes found while testing

- Cached scripts missed offline when a server answered `Vary: Origin`.
- Task lists in Markdown rendered unlabelled checkboxes.
- AI answers' headings skipped a level.
- `workspaceStore.reload()` read storage too early.
- The header crowded at 1024 px.

### Tooling

- Firefox and WebKit end-to-end jobs in CI (`CAMPUSKIT_E2E_BROWSERS`).
- A Content Security Policy unit test.
- New dependency: `@anthropic-ai/sdk` 1.3.0 (exact), loaded only when an AI request is sent.

## 5.0.0-rc.1 (31 October 2026, release candidate)

A release candidate for CampusKit 5.0: a fourth template with a server and a database, a Demo Studio simulation of it, a student workspace with backups, spaced viva review and Word or PDF report export, a smaller first page load, and checks that run after every deployment. Saved progress from 2.0 to 4.0 loads as before, and typed viva answers are still never saved.

Not in this release: more templates (library, quiz, notebook), “Extend your project” guides, more generator options, offline use (PWA) and a Hindi interface.

### New template: Student Management System (Flask and SQLite)

- Students, courses, enrollments and attendance in one SQLite file: add, view, edit and delete students and courses; search, filter, sort and page the student list; mark attendance for a course and day; dashboard and statistics pages.
- Written for explaining in a viva:
  - parameterized SQL everywhere, with sorting from a fixed list of columns;
  - foreign keys with `ON DELETE CASCADE`, `UNIQUE` and `CHECK` constraints, and an upsert for attendance;
  - CSRF tokens on every form, a Content Security Policy with no scripts at all, and escaped output;
  - a secret key kept out of the code (`SECRET_KEY`, or `instance/secret_key`, created readable by its owner only);
  - requests must use `127.0.0.1` or `localhost` in the address, which blocks DNS rebinding, and `FLASK_DEBUG=1` is refused when other computers could reach the app;
  - an app factory, blueprints and commands to back up, reset and refill the database.
- 69 pytest tests, a learning guide (architecture, code walkthrough, checklist, 25 viva questions, troubleshooting), screenshots and fictional sample data.
- Verified on macOS (both generated variants). Linux and Windows run in CI.
- Bugs found while building it, fixed before release, each with a regression test:
  - the first start re-seeded any empty database, so `reset-db --empty` didn't last;
  - `str.isdigit()` accepted “²” (a crash) and Arabic-Indic digits, which were read as numbers.

### Demo Studio

- The new template has an interactive demo, labelled as an **educational simulation**: the browser runs no Python and no SQL. Its screens show the dashboard, the student list, a student's record with their courses, courses, the attendance sheet and the database tables. Every change shows the SQL statement the real app would run, with its parameters, including statements the database refuses.
- The simulation's validation, sample data, searching, sorting, paging, statistics and rounding are tested against results recorded from the template's Python code (`pnpm demo:fixtures:students`).
- Demos now declare one of three fidelities: `template-logic`, `browser-port` or the new `simulation`. The notice and the Demos page word each one differently.

### Student workspace

- **My projects** (`/my-projects`): every project started in this browser, with checklist and viva progress, the guided demo, report, demonstration and readiness status, and a suggested next step. A project's saved progress can be deleted after a confirmation.
- **Backup and restore:** a JSON file with each project's saved progress. A file is checked whole before anything changes; the page shows what it holds next to what the browser has now; restoring replaces only the projects in the file. Files from newer versions and malformed files are refused with the reason. Typed viva answers are still never saved, so they are never in a backup.
- **Spaced review** in viva practice: questions come back after a delay that depends on the student's own rating, shown as a rule on the page. Older saved ratings keep working.
- **Report export as Word (.docx)**, made in the browser, and **Print or save as PDF**, which prints only the report, in black on white.
- A saved report draft whose details aren't text is now ignored instead of breaking the report builder.

### Performance

- The first visit loads less JavaScript than in 4.0.0, despite the new template, demo and workspace: 661.3 kB in 18 files (200.8 kB gzipped), down from 733.0 kB in 10 files (221.5 kB gzipped). The entry script is 374.1 kB (was 484.5 kB). Measured on production builds of both versions, counting the entry script and every script it preloads.
- The ZIP code (JSZip) now loads only when a project or a Word file is made: the template engine's packaging moved to its own module (`packaging.ts`, re-exported as before), the bundle loader imports the schema from a new `@campuskit/template-engine/spec` entry point, and the project page loads the ZIP builder on click.

### Reliability

- The generated-project verifier names the command, the exit code or signal and the end of the output when a step fails, and stops a command and its child processes after a time limit. Apps with a `run.py` (Flask) are started and checked: health check, customized home page title and, for database apps, the SQLite file.
- After each GitHub Pages deployment, a smoke job checks the live site in Chromium: the new build is being served, its assets load, every project page and demo opens, the generator works and a downloaded ZIP opens (`pnpm smoke <url>`).

### Accessibility

- The readiness check announces the new score when an item is ticked.
- [Accessibility testing](docs/accessibility-testing.md) explains what the automated checks cover and gives manual test scripts for VoiceOver and NVDA.

## 4.0.0 (25 October 2026)

CampusKit now covers the last stretch before a submission: students can try every project in an interactive demo, rehearse demonstrating it, present it with slides built from the project, and check what is left to do. The tagline is now “Explore it. Build it. Understand it. Demonstrate it.”

All three templates have bug fixes and are verified again: Student Attendance System 1.0.1, Personal Expense Tracker 1.0.2 and Student Result Analyzer 1.0.2. See “Found and fixed in the release audit” and “Found and fixed in the hardening pass”. Saved data from 2.0, 3.0 and 3.1 loads as before, typed viva answers are still never saved, and nothing a student types in a demo leaves the browser.

### Demo Studio

- Every project has an interactive demo at `/projects/<slug>/demo`, and the new **Demos** page (`/demos`, also in the header and footer) lists them.
- Every demo is labelled as a demonstration with fictional sample data, not a live system. Its data stays in the browser tab (`sessionStorage`), is checked with the template's own rules whenever it is read, and comes back with **Reset to the example**. The attendance and expense demos can also **Start with no data**.
- **Student Attendance System** (Students, Mark attendance, Summary, Data model) and **Personal Expense Tracker** (Overview, Transactions, Budget, Data model) run the templates' own modules unchanged: calculations, validation, dates, sample data, the reducer and the stored-data checks. The expense form's checks live in a React component, so the demo mirrors them, and a test compares the mirror with the template source.
- **Student Result Analyzer** (Dataset, Overview, Subjects, Grades, Missing data, Students) is a TypeScript version of the Python code in `validation.py`, `analysis.py`, `grading.py` and `explain.py`, including how numpy and pandas sum, round, rank and compute quantiles. The page says that the browser doesn't run Python. Tests compare every number, message and sentence with the real Python output for both sample files and nine edge cases. `pnpm demo:fixtures` regenerates that output, and the tests fail if the Python files change without it.
- Beside each screen, **About this screen** says what to try, what the full project does differently, which files and functions the screen comes from (linked to the source browser), and where to learn more: the code walkthrough, the architecture explorer, and the related viva questions.
- Charts (bar lists and column charts with gridlines, a threshold line, legends and hover readouts) are drawn without a chart library. Every chart has a written summary and a table view. The two chart colours were checked for colour-vision separation and contrast in both themes.

### Tour and guided demo

- **Take the tour** steps through the screens and shows what each one is built from.
- **Practise the demo** gives every step of a demonstration: what to say, what to do and what should happen, plus a slide for it in presentation mode. Steps that change the data are checked against the data at the start, so the demo can say “Done in the demo: Added Kavya Rao.”
- Finishing with every checked action done saves the date in the browser (`campuskit:rehearsal:v1:<project>`) for the readiness check. Skipping steps saves nothing.

### Presentation mode

- `/projects/<slug>/present` shows full-screen slides in the order examiners expect: introduction, problem, learning objectives, key features, architecture, how it works, technology, demo plan, one slide per demonstration step with the live demo, limitations and conclusion.
- Slides use only the project's manifest, learning guide and demo, and each one says which. Speaking notes are labelled as CampusKit's suggestions, and **N** hides them on a projector.
- Arrow keys, Page Up/Down and Space move between slides, Home and End jump to the ends, and Escape leaves. A menu jumps to any slide. Keys typed in a form, a dialog or the demo are left alone, and the Previous and Next buttons stay on screen.
- There is no PowerPoint or PDF export; the student guide says so.

### Readiness check

- `/projects/<slug>/ready` lists eleven items in three stages: get it running, understand it, and present and submit it. Each item has a status (Ready, In progress or To do, in words and with an icon), its evidence and the next action.
- Every item says where its status comes from:
  - **Checked by CampusKit:** verification records, published setup steps, the guided demo's checks, prompts left in the saved report draft.
  - **From your progress:** checklist ticks and viva ratings.
  - **You confirm:** installing, running and testing on the student's computer.
- The score counts Ready as 1, In progress as ½ and To do as 0, out of eleven. The page explains this and says it isn't a grade. Opening a page never counts as doing something.
- Confirmations are saved in `campuskit:readiness:v1:<project>`. **Clear my confirmations** removes only those, and the learning studio's reset also clears them and the guided demo record.

### Finding projects and the student workflow

- Project pages:
  - **Try the interactive demo** next to **Customize and download**.
  - A **Your path with this project** strip (Explore, Build, Understand, Demonstrate).
  - An **Interactive demo** section: what to try, what the full project adds, what the demo simplifies, and what the full project needs (backend, data, online services, API keys).
- Project cards link to the demo, and gallery search also matches features, learning objectives and the category, type, difficulty and audience names.
- The home page tour has a **Demonstrate** stop, and the generator's last step lists what to do next: learn, practise the demonstration, viva, report, present and check readiness.
- Learning links can open the architecture explorer on one component (`?component=`) and start viva practice with chosen questions (`?questions=`, shown as “Selected questions”, at most ten).

### Found and fixed while testing

- On phones, screen-reader-only notes in table cells made the attendance Summary up to 186 px wider than the screen. Scrolling table regions and the demo frame are now positioned containers.
- The analyzer's raw data and statistics tables sat inside sections with the same name (axe `landmark-unique`).
- The pass-mark label covered the first column of the analyzer chart; it is now in the chart's key.
- Phone layouts: three-figure grids left an empty cell, roll numbers broke inside “10-A”, and raw CSV rows wrapped names.
- Pressing arrow keys quickly on the demo tabs could jump to the wrong screen, because the selected screen lives in the address and updated a moment later. Arrows now move from the focused tab, and screen changes apply at once. Quick key presses in presentation mode no longer get lost.
- The generator now moves focus to “… is ready” in the same update that shows it.

### Found and fixed in the release audit

- **Node.js 22.18 or newer is now required (it said 22.12).** The build and test tools load the workspace packages' TypeScript directly, which Node.js 22.12 to 22.17 can't: `pnpm test` and `pnpm build` stopped with `ERR_UNKNOWN_FILE_EXTENSION`. `engines`, README and CONTRIBUTING say 22.18, and CI now runs the tests and build on Node.js 22.18. CONTRIBUTING explains what to do when `pnpm` is “command not found” after installing.
- **Personal Expense Tracker 1.0.1:** an amount just over the limit (100,000,000.01) was accepted, but the saved data then failed its own check, so the app opened empty on the next visit (the data was kept as a backup). The form now checks the whole amount. The demo uses the template's code, so it has the fix too.
- **Student Result Analyzer 1.0.1:** two subject columns with the same name written without ASCII letters (for example “गणित” twice) were let through, and the analysis then crashed with a Python error. They are now reported like any other duplicate column name.
- **Analyzer demo:** checked against the Python code (pandas 3, what students install) on 15,000 generated files. That found differences, now fixed, in:
  - Python's whitespace rules;
  - numbers like `1e400`;
  - files that are empty or start with a blank line;
  - line numbers after a quoted line break;
  - columns with the same name;
  - the sign of zero in medians, quartiles and integer columns;
  - how pandas 3 averages a class.
    The demo now matches on every one of those files. Each difference has a case in the parity fixture, and `pnpm demo:compare` runs the check.
- **Focus:**
  - The generator's “… is ready” heading, the learning studio's sections and presentation slides now take focus in the same update that shows them. Focus could briefly be on the page body before; a test now forces the timing that caused a one-off test failure.
  - Closing a dialog that the page removes, such as the demos' forms, now returns focus to the button that opened it, instead of leaving it on the page body.

### Found and fixed in the hardening pass

- **Saved data in Student Attendance System 1.0.1 and Personal Expense Tracker 1.0.2:**
  - One damaged record no longer hides all the others. The app leaves out only the students, marks or transactions that fail their checks, loads the rest, and says what was wrong. Before, it started fresh.
  - The saved value is copied to a backup key first. A later copy never replaces an earlier one: it gets the time added to its key.
  - If the browser refuses that copy (for example, because its storage is full), the app no longer crashes on start. It says so and saves nothing, so the saved data isn't lost.
  - Imported backup files are still checked in full, because an import replaces all the data.
- **Student Result Analyzer 1.0.2:** for a file where nobody has a score, the average showed as “nan%” in the Overview, its explanation and the downloadable report. It now says there is no average yet; so does the demo.
- **Analyzer demo and PyArrow:**
  - A student's pandas 3 always has PyArrow, because Streamlit installs it.
  - With PyArrow, pandas tidies the spaces inside names with a different regular-expression engine when a column is all ASCII, and that engine treats five control characters differently.
  - The release audit had compared the demo with pandas without PyArrow.
  - The demo now follows pandas' rule, and `pnpm demo:fixtures` and `pnpm demo:compare` refuse a Python without PyArrow. 29,700 newly generated files match.
- **Keyboard and screen readers:**
  - After deleting a row in a demo, focus moves to the next row's delete button (or to the empty state, or to the button that clears the filters) instead of the page body.
  - After removing a filter in the gallery, focus moves to the next filter or to the number of results.
  - Confirmation dialogs (delete, reset, discard) are alert dialogs, so screen readers read what will happen together with the question.
  - Each chart's **Table view** button names its chart, so a screen with two charts no longer has two identical buttons.
- **Wider text spacing (WCAG 1.4.12):**
  - With larger letter, word and line spacing at 320 px, five pages scrolled sideways. The causes were long words in headings, a file path, a fieldset, the page header and the generator's buttons.
  - Long words now break, fieldsets may shrink, and the generator's buttons wrap.
- The expense tracker's README documents its money limits: at most 100,000,000 per transaction, with totals exact up to about 90 trillion.

### Continuous integration and tooling

- `pnpm verify:generated` (hardening pass):
  - A failed Streamlit health check now includes the end of the app's output. Before, it said only that the app didn't answer.
  - Each try has a 5-second limit, and an app that a signal stopped ends the wait at once.
  - On Windows, the app's whole process tree is stopped with `taskkill /T`; this couldn't be tested without Windows.
- `pnpm demo:compare --shapes` adds files with shapes random ones rarely have: one student, everyone absent, hundreds of ties and more.
- End-to-end tests press Option-Tab in WebKit on macOS, as Safari users do to reach links and buttons. Four new tests follow whole student journeys through the site's own links.

- In GitHub Actions, `pnpm verify:generated` writes every failure as an error annotation and adds a table of results, with the failure output, to the job summary. Both are visible without signing in, unlike the log. A failed job also keeps its full output as the `verify-generated-<os>` artifact.
- The Streamlit app is started and health-checked on `127.0.0.1` instead of `localhost`.
- New `pnpm demo:fixtures` command (`scripts/update-demo-fixtures.ts` and `scripts/python/analyzer_parity.py`), which needs pandas 3 and keeps Python's exact numbers (including `-0.0`), and `pnpm demo:compare` (`scripts/compare-analyzer.ts`).
- Workflows:
  - Every job has a time limit.
  - Runs on `main` are no longer cancelled by a newer push.
  - The one third-party action (`pnpm/action-setup`) is pinned to a commit.
  - The template list is split without glob expansion.
- End-to-end tests:
  - The `github` reporter writes flaky tests as annotations.
  - The Playwright report is kept even when every test passed.
- The Pages workflow gives write access only to its deploy job.
- The internal-link test, which renders every page the site links to, has a 2-minute limit: it had come close to the 20-second default, and passed it in a Linux container.
- `pnpm verify:generated`:
  - Its reporting is in `scripts/lib/verify-report.ts`, with unit tests.
  - It works in the real path of the temporary folder (GitHub's Windows runners use a short `RUNNER~1` name).
  - A failed Python check is annotated too.

### Documentation

- New: [Demo Studio](docs/demo-studio.md) for contributors and [Present your project](docs/guides/present-your-project.md) for students. Both are also on the site.
- Updated:
  - README
  - architecture
  - design system (chart colours and rules)
  - deployment (what to do when the Pages deployment fails)
  - CONTRIBUTING (demo fixtures, what to do when CI fails)
  - BUILD_STATUS

### Tests

- 444 unit tests in 52 files (319 in 40 before) and 227 end-to-end tests passed with 7 skipped by design (149 and 3 before). No test was removed.
- The hardening pass added:
  - tests for focus after deleting rows and removing filters, and for the alert dialogs and chart buttons;
  - four journey tests;
  - tests for the verifier's process handling, including a server that never answers;
  - six parity cases;
  - storage tests in the attendance (39 tests, 34 before) and expense (48, 42 before) templates;
  - a report test in the analyzer template (51, 50 before).
- The release audit added:
  - parity cases for every analyzer difference it found;
  - a test that forces the generator's focus timing;
  - tests for the CI reporting;
  - end-to-end checks that Escape returns focus to the button that opened a dialog, and that quick key presses move between slides;
  - tests in the expense tracker and result analyzer templates for the bugs fixed in 1.0.1.
- New tests cover:
  - each demo against its template, its main flows and its guided checks;
  - the analyzer port against the Python output;
  - presentation mode and its keyboard rules;
  - the readiness items and score;
  - selected viva questions, and the new saved data and its reset;
  - keyboard use, reloads and phone layouts in a real browser;
  - axe on every new page and on the demo dialogs in both themes.
- Existing tests changed only where the product changed: the home page heading has the new tagline, the header lists Demos, and the tour has six tabs.
- The new accessibility test of the demo dialog waits for its 180 ms fade-in to finish; before that, axe measured half-faded colours.

## 3.1.0 (23 October 2026)

A redesign of the whole website for a calmer, more consistent and more accessible interface. Features, templates (still version 1.0.0 and verified) and saved data are unchanged: checklist ticks, viva ratings and report drafts saved by 2.0 or 3.0 load exactly as before, and typed viva answers are still never saved.

### Design system

- One set of tokens for both themes, documented in [docs/design-system.md](docs/design-system.md) and on the site. The light theme moves to a warm, paper-like neutral; input and select borders use a new `control` colour at 3:1 or more against every surface (they were 1.6:1); a navy `inverse` pair is used for the closing band.
- A type scale (`type-display`, `type-title`, `type-h2`, `type-h3`, `type-eyebrow`, `type-lead`, `type-meta`) replaces sizes chosen page by page. Corner radii have fixed roles, and shadows are softer.
- Motion: 160 ms transitions, buttons move down 1 px while pressed, dialogs fade in, progress bars fill and the theme change fades. All of it is off when the system asks for reduced motion.

### Header, footer and page structure

- Compare is in the main navigation, and the current section is underlined.
- A search field in the header opens the gallery filtered by the text. It is a field on wide screens, an icon link at laptop width, and in the menu on phones. The phone menu now scrolls when it is taller than the screen.
- Breadcrumbs on project, source, project document, learning studio, viva practice and submission workspace pages. Every page header has a short label above its title.
- The footer uses two columns on phones, and its repository link says it opens in a new tab.

### Home page

- A new hero with the verification count taken from the records, a “See it in action” tour with keyboard-operable tabs and real, labelled screenshots of five parts of the site, “How it works”, featured projects, the learning tools, categories (empty ones say so), an invitation to contribute and a closing call to action. The “Recently added” table was removed.

### Gallery and project pages

- Project cards lead with the screenshot and verification status, then the category, title and tagline, with the difficulty (a three-bar meter plus its name) and the main technologies at the bottom. Fewer badges.
- The filter panel uses dividers instead of boxes and dims options with no matching projects. The search field has an icon.
- Project pages have one main action (“Customize and download”), a facts row (difficulty, audience, technologies, offline use) and features and limitations side by side.

### Generator

- The stepper shows completed, current, upcoming and needs-attention states, with a progress bar and “Step 2 of 5: Details” on phones. Completed steps are buttons for going back, and a step with errors says so to screen readers.
- The form panel no longer stretches to the height of the preview column.

### Learning studio, viva practice and submission workspace

- Studio overview: two columns with a sticky progress panel. Architecture layers form one list. Checklist groups have a header with a per-group count. Troubleshooting entries have an expand arrow and a quiet “General advice” label, while problems seen during verification keep their badge. The walkthrough's previous and next links wrap instead of overflowing on 320 px screens, and file links look like links.
- Learning center and viva practice hubs: project cards show checklist and viva progress as meters with one main action. The viva hub explains how practice works, including that the key-idea check only looks for words and can't tell whether an answer is right.
- Viva practice: a clearer progress panel, practice mode cards with icons and aligned buttons, and a focused session column with a progress bar.
- Submission workspace: restyled through the shared components only; drafts and downloads are unchanged.

### Compare, documentation and other pages

- Compare: on phones, each attribute lists every chosen project's value, instead of a table that scrolled sideways.
- Documentation: the index groups documents with a description per group; on phones the document list folds into an “All documents” menu; the sidebar marks the current document clearly; every code block has a copy button; Markdown tables keep their outer border.
- The 404 page suggests where to go next, and the error page uses the same layout.

### Accessibility

- Every page type is checked by axe (WCAG 2.2 AA and best practices) in both themes at desktop and phone sizes, and for sideways scrolling at 1280, 360 and 320 px.
- The two search areas on the home page are separately named landmarks. Checkboxes and radio buttons use the brand colour. Progress meters are valid description lists with the value in text.

### Tests

- 319 unit tests (312 before) and 149 end-to-end tests (146 before). No test was removed.
- New tests cover the header navigation (including Compare), the header search (unit and end to end), the product tour's tabs and keyboard support, code copy buttons and raw HTML in Markdown, the stepper's needs-attention state, the comparison's phone layout, the learning center's progress meters and report links, and the phone document menu.
- Updated tests: the home page test checks the new sections instead of the removed table; the learning center test reads the new progress meters; a gallery end-to-end locator is now exact because the header also has a search field. Testing Library waits up to 5 seconds for lazily loaded pages, because the full parallel run could exceed the 1-second default.

## 3.0.0 (23 October 2026)

This release turns CampusKit into a learning studio: students can now understand, explain and present a project, not only download it. The three templates are unchanged (version 1.0.0) and still verified.

### Learning studio

- Every project has a learning studio at `/projects/<project>/learn` with five sections: an overview (who it is for, prerequisite knowledge, what you will learn, setup, stack, limitations and your progress), an **architecture explorer** (layers, selectable components, connections and step-by-step data flows), a **code walkthrough** of the important files, a **checklist** of what to be able to explain, and **troubleshooting**.
- Walkthrough and architecture links open the source browser at the line where each function, class, constant or setting is defined; the source browser now highlights that line.
- The content lives in learning guides (`packages/project-catalog/learning/`), written for each template from its code and documentation. `pnpm validate:catalog` checks every guide against the real template: files must exist, named functions must be defined in those files, preview labels must appear in the source, and troubleshooting commands may not delete files, change system settings or run downloaded scripts.

### Viva practice

- Each project has viva practice at `/projects/<project>/viva`, and `/viva` lists them all. There are 18 to 20 questions per project across basics, technology choices, architecture, implementation, data structures, testing, security, limitations and improvements.
- Quick (five questions, missed and unpractised first), topic, mixed and review modes. Students write an answer (never saved), compare it with the model answer and an optional longer explanation, see which key ideas their answer mentions, with a plain statement that this is only a word check, and rate themselves on correctness, understanding, clarity and awareness of limitations. Questions rated “Not yet” or “Partly” return in review mode.
- Ratings are saved in the browser only and can be reset; no AI service is used.

### Submission workspace

- The report builder moved to `/learn/report` (old `/learn?project=` links redirect) and became the submission workspace, with two new sections, “Implemented features” and “Testing methodology”.
- Downloads end with **Appendix A: Project facts from CampusKit**, labelled as not written by the student, including the template's real verification results, and **Appendix B: Demonstration checklist** from the project's demonstration steps, ticked as the student rehearses.
- Sections are labelled “CampusKit draft” or “Edited by you”; the presentation outline can be copied as a plain slide list. Drafts saved by 2.0 are restored, with the new sections filled in.
- Generated ZIPs' `docs/PROJECT_REPORT_DRAFT.md` gains the new sections and the facts appendix.

### Comparison and selection

- A new `/compare` page puts two or three projects side by side (languages, frameworks, difficulty, tools, server, data storage, offline use, external services, learning objectives and verification) and explains the differences in plain sentences.
- Goal suggestions (first project, frontend, Python, AI/ML, database, software engineering practice) follow written rules shown next to the results. Where nothing matches, a labelled fallback says so; there are no popularity numbers or time estimates.
- Manifests have a new `stack` field (`backend` and `persistence`) that the comparison and the studio use.

### Customization studio

- The generator shows an illustration of the generated app's header with the chosen name, institution, author and the template's real theme colour (the validator now checks that every colour swatch is a colour the template uses) and its real navigation labels.
- Each setting lists the files it is written to, and settings that other templates offer but the chosen one doesn't are listed as unavailable.
- Choices survive leaving the generator and coming back in the same tab.

### Navigation, accessibility and fixes

- The header has a Viva practice item; the desktop navigation switches to the menu below 1024 px so five items never overflow.
- After navigation, focus moves to the main region unless the page has placed it inside (the studio moves it to the section heading).
- The Python guide's port advice was corrected: Streamlit 1.66 moves to the next free port unless you choose the port yourself.
- `pnpm verify:generated` waits for the Streamlit process to exit and retries deleting temporary folders, so a locked file on Windows no longer aborts the run.

## 2.0.0 (22 October 2026)

This release makes every template's state visible and checkable, and gives students more of what they need inside the ZIP. The three templates themselves are unchanged (version 1.0.0).

### Template verification

- Every template now has a status: **Verified**, **Awaiting verification**, **Needs attention** or **Draft**. It appears on gallery cards, project pages, the generator and the project comparison.
- `pnpm verify:generated <id> --record` saves a verification record in `packages/project-catalog/verification/<id>.json`: the date, operating system, Node.js, npm or Python versions, and every step that ran for the default and the fully customized project.
- Each record stores a SHA-256 fingerprint of the template files and of the manifest settings that affect them. The site computes the same fingerprint from the files it publishes, so a template shows as verified only while those exact files match a passing record. Editing a template returns it to "Awaiting verification" by itself.
- Project pages have a **Verification** section: the checks that run before every release, each recorded run with its steps, the operating systems not yet verified, and earlier results that no longer apply.
- All three templates were verified on macOS for this release (see BUILD_STATUS.md). Linux and Windows have no records yet.

### Generator

- The review step shows the real contents of the generated files (GETTING_STARTED.md, the report draft and every file your choices change), taken from the same files that go into the ZIP.
- Choosing a template shows its status and what setup involves: steps, internet access, API keys and external services.
- The final step lists environment variables (or says none are needed) and the template's known limitations.
- Every ZIP now includes `docs/PROJECT_REPORT_DRAFT.md`: abstract, problem statement, objectives and scope, requirements, architecture, test cases, results and limitations, future work, presentation outline and viva pointers, built from the manifest with your project name, institution and name filled in. Everything you must write or measure yourself is a [bracketed prompt].
- `GETTING_STARTED.md` now also covers environment variables, known limitations and links to the project's documents.

### Discovery

- The gallery has a "Not sure which project to choose?" guide: advice on experience, time, technologies and API keys, and a comparison table built only from manifest data (no popularity numbers or time estimates).
- Project pages suggest related projects that share technologies, tags or a category, and say what they share.

### Catalog and contributors

- Manifests accept `"draft": true`. Drafts are labelled everywhere, are never shown as verified and can't be featured.
- Non-draft templates must list architecture notes and viva questions in `docs`.
- `pnpm validate:catalog` rejects credential files (`.env`, `secrets.toml`, keys, …) in a template folder and verification records that are malformed or belong to no template, prints each template's status, and warns about out-of-date or failed verifications.
- CI verifies generated projects on Linux, Windows and macOS for only the templates a pull request touches (`pnpm changed-templates`); pushes to `main` and changes to the engine or catalog code still verify every template.
- The contributor guide, new-project checklist and pull request template explain drafts, statuses, recording verifications and the review process.

### Fixes and smaller changes

- Netlify builds now run `pnpm validate` before `pnpm build`, as the GitHub Pages workflow already did. Previously a Netlify deploy skipped the catalog checks.
- The site links to the source repository (`site.config.ts`).
- `pnpm verify:generated` reads tool versions correctly when npm prints warnings, and reports a record it cannot write instead of stopping the run.
- The report-draft logic moved from the website into `@campuskit/project-catalog`, so the Learn page and the ZIP share it.
- Website screenshots in the README were recaptured.

## 1.0.0 (21 October 2026)

First release: the website (gallery, project pages, generator, learning center, documentation), the template engine, the project catalog and three templates.
