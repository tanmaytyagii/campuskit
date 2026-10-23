# Changelog

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
