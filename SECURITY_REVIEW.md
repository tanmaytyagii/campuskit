# Security review: CampusKit 6.0.0-rc.1

Reviewed on 31 October 2026. Scope: what changed since 5.0.0-rc.1 (the workspace, backups v2, onboarding and settings, the command palette, the viva log, the service worker, the AI assistant, the documentation studio and i18n), and the site-wide controls that protect it. The template applications were reviewed for 5.0 and haven't changed since. The policy for reporting a problem is in `SECURITY.md`.

## Summary

CampusKit is still a static site with no server and no accounts. Everything a student enters stays in their browser's storage. The only new path off the device is the optional AI assistant, and it runs only after three conditions are met: the student adds their own API key, reviews the exact text, and presses Send. No high or critical issue is open. The residual risks below are accepted for a release candidate and listed so they can be revisited.

## What is stored, and where

All keys start with `campuskit:`. Settings → "Delete all CampusKit data in this browser" removes every one of them from localStorage and sessionStorage. It leaves other sites' data alone and forgets an AI key held in memory.

| Key                                                             | Storage         | Holds                                                                                 | In backups |
| --------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------- | ---------- |
| `workspace:v1`                                                  | local           | The student's projects (title, description, notes, milestones, links, timeline)       | Yes        |
| `workspace-recovery:v1`                                         | local           | Saved entries that couldn't be read, kept for the student to download or delete       | No         |
| `profile:v1`                                                    | local           | Optional first name, level, interests, whether the welcome guide was seen             | Yes        |
| `checklist`, `viva`, `demo`, `report`, `readiness`, `rehearsal` | local           | Per-template progress (from 5.0); viva entries hold ratings only, never typed answers | Yes        |
| `viva-log:v1`                                                   | local           | Rating outcomes by day (question id, outcome, date, mock or not), capped at 3,000     | No         |
| `recent:v1`                                                     | local           | The last 8 page paths and titles visited in CampusKit                                 | No         |
| `locale:v1`                                                     | local           | `"en"` or `"hi"`                                                                      | No         |
| `ai-settings:v1`                                                | local           | The request limit (a number from 1 to 100)                                            | No         |
| `ai-usage:v1`                                                   | session         | Requests sent from this tab                                                           | No         |
| `ai-key:v1`                                                     | session, opt-in | The student's API key, only when they tick "Keep it until I close this tab"           | **Never**  |

Every value is validated when it is read. A value that fails validation is ignored, or for the workspace kept aside for recovery; it never crashes a page.

## Controls reviewed

### Content Security Policy

`vite-plugins/content-security-policy.ts`, as a meta tag:

- `default-src 'self'`;
- `script-src 'self'` plus one hashed inline script;
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`;
- `img-src 'self' data: blob:`;
- `connect-src 'self' https://api.anthropic.com`.

The Anthropic origin is the only addition in 6.0. `tests/content-security-policy.test.ts` pins `connect-src` and `script-src`. The end-to-end fixture fails any test that triggers a CSP violation.

### AI assistant (`lib/ai.ts`, `features/assistant`)

- **Key handling:**
  - CampusKit ships no key, and the secret scanner in `scripts/check-repo.ts` fails the build on anything that looks like one. Test keys are deliberately too short to match it.
  - The student's key is held in a module variable, or in sessionStorage if they opt in. It is never written to localStorage or a backup; a unit test and an end-to-end test check that.
- **Consent:**
  - Each request opens a review showing the provider, endpoint, model and the exact system prompt and material.
  - The request is built before the review and sent unchanged afterwards. Page tests assert nothing is sent before Send, and cancelling sends and counts nothing.
- **Data minimisation:** the student's name, profile, other projects and progress are never included. For a student's project, the form lists which fields are sent: title, description, status, technology, milestones and notes, but not tags, links or the timeline. Pasted text is capped at 12,000 characters, and the form asks the student to remove passwords, keys and personal details first.
- **Limits:** 20 requests per tab by default, adjustable from 1 to 100. Requests are counted before sending.
- **Output handling:**
  - Answers render through `MarkdownView`, which doesn't render raw HTML and lets react-markdown strip dangerous URLs.
  - Images in an answer can't load, because `img-src` allows only the site.
  - Answers are labelled "Written by AI", never stored, and downloaded only when the student asks.
