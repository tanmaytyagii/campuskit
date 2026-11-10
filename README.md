<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/brand/wordmark-dark.svg">
  <img alt="CampusKit" src="docs/brand/wordmark-light.svg" width="292" height="64">
</picture>

**Explore it. Build it. Understand it. Demonstrate it.**

CampusKit is a free, open-source project factory and learning studio for school and college students. Pick a complete starter project, try it in an interactive demo, customize it in your browser, download a ZIP that runs on your own computer, learn how it works, practise explaining it for your viva, rehearse the demonstration, present it and prepare your report.

It is a static website: no accounts, no server and no database. Projects are generated in the browser, demos run on fictional sample data in the browser tab, and everything a student enters is saved only in their own browser. Once visited, it works offline and can be installed as an app. Nothing a student types leaves their computer, with one exception they control: the optional AI assistant sends a request only when the student adds their own API key, reads exactly what will be sent, and presses Send.

![The CampusKit home page: headline, search, and a live preview of where the generator writes a project name](docs/screenshots/home.png)

## What's included

**Four complete templates**, each with a README, architecture notes, viva questions, real screenshots, sample data, automated tests and an MIT licence:

| Template                                                         | Stack                           | Level        | What it does                                                                                                |
| ---------------------------------------------------------------- | ------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| [Student Attendance System](templates/attendance-system)         | React, TypeScript, localStorage | Beginner     | Class roster, daily attendance, percentages per student and class, CSV export                               |
| [Personal Expense Tracker](templates/expense-tracker)            | React, TypeScript, Recharts     | Intermediate | Income and expenses, monthly budget, charts with table alternatives, CSV and JSON export                    |
| [Student Result Analyzer](templates/student-result-analyzer)     | Python, pandas, Streamlit       | Intermediate | Validates a marks CSV, computes statistics, grades and ranks, exports a report                              |
| [Student Management System](templates/student-management-system) | Python, Flask, SQLite           | Intermediate | Students, courses, enrollments and attendance in SQLite, with search, pages, statistics and CSRF protection |

**A website** with:

- a **project gallery** with search and filters (audience, category, difficulty, language, type) that live in the address, so a filtered view can be shared, and a short guide that compares projects on what they need: what to install, setup steps, whether they run offline, and API keys;
- **project pages** with screenshots, features, limitations, prerequisites, setup and test commands, customization options, verification results, documentation, viva questions and related projects;
- a **generator** that validates your choices, shows exactly which files they change, lets you read the generated files before downloading, and builds the ZIP in your browser together with a `GETTING_STARTED.md` (setup steps, environment variables, known limitations) and a project report draft for that project;
- a **verification status** for every template (Verified, Awaiting verification, Needs attention or Draft), backed by recorded runs of `pnpm verify:generated` and tied to a fingerprint of the exact files the site serves, so a badge can't outlive the code it describes;
- a **learning studio** for every project: an architecture explorer (layers, components, connections and data flows), a walkthrough of the important files with links that open the source browser at each function's definition, a checklist of what to be able to explain, and troubleshooting for the project's own stack, with problems actually seen during verification marked as such;
- **viva practice** with quick, topic, mixed, review and **spaced review** modes (a question comes back the next day after “Not yet”, after two days after “Partly”, and after 3, 7, 14, then 30 days while it stays confident): write your answer, compare it with a model answer based on the code, see which key ideas your answer mentions (a transparent word check, not an assessment), and rate yourself on four criteria;
- a **submission workspace** that drafts every report section from the project's real features and limitations, keeps CampusKit's facts and verification results in a labelled appendix apart from what you write, adds a demonstration checklist and a presentation outline you can copy as a slide list, and exports the report as Markdown, as a Word document (.docx) or through the browser's print dialog as a PDF;
- **My projects**, a workspace for the student's own projects:
  - status, category, tags, technology, favourites and pins, notes saved as you type, milestones with due dates, links and a timeline, with search, filters, an archive, duplicating and recovery of unreadable data;
  - every template started in this browser, with its progress and a suggested next step;
  - a **backup file** to move everything to another browser or computer, previewed and merged by project, never silently overwriting;
