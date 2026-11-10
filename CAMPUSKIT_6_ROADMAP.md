# CampusKit 6.0 roadmap

The plan for evolving CampusKit 5.0.0-rc.1 into 6.0. It starts from what the code does today, verified on 31 October 2026, not from earlier reports. Progress is recorded at the end of this file as milestones finish. Nothing is committed, pushed or deployed: the maintainer publishes.

## 1. Verified starting point

- **Git:** `main` at `245fb2a` (4.0.0). The whole of 5.0.0-rc.1 is uncommitted in the working tree (85 changed or new paths). The package `~/Downloads/campuskit-5.0.0-rc.zip` exists and is kept.
- **Checks, rerun on 31 Oct:** validate (4 templates Verified), format, lint, type check and 595 tests in 58 files all pass on macOS.
- **Resources:** 13 GB free on the disk at the start (the previous release ended with about 1 GB). Package caches are reused; nothing outside the scratchpad is deleted.
- **Architecture:** a pnpm monorepo:
  - `apps/web`: a static React 19, Vite 8 and Tailwind 4 site with a strict Content Security Policy as a `<meta>` tag;
  - `packages/project-catalog`: manifests, learning guides and verification records, checked with Zod;
  - `packages/template-engine`: generation in the browser, with ZIP packaging loaded on demand;
  - `templates/`: four working projects: two React + TypeScript, Streamlit + pandas, and Flask + SQLite.
- **Data:** everything a student saves stays in `localStorage`, under versioned keys, and every read is validated. Demo data lives in `sessionStorage`. A backup file (format `campuskit-progress` v1) moves progress between browsers.

## 2. Audit findings

| Area                     | What the code does today                                                                                 | Gap against the 6.0 brief                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Workspace                | "My projects" lists catalog projects that have saved progress (checklist, viva, report, rehearsal)       | No projects of the student's own: no status, tags, notes, milestones, deadlines, timeline, favourites, duplication or archive |
| Navigation               | Header with 7 items, a project search box, breadcrumbs                                                   | No command palette, no keyboard shortcut list, no recently visited pages                                                      |
| Dashboard and onboarding | The home page is a product page                                                                          | No personal dashboard, profile, preferences or first-run guide                                                                |
| Viva                     | Quick, topic, mixed, review and spaced modes, with self-rating on four criteria                          | No practice history or statistics, weak-topic view, timed mock viva or revision report                                        |
| Documentation            | Report builder with Markdown, .docx and print exports                                                    | No README generator, viva sheet or lab report for the student's own project                                                   |
| Offline                  | None: nothing works without a connection                                                                 | Service worker, offline indicator and cached app shell are missing                                                            |
| Internationalisation     | English strings in components                                                                            | No i18n layer, no Hindi                                                                                                       |
| AI                       | None, by design                                                                                          | Optional, consented assistant missing                                                                                         |
| Templates                | 4, each complete and verified; adding one means editing `registry.ts` (one import)                       | No AI or computer-science templates                                                                                           |
| Design system            | Button, Dialog, Field, Badge, Callout, EmptyState, Meter, Skeleton; demo tables use shared class strings | No Toast, Tooltip, Card or Table primitives                                                                                   |
| QA                       | CI: checks on Node 24 and 22, Chromium e2e, generated projects on 3 OSes                                 | Firefox and WebKit not in CI; Lighthouse never measured                                                                       |
| Debt                     | The demo feature is about 10,000 lines (four demos); no TODO or FIXME markers                            | Acceptable. Splitting it would bring risk without user value now                                                              |

## 3. Principles for this release

- Every visible control works; no placeholder buttons.
- Everything a student saves is validated on read; anything unreadable is kept aside for recovery, never silently dropped.
- Nothing leaves the browser without the student's explicit, per-request consent (AI), and the site works fully without AI and offline for saved work.
- No new runtime dependencies unless one removes real work; none so far.
- Each milestone ships with tests and is recorded below with real results.

## 4. Milestones, in priority order