- **Transport:** HTTPS to `api.anthropic.com` through the official SDK. `dangerouslyAllowBrowser: true` is intended here: the key belongs to the person using the browser, and there is no server to hold it.
- **Failure modes:**
  - typed SDK errors become plain messages (bad key, permission, rate limit, bad request, connection);
  - a refusal or a cut-off answer is reported as such;
  - Stop aborts the request.

### Backups (`lib/backup.ts`)

- A file is parsed and validated whole before anything changes: a size limit, the format version, every project's shape, unique ids, and at most 200 projects.
- Version 1 files are migrated. Files from newer versions are refused with the reason.
- Restore merges by id and shows the counts first. Projects that exist only in this browser are kept.

### Workspace input

- Lengths are limited per field. Link URLs must be `http:` or `https:`, so `javascript:` and `data:` are rejected.
- All text renders as React text nodes. Generated README and viva-sheet Markdown is rendered by `MarkdownView` (no raw HTML) and exported through the existing `.docx` writer, which escapes XML.

### Service worker (`src/sw/service-worker.js`)

- It handles only same-origin GET requests, and stores only `ok`, `basic` responses.
- Navigations go to the network first, so a deployment's new pages are used when online.
- Cross-origin requests, including those to the AI API, pass straight through and are never cached.
- The worker is versioned from the build's file list, and old caches are deleted on activation.

### Dependencies

- `pnpm audit --prod`: **no known vulnerabilities** (31 Oct 2026).
- `pnpm audit`, development tools included: 2 moderate advisories in `minimatch` under `eslint`. It's a development-only tool, never shipped to the site, and an upgrade awaits ESLint.
- New runtime dependency: `@anthropic-ai/sdk` 1.3.0, pinned exactly. It's loaded as a separate chunk only when an AI request is sent, and left out of the offline precache. Its licence (Apache-2.0) and its bundled dependencies are listed in `THIRD_PARTY_NOTICES.md`, and their full texts are shipped in `licenses/third-party.md`.

## Residual risks (accepted for this release candidate)

| Risk                                                                                                                                               | Severity | Mitigation now                                                                                                                  | Possible follow-up                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| A key kept in sessionStorage can be read by any script running on the CampusKit origin                                                             | Low      | Opt-in only; the CSP allows scripts from the site alone; no third-party scripts; the key is cleared when the tab closes         | Default stays "memory only"; could drop the opt-in entirely |
| Pasted text could contain instructions aimed at the model (prompt injection)                                                                       | Low      | The model has no tools and no access to other data; the answer is labelled AI and shown to the same student who pasted the text | None needed while the assistant has no tools                |
| An AI answer could contain a misleading external link                                                                                              | Low      | Answers are labelled "Written by AI"; external links open as ordinary links and can be inspected                                | Render AI answers' links as plain text                      |
| Data in localStorage is readable by anyone with access to the device and browser profile                                                           | Low      | Documented; "Delete all CampusKit data" in Settings; nothing sensitive is requested                                             | None: local storage is the privacy-preserving design        |
| The live Anthropic API was not exercised (no key in the test environment); the request shape is verified against a mocked stream in a real browser | Info     | End-to-end test checks the real SDK's request: headers, model, `fallbacks`, effort and body                                     | One manual request with a real key before the final release |

## How this was checked

- `pnpm check` (catalog validation, the repository check including the secret scan, formatting, lint, typecheck, 692 unit and page tests, build).
- End-to-end tests with the CSP-violation, console-error and failed-request fixture in Chromium (desktop and mobile), WebKit and Firefox. Results are in `QA_REPORT.md`.
- `pnpm audit --prod` and `pnpm audit`.
- Reading the new code paths listed above.
