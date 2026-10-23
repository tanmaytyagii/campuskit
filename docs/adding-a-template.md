# Adding a template

A CampusKit template is two things:

1. **A working project** in `templates/<id>/`, exactly as a student will receive it.
2. **A manifest** in `packages/project-catalog/manifests/<id>.json` that describes it and declares what the generator may change.

Before you start, open a “New project proposal” issue so maintainers can confirm the idea fits. Then work through these steps, and finish with the [new project checklist](new-project-checklist.md).

## 1. Build the project

Create `templates/<id>/`. The id is lowercase letters, digits and hyphens, such as `library-manager`. Build it as a normal standalone project that runs with its own package manager. It is not part of the pnpm workspace.

A template must include:

- **`README.md`** with features, prerequisites, getting started, configuration, project structure, testing, known limitations, and licence and credits. Look at an existing template's README for the expected level of detail.
- **`LICENSE`**: the MIT License with the line `Copyright (c) <year> CampusKit contributors`.
- **`docs/ARCHITECTURE.md`**: how the code is organised and how data flows through it.
- **`docs/VIVA_QUESTIONS.md`**: questions an examiner may ask, as `## 1. Question` headings, each answered from how the code actually works.
- **`docs/screenshots/`**: real screenshots of the running app (PNG, JPEG or WebP). Never use mock-ups.
- **Automated tests** that run with one command.
- **A lockfile** for npm projects (`package-lock.json`), or a `requirements.txt` with version ranges for pip projects.
- **`.gitignore`** for the folders the project creates (`node_modules/`, `dist/`, `.venv/` and so on).

Keep it beginner-friendly. Prefer the standard library and a few well-known dependencies, explain anything clever in a comment, and make the app work offline once its dependencies are installed.

Two file names are reserved, because the generator writes them into every project: `GETTING_STARTED.md` (the setup steps) and `docs/PROJECT_REPORT_DRAFT.md` (a report outline built from your manifest). Don't add files with those names. Never commit credentials either: the validator rejects templates that contain `.env`, `secrets.toml`, `.npmrc`, private keys and similar files. If the project needs a key, list it in the manifest's `environment` section and ship a `.env.example`.

## 2. Put customizable values in one place

The generator edits only the locations your manifest declares, so make those few and obvious. A good pattern is a small configuration file that the app reads and validates at startup:

```json
{
  "appName": "Library Manager",
  "institutionName": "Riverside Public School",
  "theme": "indigo"
}
```

Then the manifest can change values with `json-set` edits instead of searching for text in source files. For text that has to appear elsewhere (the HTML `<title>`, the README), use `replace` edits with an exact `find` string and the right `escape` context. [Template engine](template-engine.md) explains every option.

## 3. Write the manifest

Copy an existing manifest and change it. Keep `"$schema": "../manifest.schema.json"` at the top so your editor can autocomplete fields and highlight mistakes.

| Section                                                                                | What to write                                                                                                                                      |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `slug`, `name`, `tagline`, `description`                                         | The id matches the folder name. Describe what the project does in plain words.                                                                     |
| `category`, `projectType`, `audience`, `difficulty`, `languages`, `frameworks`, `tags` | Used by the gallery's filters and search.                                                                                                          |
| `features`, `limitations`, `learningObjectives`, `ideasForExtension`                   | Shown on the project page and used by the report builder. Be specific and honest, especially about limitations.                                    |
| `prerequisites`, `setup`, `testing`                                                    | The exact commands, per platform where they differ. These become the project page's instructions and `GETTING_STARTED.md`.                         |
| `environment`, `network`                                                               | Environment variables (most templates need none), whether installing needs the internet, whether the app works offline, and any external services. |
| `media`, `docs`                                                                        | Screenshots with descriptive alt text, and the documents the project page links to.                                                                |
| `customization`                                                                        | The options and the edits that apply them.                                                                                                         |
| `license`                                                                              | SPDX id, the licence file, attribution text and third-party components.                                                                            |