| #   | Milestone                           | Acceptance criteria                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | **Workspace 2.0**: student projects | Create, edit, duplicate, archive, restore and permanently delete projects (with confirmation). Category, tags, status, stack, favourite, notes, milestones with due dates, activity timeline. Search, filter and sort. Project detail page. Included in backups (format v2, with a tested migration from v1). Unreadable data is kept aside and offered for download. Unit, page and e2e tests |
| M2  | **Command palette and navigation**  | Ctrl/Cmd+K opens a palette of pages, catalog projects, the student's projects and docs, fully keyboard operable (combobox pattern). Recently visited pages. A keyboard shortcut list. Tests and axe                                                                                                                                                                                            |
| M3  | **Dashboard**                       | `/dashboard` with real figures only: projects created, in progress and done, upcoming deadlines, recently visited pages, viva progress across projects, recent activity and quick actions. Empty states for a new student                                                                                                                                                                      |
| M4  | **Onboarding and profile**          | Skippable first-run guide: name (optional), level, technology preferences, recommended templates by rule, optional sample project. Editable later in Settings. Stored locally and included in backups                                                                                                                                                                                          |
| M5  | **Viva engine 2.0**                 | A practice log (date, question, outcome), statistics and history, weak topics by category, a timed mock viva across topics, and a revision report (print or .docx). Mastery is never claimed from views, only from the student's own ratings                                                                                                                                                   |
| M6  | **Offline (PWA)**                   | Web app manifest, service worker built from the real asset list, app shell cached, cache replaced by build version, online/offline indicator. Saved work, the dashboard and viva revision usable offline. Never caches third-party responses. Tested with an offline browser context                                                                                                           |
| M7  | **Documentation studio**            | README and viva preparation sheet for a student project, from its own data, with preview, warnings for missing parts, and .docx and print export. The existing report builder unchanged                                                                                                                                                                                                        |
| M8  | **Optional AI assistant**           | Provider abstraction, with the Anthropic API as the provider (a local server is deferred, see section 5). Key held in memory for the tab only, unless the student chooses otherwise. A consent dialog that shows the exact text before each request. Usage counter and limits; offline fallback to the learning guide. Tests with a mocked network. Nothing is sent without consent            |
| M9  | **Internationalisation**            | A typed message catalog with English and Hindi for the site chrome, navigation, palette, dashboard, workspace and onboarding. Language choice remembered. Content pages stay English and say so. Layout tested in Hindi                                                                                                                                                                        |
| M10 | **Design system additions**         | Toast, Tooltip and Card primitives, used by the new features                                                                                                                                                                                                                                                                                                                                   |
| M11 | **QA and release**                  | Firefox and WebKit e2e in CI, measured Lighthouse scores, QA_REPORT.md, SECURITY_REVIEW.md, RELEASE_NOTES.md, a readiness matrix, and a versioned package                                                                                                                                                                                                                                      |

## 5. Deferred, with reasons

- **New templates (Next.js, MERN, Django, FastAPI, ML, RAG, OS or network labs):** each needs a working app, tests, docs, a learning guide and verification on three systems. The Flask template alone was about a third of 5.0. Rushed templates would break the "no superficial templates" rule, so none is added unless the higher milestones finish with time to spare.
- **Background sync:** CampusKit has no server to sync with, and adding one only for sync would break the privacy-first design. Offline means the whole app works locally.
- **Accounts and a backend:** no product requirement justifies them. Data stays on the student's device.
- **A second AI provider (a local model server):** the provider interface allows one, but each student would have to configure CORS on their own server, and the policy would need `connect-src` for localhost. Only one provider is shipped, tested end to end.

## 6. Progress

Recorded as each milestone finishes, with the commands that were run.

### M1 Workspace 2.0: done (31 Oct)

- `lib/workspace.ts`:
  - student projects with title, description, category, status, tags, stack, template link, favourite, pin, notes, milestones with due dates, resources (http and https only) and an activity timeline;
  - pure operations, a shared store (`useSyncExternalStore`) that syncs across tabs;
  - limits (200 projects, sizes per field);
  - unreadable entries kept under `campuskit:workspace-recovery:v1`, never dropped.