- a **documentation studio** that drafts a README and a viva preparation sheet from a project's own details, marks what's still to write, and exports Word, Markdown or PDF;
- a **dashboard** with real figures only: projects, deadlines, recent activity, recently visited pages and viva practice due for review;
- a **command palette** (Ctrl+K or ⌘K) to go to any page, template, document or project of your own by keyboard, and a list of keyboard shortcuts (`?`);
- a skippable **welcome guide** that suggests templates by written rules, and a **settings** page (profile, theme, language, offline storage, delete everything);
- **mock vivas** with an optional, informational timer, and a **viva progress** page by template and topic with a revision report (Word or Markdown);
- an optional **AI assistant** that uses the student's own Anthropic API key (kept in memory or for the tab only, never saved). It shows the exact text before every request, has a per-tab request limit, and labels its answers as written by AI;
- **offline use and installation** as a web app;
- **Hindi** for the menus, palette, shortcut list and dashboard;
- an **interactive demo** of every project, with fictional sample data that stays in the browser tab and resets in one click. The attendance and expense demos run the templates' own calculations, validation and data updates; the result analyzer demo is a TypeScript version of the Python app, checked against the real Python output; the student management demo is a clearly labelled simulation of the Flask app that shows the SQL each change would run, with its rules and queries checked against the real code. Each demo has a tour, notes on the code behind every screen and a **guided demo** that tells the student what to say and do, checks that each action really happened, and records a finished rehearsal;
- **presentation mode**: full-screen slides in the order examiners expect (problem, objectives, features, architecture, workflow, technology, demo, limitations, conclusion), built only from the project's own data with the source of each slide labelled, separate speaking notes that a key hides on a projector, and the live demo on the demo slides;
- a **readiness check** that brings the evidence together: what CampusKit verified itself, what follows from the student's own checklist and viva progress, and what only the student can confirm (installing, running and testing on their computer), with a transparent score that isn't a grade and the next action for every item;
- a **comparison page** that puts two or three projects side by side and suggests projects for goals such as “my first project” or “a Python project” using written rules over the projects' own data;
- **documentation** for students and contributors, with a copy button on every code block;
- **one consistent interface**: a documented [design system](docs/design-system.md), light and dark themes, a search field in the header, breadcrumbs on nested pages, full keyboard support, and layouts tested from 320 px phones to wide screens. The home page tour shows real screenshots of each part of the site.

