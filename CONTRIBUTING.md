# Contributing to CampusKit

Thank you for helping. CampusKit is for students, so the most valuable contributions are the ones that make a project easier to run, understand or explain: a new template, a clearer guide, a fixed bug, a better error message.

Please read the [code of conduct](CODE_OF_CONDUCT.md) first. To report a security problem, follow [SECURITY.md](SECURITY.md) instead of opening an issue.

## Set up the repository

You need:

- **Node.js 22.12 or newer.** Node.js 24 LTS is recommended (`.nvmrc` says `24`).
- **pnpm 10.** Install it with `npm install --global pnpm@10.34.7`, or run `corepack enable` if your Node.js includes Corepack. The exact version is pinned in `package.json`.
- **Python 3.11 or newer**, only if you work on the Python template or run `pnpm verify:generated`.

Then:

```bash
pnpm install
pnpm dev
```

The site runs at <http://localhost:5173/>. Template changes appear after a page reload.

## Before you open a pull request

Run the checks that CI runs:

```bash
pnpm validate        # catalog validation and repository checks
pnpm format:check    # Prettier
pnpm lint            # ESLint, including accessibility and React hooks rules
pnpm typecheck       # TypeScript, strict mode
pnpm test            # unit and component tests
pnpm build           # production build of the website
```

If you changed the website's behaviour, also run the end-to-end tests. They need Chromium once: `pnpm playwright:install`.

```bash
pnpm test:e2e
```

If you changed a template or the template engine, check the projects students will actually receive:

```bash
pnpm verify:generated
```

`pnpm format` fixes formatting. `pnpm check` runs the first six checks in order.

## What we look for in a pull request

- **One change per pull request,** with a description of what changed and why. Screenshots help for visual changes.
- **Tests for behaviour changes.** Test what a user sees and does (Testing Library queries by role and label), not implementation details.
- **Accessible interfaces.** Every control has a visible label, everything works with the keyboard, focus is visible, and colour is never the only signal. The lint rules and the axe tests catch a lot, but not everything.
- **Honest content.** No invented numbers, testimonials, screenshots or claims. Counts must come from the catalog.
- **Plain language** in the interface and documentation: sentence case, active voice, specific error messages that say how to fix the problem.
- **Strict TypeScript.** No `any`, no non-null assertions to silence errors, no disabled lint rules without a comment that explains why.

## Adding or changing a template

Read [Adding a template](docs/adding-a-template.md) and complete the [new project checklist](docs/new-project-checklist.md). Open a “New project proposal” issue before you start a new template, so we can agree on the scope.

When you change an existing template, bump its `version` and `updatedOn` in the manifest, and keep its README, architecture notes and viva questions in step with the code.

## Documentation

Guides for students live in `docs/guides/`, contributor documentation in `docs/`. They are shown on the website's documentation pages, so links between them must be relative (for example `docs/template-engine.md`). `pnpm validate` checks that every relative link in the repository's Markdown files points to a real file.

## Licence

By contributing, you agree that your contribution is released under the [MIT License](LICENSE) that covers the project. Only contribute code and content that you wrote yourself or that is available under a compatible licence, and say where it came from.