- UI:
  - the Projects section on My projects (search, status, category, tag, sort, favourites, archive);
  - `/my-projects/:projectId` (overview, quick status, milestones, notes saved as you type, links, timeline, edit, duplicate, archive, restore, delete for good only from the archive and after a confirmation);
  - a recovery notice with download.
- Backups: format version 2 with `workspace`. A v1 file is read through `MIGRATIONS[1]`. Restore merges projects by id and shows added, replaced and older-copy counts first. Projects only in this browser are kept.
- Design system: `Toast` (`notify()`, polite and assertive live regions, pauses on hover and focus) and a `font` option on `TextareaField`.
- Tests: `workspace.test.ts` 17, backup 26 (9 new), `ProjectsWorkspace.test.tsx` 8, My projects 7. e2e: create, track, reload and backup journey; axe on the dialog, the populated list and the detail page in both themes, desktop and mobile. All passing.

### M2 Command palette and navigation: done (31 Oct)

- Ctrl+K or ⌘K, or the header button, opens "Go to anything": recent pages, actions (new project, themes, shortcuts), pages, the student's projects, every template's page, demo, learning studio and viva, and every document.
- ARIA combobox pattern: focus stays in the text box, `aria-activedescendant`, arrows, Enter and Esc, with a live result count. Ranking: every word must match; label prefix, then label substring, then all words in the label, then keyword matches. A page is listed once.
- `?` opens the keyboard shortcut list (not while typing).
- Recently visited pages (`lib/recent.ts`, 8 entries), recorded by `useDocumentTitle`. "Not found" pages are excluded.
- Header: navigation labels no longer wrap at 1024 px (checked in screenshots at 1024 and 1280).
- Tests: `commands.test.ts` 8, palette page tests 5. e2e: keyboard-only navigation through the palette, and axe on the palette and shortcut list in both themes, desktop and mobile.

### M3 Dashboard: done (31 Oct)

- `/dashboard` shows only real figures: projects (and archived), in progress, done, deadlines in 14 days and overdue; upcoming deadlines; recent activity across projects; quick actions; recently visited pages; viva practice per template with questions due for spaced review. Empty states throughout.
- Tests: 3 page tests; axe on the page.

### M4 Onboarding and settings: done (31 Oct)

