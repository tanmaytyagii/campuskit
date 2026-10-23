## What does this change?

<!-- Describe the change and why it is needed. Link the issue it closes, e.g. "Closes #12". -->

## How was it tested?

<!-- Tick what you ran. -->

- [ ] `pnpm validate`
- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm test:e2e` (needed for changes to the website)
- [ ] `pnpm verify:generated` (needed for changes to a template or the template engine)
- [ ] `pnpm verify:generated <id> --record`, with the updated verification record committed (for template changes; say which platforms you ran it on)

## Screenshots

<!-- For visual changes: before and after, in light and dark themes if relevant. -->

## Checklist

- [ ] New and changed behaviour is covered by tests.
- [ ] The change works with the keyboard and with a screen reader's labels (every control has a visible label).
- [ ] Documentation is updated (README, docs/, or the template's README, architecture notes and viva questions).
- [ ] If a template changed, its learning guide (`packages/project-catalog/learning/<id>.json`) still describes the code accurately.
- [ ] Nothing in this change invents numbers, screenshots, testimonials or results.
- [ ] No verification record was written or edited by hand.
- [ ] For a new template: I completed the [new project checklist](../docs/new-project-checklist.md).
