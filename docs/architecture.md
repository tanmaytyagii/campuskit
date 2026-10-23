# Architecture

CampusKit is a static website. There is no server, database, account system or AI service: the site is a set of files that any static host can serve, and every project is generated in the student's browser.

## Repository layout

```text
campuskit/
├── apps/web/                 The website: React 19, TypeScript, Vite, Tailwind CSS
│   ├── src/features/         Gallery, project pages, generator, report builder
│   ├── src/pages/            Home, learning center, documentation, 404
│   ├── vite-plugins/         Template bundles and the Content Security Policy
│   └── e2e/                  Playwright tests against the production build
├── packages/
│   ├── template-engine/      Options, edits, escaping, path rules, ZIP files
│   └── project-catalog/      Project manifests, their schema and the validator
├── templates/                The starter projects, exactly as students receive them
├── scripts/                  Repository checks, generated-project verification, screenshots
├── tests/                    Repository-level tests (lint configuration, documentation)
└── docs/                     Student guides and contributor documentation
```

The website and the two packages form a pnpm workspace. The templates are deliberately **not** workspace members: each one is a standalone project with its own `package.json` and lockfile (or `requirements.txt`), so what you test in `templates/` is what a student gets.

## How the pieces fit together

```text
packages/project-catalog/manifests/*.json
        │  validated with Zod when the site loads (and by pnpm validate:catalog)
        ▼
   typed catalog ───────────▶ gallery, project pages, generator form, report builder

templates/<id>/  ──vite-plugins/template-bundles.ts──▶  template-bundles/<id>.<hash>.json
                                                              │ fetched when needed
                                                              ▼
student's choices ──▶ template engine (in the browser) ──▶ validate options
                                                         ──▶ apply the manifest's declared edits
                                                         ──▶ add GETTING_STARTED.md and docs/PROJECT_REPORT_DRAFT.md
                                                         ──▶ ZIP with one root folder ──▶ download

templates/<id>/ + manifest ──▶ fingerprint (SHA-256) ─┐
packages/project-catalog/verification/<id>.json ───────┴─▶ template status on every screen
```

### Template status

`pnpm verify:generated <id> --record` is the only thing that writes a verification record. Each record has one entry per operating system, holding a fingerprint of the template files and of the manifest's `version`, `template`, `customization`, `setup`, `testing`, `prerequisites` and `environment` fields (`packages/project-catalog/src/node/fingerprint.ts`).

At build time, `vite-plugins/template-bundles.ts` computes the same fingerprint from the files it is about to publish and exposes it, with the record, as `virtual:template-verification`. `templateStatus()` in `packages/project-catalog/src/verification.ts` compares the two: a matching passing entry means **Verified**, a matching failed entry **Needs attention**, no matching entry **Awaiting verification**, and `"draft": true` in the manifest always means **Draft**. `pnpm validate:catalog` prints the same statuses and warns about out-of-date or failed records.

### One source of truth

Each project has one manifest in `packages/project-catalog/manifests/`. The gallery's filters, the project page, the generator's form and the setup instructions all come from it. A project can only offer a customization control if its manifest declares an option _and_ the exact edits that option makes, and the validator checks that those edits apply to the real template files.

### Template bundles

The Vite plugin in `apps/web/vite-plugins/template-bundles.ts` turns each template folder into a JSON bundle:

- **Development** (`pnpm dev`): bundles are rebuilt from disk on every request, so template changes appear immediately.
- **Production** (`pnpm build`): bundles are written to `dist/template-bundles/<id>.<content-hash>.json`, so browsers never use a stale copy.

The bundler reuses the engine's exclusion policy: `node_modules`, build output, caches, virtual environments, `.env` files, keys and similar files are never bundled, and symbolic links are never followed. Hidden files that belong to a working project, such as `.gitignore` and `.streamlit/config.toml`, are kept.

### The template engine

The main entry of `packages/template-engine` uses no browser-only or Node.js-only APIs, so the same code runs in the browser, in tests and in the verification scripts. Its Node.js helpers (building bundles from disk, safe extraction) live in a separate `node` entry. It validates the student's values, applies only the edits the manifest declares, escapes every value for the file type it is written into, refuses unsafe paths and packages the result. It never executes template code or shell commands. See [Template engine](template-engine.md) for the details.

### The website

- **Routing:** React Router in library mode. Heavy pages (generator, Markdown documents, source viewer) load on demand.
- **State:** gallery filters live in the URL, so a filtered view can be shared. Report drafts are saved in the browser's `localStorage` only.
- **Documents:** project documents are imported from the template folders and repository documents from `docs/`, at build time, so the site shows the same files the repository and the ZIPs contain. Markdown is rendered without raw HTML.
- **Security:** a Content Security Policy is added to the built `index.html` (see `apps/web/vite-plugins/content-security-policy.ts`). External links open in a new tab with `rel="noopener noreferrer"`.
- **Accessibility:** native form controls and `<dialog>`, visible focus, a skip link, focus moved to new content after navigation, `prefers-reduced-motion` respected, and both colour themes checked with axe in a real browser.

## Testing layers

| Layer                          | Where                                    | What it proves                                                                                                                              |
| ------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine unit tests              | `packages/template-engine/src/*.test.ts` | Escaping, edits, path safety, exclusions, ZIP structure, Unicode                                                                            |
| Catalog tests and validator    | `packages/project-catalog`               | Every manifest is valid and every edit applies to the real template, with defaults and with a stress-test name                              |
| Web component tests            | `apps/web/src/**/*.test.tsx`             | Pages, filters, the generator flow and its ZIP, report drafts, links, accessibility (jsdom + axe)                                           |
| End-to-end tests               | `apps/web/e2e`                           | The production build in Chromium, desktop and phone sizes: downloads, keyboard use, axe in both themes, no console errors or CSP violations |
| Template tests                 | each `templates/<id>`                    | Each starter project's own behaviour                                                                                                        |
| Generated-project verification | `scripts/verify-generated-projects.ts`   | Generated ZIPs extract safely, install, pass their tests and build                                                                          |
| Repository checks              | `scripts/check-repo.ts`                  | No secrets or build output committed, documentation links resolve, documented commands exist                                                |

## Design decisions

- **Static first.** Hosting is free and simple, nothing can leak from a server, and the site keeps working on slow college networks once loaded.
- **Generation in the browser.** Student details never leave their computer.
- **Declared edits instead of a general templating language.** Templates stay normal, runnable projects (no `{{placeholders}}` that break the build), and every change the generator makes is listed on the project page.
- **Honest content.** Counts come from the catalog, screenshots are captured from the real apps, and report drafts mark everything a student must write or measure themselves.