Dates use `YYYY-MM-DD`. `addedOn` is when the template is first published and `updatedOn` when it last changed.

While the template is unfinished, add `"draft": true`. Drafts are labelled **Draft** everywhere on the site, are never shown as verified, can't be `featured`, and may leave out the architecture notes and viva questions until they are written. Remove the flag when the template is complete.

## 4. Register the manifest

Add the import to `packages/project-catalog/src/registry.ts`:

```ts
import library from '../manifests/library-manager.json';

export const REGISTERED_MANIFESTS: readonly RawManifest[] = [
  // ...existing entries
  { file: 'library-manager.json', data: library },
];
```

## 5. Validate

```bash
pnpm validate:catalog
```

The validator checks the manifest schema, unique ids and slugs, that the folder exists, that the licence, documents, screenshots and lockfile are present, that relative links in the template's Markdown files resolve, that JSON files edited with `json-set` are formatted the way the engine writes them, and that generation succeeds with the default values and with a stress-test name full of special characters and Unicode. Fix every problem it reports.

## 6. Verify a generated copy

```bash
pnpm verify:generated library-manager
```

This generates the project the way the website does, extracts the ZIP into a temporary folder, checks the customized files and the excluded ones, installs the dependencies and runs the tests and the build in that copy. It needs Node.js for npm templates and Python 3.11 or newer for pip templates.

When it passes, record the result:

```bash
pnpm verify:generated library-manager --record
```

This writes `packages/project-catalog/verification/library-manager.json` with the date, your operating system, the Node.js, npm or Python versions, every step that ran, and a fingerprint of the template files and of the manifest's version, template, customization, setup, testing, prerequisites and environment sections. Commit the file. Running it on another operating system adds an entry for that platform. If you can't run it, say so in the pull request and a maintainer will.

## Template statuses

The website shows one status for every template, computed from the manifest, the verification record and the files the site actually serves:

| Status                    | When                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Draft**                 | The manifest has `"draft": true`.                                                                                                    |
| **Awaiting verification** | It passes every catalog check, but no recorded verification matches the current files. This is what any change to a template causes. |
| **Verified**              | At least one platform has a passing verification whose fingerprint matches the current files, and none of them has a failing one.    |
| **Needs attention**       | A verification of the current files failed on some platform.                                                                         |

Nobody can mark a template as verified by hand: the fingerprint has to match files that passed the script. `pnpm validate:catalog` prints each template's status and warns when a record is out of date or failed. Those warnings don't fail CI, so you can open a pull request before every platform is verified.

## 7. Screenshots

Screenshots must come from the real app with its demo data. For React templates you can add the template to `scripts/capture-screenshots.ts` and run `pnpm screenshots library-manager`, which builds the app, freezes the browser clock and captures each screen at 1280 × 800. Otherwise, capture them yourself at a similar size.

## 8. Run every check and open a pull request

```bash
pnpm validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Then open a pull request and complete the checklist in its description.

## Review process

1. **Automated checks.** CI runs `pnpm validate`, formatting, linting, type checking, the unit tests, the build and the browser tests. For pull requests it also runs `pnpm verify:generated` on Linux, Windows and macOS, but only for the templates the change touches (`pnpm changed-templates` decides; changes to the engine or the catalog code verify every template). Pushes to `main` always verify every template.
2. **Maintainer review.** A maintainer reads the code and the documentation, checks the [new project checklist](new-project-checklist.md), runs the project, and looks for anything that overstates what it does.
3. **Verification record.** Before the template is shown as verified, the maintainer runs `pnpm verify:generated <id> --record` (or checks the record you committed against a fresh run) and merges the record.
4. **Publishing.** A template can be merged as a draft. It loses the draft label only when the checklist is complete.

Templates you don't verify yourself are still published, but they show as **Awaiting verification** until someone does.