- `lib/profile.ts`: an optional name, level and interests, and `onboarded`, saved in this browser. Template recommendations by written rules, shown with their reasons. Included in backups (optional `profile`, validated).
- `/welcome`: three skippable steps, and an optional sample project (labelled "Sample:", with a checklist of steps to do, never results). Offered on the dashboard until finished or put off.
- `/settings`: profile, theme, reopen the guide, and delete every `campuskit:` value in this browser after a confirmation (other sites' data untouched).
- Tests: 5 profile unit tests, 5 onboarding and settings page tests; axe on both pages.

### M5 Viva engine 2.0: done (31 Oct)

- `lib/viva-log.ts`: a log of ratings (question, outcome, day, mock or not), never answers, capped at 3,000 entries.
- Mock viva mode: 8 questions taken from each topic in turn, the ones that need work first. A 2-minute countdown per answer is information only (WCAG 2.2.1): it announces once at zero, submits nothing, and can be hidden.
- `/viva/progress`: totals, a 14-day table, and per template the topics (practised, confident, needs work), weak topics and questions below confident, with a link to review the due ones.
- Weak topic: at least half of a topic's practised questions are below confident. Never-practised topics are listed apart, not as weak.
- Revision report (`features/viva/report.ts`) as .md or .docx.
- Tests: 3 logic, 3 report and log, 3 page tests. e2e axe on the mock viva and the progress page in both themes, desktop and mobile.

### M6 Offline (PWA): done (31 Oct)

- `public/manifest.webmanifest` with 192 and 512 px icons and a maskable icon, rendered from the favicon.
- `src/sw/service-worker.js`, filled by `vite-plugins/service-worker.ts` with this build's files and a content-derived version:
  - the app shell is precached (about 2.5 MB of JS, CSS and woff2);
  - navigations are network-first with an offline fallback;
  - hashed assets are cache-first, other same-origin GETs stale-while-revalidate;
  - only same-origin GETs are handled, nothing else is stored;
  - old caches and versioned files are pruned on activation.
- Updates wait, and a toast offers "Reload to update". An offline notice explains what works. Settings can store every template for offline generation.
- Bug found by the offline browser test and fixed: module scripts are requested with an `Origin` header, and a server answering `Vary: Origin` made every cached script miss. Stored copies now match with `ignoreVary`.
- Tests: `tests/service-worker.test.ts` 2. e2e (desktop and mobile): create a project online, go offline, then the dashboard, the project (adding a milestone) and viva practice all work; the manifest, icons and worker are served.
- Full e2e after M6: 285 passed and 7 skipped; 6 failures were old labels in specs, now fixed and passing.

### M8 Optional AI assistant: done (31 Oct)

- `/assistant` (palette entry, footer link). Six tasks:
  - explain a template's architecture (from its learning guide);
  - explain pasted code;
  - viva questions for a template or one of the student's projects;
  - explain an error;
  - a learning plan;
  - documentation review.
- `features/assistant/prompts.ts`: every system prompt says to work only from the material given, to say when something is missing, and never to invent features, results, numbers or citations. Pasted text is capped at 12,000 characters.
- `lib/ai.ts`:
  - an `AiProvider` interface; the Anthropic provider uses the official `@anthropic-ai/sdk` (1.3.0, exact), loaded only when a request is sent;
  - request: `claude-opus-5-5`, adaptive thinking, effort medium, streaming, `max_tokens` 16,000;
  - server-side refusal fallback on (`fallbacks: 'default'` with the `server-side-fallback-2026-07-01` beta);
  - typed SDK errors mapped to plain messages; refusals and cut-off answers reported;
  - Stop aborts the request.
- Key: the student's own, kept in memory, or in sessionStorage for the tab if they tick the box. Never in localStorage, backups or code. Settings' "delete everything" forgets it.
- Consent: every request opens a review showing the provider, endpoint, model and the exact system and user text. Nothing is sent before "Send". Your name, other projects and progress are never included. For a student's project, only the fields listed on the form are sent.
- Limit: 20 requests per tab by default (1–100, saved). Offline, without a key, or at the limit, Send is disabled and the reason shown. A "Without AI" panel links the human-written guides.
- Answers are labelled "Written by AI", never saved, and can be downloaded as .md with that label.
- CSP `connect-src` now allows `https://api.anthropic.com` only. The SDK chunk (352 kB, 79 kB gzipped) is left out of the service worker's precache (`onlineOnlyChunks`), so visitors who never use the assistant don't download it.
- Tests: prompts 3, `lib/ai` 4, page 5, CSP 2, service worker +1, settings +1 assertion.
- e2e (desktop and mobile): the real SDK in the browser against a mocked API stream. It checks:
  - nothing is sent before consent;
  - the bearer key, the beta header, the model, `fallbacks` and `effort` sent;
  - the exact reviewed code is in the request body;
  - the streamed answer renders;
  - the key is not in localStorage;
  - axe on the review dialog and the answer.

  Found and fixed: answer headings skipped a level. `/assistant` is added to the full-page axe sweep.

- Not verified: a request to the live API (no key is available here).

### M7 Documentation studio: done (31 Oct)

- `/my-projects/:projectId/docs`, linked as "README and viva sheet" from the project page. The 5.0 report builder is unchanged.
- `features/workspace/project-docs.ts`:
  - **README**: description, status and milestone count, technology, features, getting started, tests, roadmap (task list), known limitations and links.
  - **Viva preparation sheet**: an introduction, what to be ready to explain (one prompt per technology), what's done and what's left, the student's notes, and the linked template's questions with the student's own ratings ("not practised yet" when unrated). The sheet never includes model answers and never claims mastery.
- Nothing is made up. A part with no details is marked "_To write: …_" in the document and listed as "still to write" above the preview. Content from a linked template is labelled as the template's.
- Downloads: Word (.docx, task lists as ☑/☐), Markdown, and print or save as PDF (`components/PrintDocument.tsx`, the report builder's print mode as a shared helper).
- Found and fixed:
  - Task lists in `MarkdownView` rendered unlabelled checkboxes (axe "label"); they're now a symbol named "Done" or "Not done".
  - `workspaceStore.reload()` read storage at once, so a test that seeded storage after another test's reset saw an empty workspace; it now reads on next access, as `profileStore` does.
- Tests: builders 4, page 4, MarkdownView +1. e2e axe on both previews in both themes, desktop and mobile.
- `pnpm check` after M7 and M8: validate, format, lint, typecheck, 687 tests in 74 files, and build, all passing.

### M9 Internationalisation: partly done (31 Oct)

- `lib/i18n.ts` and `src/i18n/en.ts`, `src/i18n/hi.ts`:
  - a typed catalog; TypeScript rejects a Hindi file missing any English key, and a test checks every message keeps the same `{placeholders}`;
  - the choice is saved under `campuskit:locale:v1` and set in Settings → Language;
  - `<html lang>` follows the choice.
- Translated: the header, mobile menu, skip link, theme switch, footer, offline notice, notification labels, command palette (title, search, groups, counts, empty state, help), keyboard shortcut list, dashboard and the language setting.
- Not translated yet, and said so in Settings and in the Hindi footer: workspace pages, onboarding, settings apart from the language section, template guides, viva questions, demos and documentation. Palette entries (page and template names) are still English.
- Screen readers: when the menus are in Hindi, `<main>` is marked `lang="en"` because its pages are English. The dashboard and the language section mark `lang="hi"`. Toast messages and timeline entries (written in English) are marked `lang="en"`.
- The Hindi text was drafted with AI help and has not been reviewed by a native speaker. Settings says so, and asks for issues.
- Tests: 5 (catalog completeness and placeholders, interpolation, a hand-edited setting, switching in Settings, palette in Hindi). e2e: dashboard, settings and gallery in Hindi on desktop and mobile with no horizontal scroll and no axe violations; palette opens in Hindi. Screenshots at 1024 and 1280 px: the Hindi header fits.

### M10 Design system additions: partly done

- Toast: done (M1), used by the workspace, assistant, settings and updates.
- Tooltip and Card primitives: not added. New pages share one `card` class string per file, and the header button uses a native `title` tooltip alongside its accessible name. A shared Card component would touch every page, so it's left for a later release.

### M11 QA and release: done for a release candidate (31 Oct)

- Version 6.0.0-rc.1. Results are in `QA_REPORT.md`, `BUILD_STATUS.md` and `SECURITY_REVIEW.md`; the user-facing summary is in `RELEASE_NOTES.md`; the readiness matrix is in `QA_REPORT.md`.
- `pnpm check`: 694 tests in 76 files. e2e:
  - Chromium desktop and phone: 309 passed, 7 skipped by design;
  - WebKit: 155 passed, 3 skipped;
  - Firefox: 155 passed, 3 skipped.
- Template verification 8 of 8, smoke 10 of 10. The clean copy of the ZIP passes `pnpm check` on macOS and Linux.
- Lighthouse was measured. Fixes from it: a loading placeholder at least one screen tall (layout shift 0.2 → 0) and `robots.txt`.
- Firefox and WebKit: opt-in Playwright projects and an `e2e-browsers` CI job. They found:
  - the Firefox `online` event gap, now fixed in the app;
  - the WebKit service-worker routing bypass and font cancellation, fixed in the tests.
- Package: `~/Downloads/campuskit-6.0.0-rc.zip`. The 5.0 package is untouched.