| Gallery                                                                                                                                     | Generator                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| ![Project gallery with filters for audience, category, difficulty, language and type](docs/screenshots/gallery.png)                         | ![Generator with a project name full of special characters and the live preview of the files it changes](docs/screenshots/generator.png) |
| **Project page**                                                                                                                            | **Ready to download**                                                                                                                    |
| ![Project page for the Student Result Analyzer with screenshots and setup steps](docs/screenshots/project.png)                              | ![The generator's final step with the setup commands for the generated project](docs/screenshots/generator-done.png)                     |
| **Learning studio**                                                                                                                         | **Viva practice**                                                                                                                        |
| ![The architecture explorer for the attendance system with the storage component selected](docs/screenshots/learning-studio.png)            | ![A viva question with the student's answer, the key ideas it mentions and the model answer](docs/screenshots/viva-practice.png)         |
| **Submission workspace**                                                                                                                    | **Compare projects**                                                                                                                     |
| ![Report workspace with draft sections for an attendance project](docs/screenshots/learn.png)                                               | ![Comparison page with a goal suggestion and two projects chosen](docs/screenshots/compare.png)                                          |
| **Interactive demo**                                                                                                                        | **Guided demo**                                                                                                                          |
| ![The expense tracker demo with this month's totals, the budget and two charts, beside notes on the code](docs/screenshots/demo-studio.png) | ![A guided demo step with what to say and do, and a check confirming the student was added](docs/screenshots/guided-demo.png)            |
| **Presentation mode**                                                                                                                       | **Readiness check**                                                                                                                      |
| ![The architecture slide for the attendance system in presentation mode](docs/screenshots/presentation.png)                                 | ![The readiness check with a score and items checked by CampusKit](docs/screenshots/readiness.png)                                       |
| **Dark theme**                                                                                                                              | **On a phone**                                                                                                                           |
| ![The home page in the dark theme](docs/screenshots/home-dark.png)                                                                          | ![The home page on a 390 px wide phone screen](docs/screenshots/mobile-home.png)                                                         |

## Quick start

You need [Node.js](https://nodejs.org/) 22.18 or newer (24 LTS recommended) and pnpm 10:

```bash
npm install --global pnpm@10.34.7   # or: corepack enable pnpm
pnpm install
pnpm dev
```

The workspace packages are TypeScript that Node.js loads directly, which Node.js 22 does from 22.18 on. If `pnpm` is then “command not found”, see [Set up the repository](CONTRIBUTING.md#set-up-the-repository).

Open <http://localhost:5173/>. To try the production build, run `pnpm build` and then `pnpm preview` (<http://localhost:4173/>).

Students don't need any of this: they use the website, download a project and follow its `GETTING_STARTED.md`. The guides in [docs/guides](docs/guides) explain how to [run a React project](docs/guides/run-a-react-project.md) and [run a Python project](docs/guides/run-a-python-project.md).

## Commands

| Command                               | What it does                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev`                            | Starts the website with hot reloading on port 5173                                                                                         |
| `pnpm build`                          | Builds the static site into `apps/web/dist`                                                                                                |
| `pnpm preview`                        | Serves the production build on port 4173                                                                                                   |
| `pnpm test`                           | Runs the unit and component tests of the engine, the catalog, the website and the repository                                               |
| `pnpm test:e2e`                       | Builds the site and runs the Playwright tests in Chromium, at desktop and phone sizes                                                      |
| `pnpm playwright:install`             | Downloads the Chromium build that Playwright uses (once)                                                                                   |
| `pnpm lint`                           | ESLint with TypeScript, accessibility (jsx-a11y) and React hooks rules                                                                     |
| `pnpm typecheck`                      | TypeScript in strict mode, for every package                                                                                               |
| `pnpm format` / `pnpm format:check`   | Formats, or checks the formatting of, every file with Prettier                                                                             |
| `pnpm validate`                       | Validates the catalog against the templates and runs the repository checks                                                                 |
| `pnpm verify:generated`               | Generates every template, extracts it, installs it, and runs its tests and build                                                           |
| `pnpm verify:generated <id> --record` | The same for one template, then saves the result as its verification record                                                                |
| `pnpm changed-templates [base]`       | Lists the templates a branch changed (CI uses it to verify only those on pull requests)                                                    |
| `pnpm screenshots`                    | Captures the screenshots of the templates and the website from the real apps                                                               |
| `pnpm demo:fixtures`                  | Reruns the Python analyzer to refresh the output its browser demo is tested against                                                        |
| `pnpm demo:compare`                   | Compares the analyzer's browser demo with the Python code on generated CSV files                                                           |
| `pnpm demo:fixtures:students`         | Reruns the Flask template's Python code to refresh what its demo simulation is tested against                                              |
| `pnpm smoke <url>`                    | Checks a deployed copy of the site in Chromium: the expected build is live, every project page, a demo, the generator and a downloaded ZIP |
| `pnpm check`                          | Runs validate, format:check, lint, typecheck, test and build in order                                                                      |

`pnpm verify:generated`, `pnpm demo:fixtures` and `pnpm demo:compare` need Python 3.11 or newer with the analyzer's requirements installed (so pandas 3); `pnpm demo:fixtures:students` needs the Flask template's requirements. Set `CAMPUSKIT_PYTHON` to choose the interpreter. The screenshot and verification scripts use Playwright's Chromium, or the browser in `CAMPUSKIT_CHROMIUM` if you set it.

## How it works

```text
packages/project-catalog/manifests/*.json ──▶ gallery, project pages, generator form, report builder
templates/<id>/ ──(Vite plugin)──▶ template bundle (JSON) ──▶ template engine in the browser ──▶ ZIP
```

Every template has a **manifest**: a JSON file that describes the project and declares its customization options, and, for each option, the exact files and locations it changes. The **template engine** validates the student's values, writes them only to those declared locations (escaped for HTML, Markdown, TOML or JSON as needed), refuses unsafe paths, leaves out dependencies, build output, caches and secret files, adds `GETTING_STARTED.md` and `docs/PROJECT_REPORT_DRAFT.md`, and packages everything into a ZIP with a single root folder. It never runs template code.

The **interactive demos** do run template code, deliberately: each demo imports the template's dependency-free TypeScript modules (calculations, validation, the reducer, sample data) and draws the screens with CampusKit's components. Tests check that every file and function a demo names exists in the template. The Python analyzer can't run in the browser, so its demo is a TypeScript port that is compared, number by number and message by message, with the real code's output. See [Demo Studio](docs/demo-studio.md).

## Template verification

The catalog checks run on every build: a template that fails them is never published. A full verification goes further: `pnpm verify:generated <id> --record` generates the project with the default settings and with every setting changed, extracts each ZIP, installs the dependencies and runs the tests and the build or app, then writes `packages/project-catalog/verification/<id>.json` with the date, operating system, tool versions and every step that ran.

Each record stores a fingerprint of the template files and of the manifest settings that affect them. The website computes the same fingerprint from the files it publishes and shows a template as **Verified** only when they match a passing record. Editing a template therefore returns it to **Awaiting verification** until someone runs the script again; a failed run shows **Needs attention**. The project page lists every recorded run, and which operating systems have not been verified.

Read more in [Architecture](docs/architecture.md) and [Template engine](docs/template-engine.md).

## Repository layout

```text
apps/web/                  The website (React, TypeScript, Vite, Tailwind CSS, React Router)
packages/template-engine/  Options, edits, escaping, path safety and ZIP files
packages/project-catalog/  Manifests, their Zod schema, verification records and the catalog validator
templates/                 The starter projects, exactly as students receive them
scripts/                   Repository checks, generated-project verification, screenshots
tests/                     Repository-level tests
docs/                      Guides for students and documentation for contributors
.github/                   CI and deployment workflows, issue and pull request templates
```

## Quality checks

- **Template engine:** escaping in every context, edits, Unicode names, path traversal and reserved names, secret and build-output exclusion, ZIP structure.
- **Catalog:** every manifest is validated with Zod, and every declared edit is applied to the real template with the default values and with a name full of special characters and Unicode.
- **Website:** component tests render the real routes with the real templates, including a full generation whose ZIP is inspected, and cover the shared interface: header search, the tour's keyboard tabs, the generator stepper's error state, code copy buttons and the phone layout of the comparison; axe-core checks every page type.
- **Demos:** every demo is checked against its template (named files and functions exist, learning links resolve, imported modules are the ones it claims to run, stored data survives a reload), the main flows of each demo, the guided demo, presentation mode and the readiness score are tested, and the analyzer port must reproduce the Python output for both sample files and nine edge cases exactly.
- **End to end:** Playwright tests the production build in Chromium at desktop and phone sizes, and in desktop Firefox and WebKit (`CAMPUSKIT_E2E_BROWSERS=firefox,webkit`; CI runs each in its own job). They cover offline use through the service worker, the AI assistant against a mocked API, and the menus in Hindi. They also download and inspect real ZIP files, check keyboard navigation and the mobile menu, use the demos and presentation mode with the keyboard, fail on any console error, failed request or Content Security Policy violation, and run axe with every rule, including colour contrast, in both themes.
- **Generated projects:** `pnpm verify:generated` extracts each generated ZIP safely, checks the customized and excluded files, then installs the project and runs its own tests and build.

The CI workflow in [.github/workflows/ci.yml](.github/workflows/ci.yml) runs all of these on every push and pull request. The generated-project verification runs on Linux, Windows and macOS: for every template on pushes to `main`, and for pull requests only for the templates the change touches (a change to the engine or catalog code still verifies every template).

## Adding a template

A template is a working project in `templates/<id>/` plus a manifest in `packages/project-catalog/manifests/`. Follow [Adding a template](docs/adding-a-template.md) and the [new project checklist](docs/new-project-checklist.md). `pnpm validate:catalog` tells you exactly what is missing.

## Deploying

The site is static. `pnpm build` produces `apps/web/dist`, which you can host on GitHub Pages (a workflow is included), Netlify (`netlify.toml` is included) or any static host with a single-page app fallback. See [Deployment](docs/deployment.md).

## Known limitations

- There are four templates. The AI and machine learning category has none yet, and the website says so instead of showing an empty promise.
- The generator changes only what each template declares: names, branding, theme colours, sample data and a few settings. It does not add features.
- Generated projects need Node.js or Python installed on the student's computer, and installing their dependencies needs an internet connection the first time.
- The React templates store data in the browser's `localStorage`, with no accounts or sync. They are learning projects, not systems for real institutional records.
- The Flask template has no login and runs on Flask's development server with one SQLite file: one user on one computer. Its README lists what letting other people use it would need, starting with authentication.
- Report drafts, checklist ticks, viva ratings, readiness confirmations and guided demo records are saved only in the browser that wrote them, with no sync between devices; a backup file moves them by hand. Drafts are prompts and facts to build on, not finished text. The Word export keeps headings, lists, tables, emphasis and links but uses CampusKit's own simple styles, not an institution's template, and PDF comes from the browser's print dialog. Nothing is exported as PowerPoint: the workspace copies a plain slide list, and presentation mode shows slides only in the browser.
- The demos are demonstrations with fictional sample data, not the downloaded apps. Their screens are re-created with CampusKit's components, so they look different from the templates, and features such as CSV export, file upload and settings are left out (each demo lists what it simplifies). Demo changes last only until the browser tab is closed.
- The result analyzer demo is a TypeScript port of the Python code. It matches the Python output, with pandas 3 and PyArrow as `requirements.txt` installs them, on 28 recorded cases and on 29,700 generated files. Other inputs could still expose differences, and the browser never runs Python.
- The student management demo is a simulation: the browser runs neither Python nor SQLite. Its validation, sample data, searching, sorting, paging and statistics match the template's Python code on the recorded cases its tests check; the screens and everything else are re-created, and timestamps such as `updated_at` are left out.
- The guided demo checks the data each action changes, not what the student says, and the readiness score counts the student's own confirmations as given. Neither is an assessment.
- The key-idea check in viva practice only looks for words in the student's answer. It can't judge whether an explanation is correct; students rate themselves.
- Learning guides are written by people. The validator guarantees that every file and function they mention exists in the template, but the explanations themselves are checked by review, not automatically.
- Verification records are written on a maintainer's computer and committed. CI repeats the verification on three operating systems but does not write records, so the website shows only the platforms someone recorded.
- A record covers a template's files and its manifest settings. A change to the template engine itself is covered by CI, which verifies every template when the engine changes, rather than by the records.
- Automated browser tests run in Chromium at desktop and phone sizes, and in desktop Firefox and WebKit (Safari's engine). Phone layouts are tested in Chromium only, and real Safari on iOS isn't tested.
- The AI assistant works only online, with the student's own Anthropic API key, and their usage is billed to that account. It was tested against a mocked API, not the live service. Its answers can be wrong: they're labelled as written by AI and point back to the human-written guides.
- Only the menus, palette, shortcut list, dashboard and the language setting are in Hindi. The Hindi text was drafted with AI help and hasn't been reviewed by a native speaker yet. Workspace pages, onboarding, template guides, viva questions, demos and documentation are in English.
- Offline use needs one visit with a connection first. Generating a project offline needs its template stored: it is once you have used it in the generator online, or store them all with Settings → "Store every template for offline use".
- There are no automated visual-regression tests. Layout is checked by the overflow and accessibility tests and by reviewing screenshots; the README and home page screenshots are only as current as the last `pnpm screenshots web` run.
- Accessibility is tested with axe and keyboard tests, not with screen reader users. Some issues only people using assistive technology will find.

## Contributing, security and licence

Contributions are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md). Report security problems privately as described in [SECURITY.md](SECURITY.md).

CampusKit and every template are released under the [MIT License](LICENSE). The licence lets you use, change and share the code as long as the copyright notice stays with it. It does not change your institution's rules about using templates in coursework: read [Using templates honestly](docs/guides/using-templates-honestly.md). Fonts, icons and libraries are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
