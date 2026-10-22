# New project checklist

Copy this list into your pull request description and tick each item. A maintainer will check it again during review. See [Adding a template](adding-a-template.md) for how to do each step.

## The project works

- [ ] It installs and runs on a fresh computer by following only its README.
- [ ] It works offline after the dependencies are installed, or the manifest's `network` section explains exactly what needs the internet and why.
- [ ] It needs no paid service, API key or account.
- [ ] Its automated tests pass with one command, and they test behaviour (what the user sees and what is saved), not just that components render.
- [ ] The lockfile (`package-lock.json`) or the version ranges in `requirements.txt` are committed.
- [ ] There are no secrets, personal data or real student records in the template. Sample data is clearly fictional.

## It is accessible and robust

- [ ] Every form control has a visible label, and errors explain how to fix them.
- [ ] It can be used with the keyboard alone, with visible focus.
- [ ] Charts have a text or table alternative.
- [ ] It handles empty states, invalid input and corrupted saved data without crashing.
- [ ] It works on a phone-sized screen without sideways scrolling.

## Students can understand and explain it

- [ ] `README.md` covers features, prerequisites, getting started, configuration, project structure, testing, known limitations, and licence and credits.
- [ ] `docs/ARCHITECTURE.md` explains how the code is organised and how data flows.
- [ ] `docs/VIVA_QUESTIONS.md` has at least ten questions, answered from how this code actually works.
- [ ] Comments explain anything that isn't obvious to a student seeing it for the first time.

## The manifest is accurate

- [ ] Features, limitations and learning objectives are specific and true. Nothing is exaggerated.
- [ ] Setup and test commands were copied from a terminal session where they worked, on each platform listed.
- [ ] Screenshots are real captures of the app with its demo data, and their alt text describes what they show.
- [ ] Every option's edits change only the intended places, and the generated project still installs, passes its tests and builds (`pnpm verify:generated <id>`).
- [ ] Third-party components and their licences are listed in `license.thirdParty`.

## Repository checks pass

- [ ] `pnpm validate`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm test:e2e`
