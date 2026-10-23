# Changelog

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
