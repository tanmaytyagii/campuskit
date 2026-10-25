# CampusKit 4.0: progress log

This file records the state of the CampusKit 4.0 work so it can be resumed. Nothing here is a claim that a check passed unless the result is listed. The release notes are in [CHANGELOG.md](CHANGELOG.md) and the full check report in [BUILD_STATUS.md](BUILD_STATUS.md).

## State: complete, audited and hardened, not committed (25 October 2026)

The 4.0.0 work is finished in this working copy. Three packages exist, and none was overwritten:

- `~/Downloads/campuskit-4.0.0.zip`: the first package.
- `~/Downloads/campuskit-4.0.0-audited.zip`: after the release audit.
- `~/Downloads/campuskit-4.0.0-qa-rc.zip`: after the hardening pass, as a QA release candidate.

The version stays 4.0.0, because 4.0.0 was never published and the pass only fixes things. Nothing was committed, pushed or deployed: the maintainer reviews and publishes it. BUILD_STATUS.md has the hardening pass's results.

### Release audit (24 October 2026)

- **Node.js:** the real minimum is 22.18. Node.js 22.12 couldn't build or test (TypeScript workspace packages); this was found in a clean Linux container and verified on 22.18.0.
- **CI:**
  - job time limits;
  - `main` runs are no longer cancelled;
  - `pnpm/action-setup` pinned to a commit;
  - a Node.js 22.18 job;
  - flaky tests annotated, and the Playwright report kept;
  - least-privilege Pages deployment;
  - tested `verify:generated` reporting, working in the real temporary-folder path.
- **Generator focus failure:** the root cause was confirmed by a deterministic test. Focus moves in layout effects (generator, layout, learning studio, presentation).
- **Dialogs:** a removed dialog now returns focus to its opener.
- **Analyzer port:** `pnpm demo:compare` found differences; they're fixed, each with a fixture case. pandas 3 (what students install) is the reference.
- **Templates:**
  - expense tracker 1.0.1 (an amount just over the limit made saved data unreadable);
  - result analyzer 1.0.1 (a crash on duplicate non-ASCII column names).
  - Both were verified again and recorded on macOS.

### Hardening pass (24–25 October 2026)

A second QA pass on top of the audited working copy. Nothing is committed, and the version stays 4.0.0.

- **Done:**
  - Focus after deleting a row (attendance students, expense transactions): it moves to the next row's delete button, or to the empty-state heading or the filter reset button. Unit tests cover first, middle and last rows; an e2e test covers keyboard use.
  - Focus after removing a gallery filter chip: it moves to the next chip, or to the result count.
  - `Dialog` opens and closes in a layout effect, so focus placed by the page after closing isn't blocked by the modal's inert page.
  - WebKit keyboard tests press Option-Tab (`nextKey()` in `e2e/fixtures.ts`), which Safari users press to reach links and buttons.
  - `verify:generated` (Windows CI failure, cause still unknown):
    - a failed Streamlit health check now includes the end of the app's output;
    - each try has a 5-second limit;
    - a crash by signal ends the wait at once;
    - on Windows, the app's whole process tree is stopped with `taskkill /T`.
    - The process helpers are in `scripts/lib/processes.ts`, with tests in `tests/processes.test.ts`. The Windows path is untested.
  - Screen readers: each chart's "Table view" button names its chart. Confirmation dialogs are `alertdialog`s whose text is their description.
  - **Expense tracker 1.0.2 and attendance system 1.0.1:**
    - one bad saved record no longer hides all the others (`recoverData`);
    - an earlier backup copy is never replaced;
    - a refused backup copy no longer crashes the app, and then nothing is saved over the data.
    - The learning guides and template docs were updated, and both templates were re-recorded on macOS (48 and 39 tests).
  - **Result analyzer 1.0.2:** a file where nobody has a score showed "nan%" in the Overview metric, the explanation and the report. It now says there is no average. Re-recorded on macOS (51 tests, Streamlit health check).
  - Expense README: money limits documented.
  - **Analyzer parity:**
    - The earlier comparisons (and the 4.0 audit's) used a Python with pandas but no PyArrow. Students always have PyArrow, because Streamlit installs it.
    - With PyArrow, pandas 3.1 matches names with RE2 when the column is all ASCII. RE2 treats U+000B and U+001C–U+001F differently from Python's `re`.
    - The port now follows pandas' rule. `analyzer_parity.py` refuses to run without PyArrow and records its version.
    - `demo:compare --shapes` adds shaped files, and 6 fixture cases were added.
    - Result with pandas 3.1.0 and PyArrow 26.0.0: 29,700 generated files, 0 differences.
- **Unit tests:** 438 passed in 52 files (`pnpm test`), before the analyzer changes.
- **Checked:**
  - Playwright WebKit 27.2, full suite: 110 passed and 3 skipped, twice. An earlier run had 1 failure ("switching templates keeps the name…"). That failure happened once, on the first run after installing WebKit, with the disk full. It didn't come back in 80 reruns of the same steps: 2 full suites; 28 on their own; 10 under CPU load; and 40 with random network delays. The cause isn't known, so it isn't counted as fixed.
  - Playwright Firefox 157, full suite: 110 passed and 3 skipped.
  - Overflow sweep, 44 routes at 7 widths: no sideways scrolling in WebKit or in Firefox.
  - These are Playwright's builds, not Safari or Firefox as released.
- **Final gate (25 October, final code):**
  - `pnpm check`: passes on Node.js 24.12.0 and on 22.18.0 (444 tests).
  - `pnpm test`: 3 of 3 runs passed.
  - Chromium e2e: 3 of 3 runs passed (227 passed, 7 skipped).
  - WebKit: 2 of 2 runs passed (114 passed, 3 skipped).
  - Firefox:
    - Run 1 had 5 timeouts because the Mac went into idle sleep mid-run. The power log shows sleep from 01:24:11 to 01:39:11, and the trace shows an 898-second freeze.
    - Run 2 passed (114 passed, 3 skipped).
    - Later long runs use `caffeinate -i`.
  - `verify:generated`: 6 of 6.
  - Earlier in the pass: actionlint, the audits, `git diff --check` and the invisible-character scan, all clean.
- **Finished after that:**
  - the analyzer was re-verified and recorded (51 tests);
  - WebKit and Firefox sweeps, normal and with text spacing, were clean;
  - the browser builds and the temporary config were removed;
  - clean copies of the package passed `pnpm install --frozen-lockfile` and `pnpm check` on macOS and in `node:24-slim` (Linux arm64);
  - BUILD_STATUS and CHANGELOG were updated.

## Starting point

- `main` was at `ad52b02`. That second commit titled “CampusKit 3.1.0” also contains the first, unfinished 4.0 files. They weren't used by any page yet, so the site still behaved as 3.1.0, but CI failed at `pnpm format:check` because they weren't formatted.
- Baseline on the real 3.1.0 commit `b5f11ee` (a clean export, run on macOS on 24 October 2026):
  - `pnpm install --frozen-lockfile` passed.
  - `pnpm check` passed: validate, format, lint, type check, 319 unit tests in 40 files and the build.
  - `pnpm test:e2e`: 149 passed, 3 skipped by design.
- GitHub Actions: everything passes for `b5f11ee` except “Generated projects (windows-latest)”. Its log needs a signed-in account with access, so the cause is unknown. That step ran about 283 s against about 93 s on Linux and macOS. This fits two 90-second Streamlit health-check timeouts, but is not proof.

## Done

- **Windows CI diagnostics.**
  - `scripts/verify-generated-projects.ts` writes each failure, including a failed Python check, as a GitHub annotation and adds a results table to the job summary. Both are public on the run page.
  - The workflow keeps the full output as an artifact when the job fails.
  - Streamlit is started and health-checked on 127.0.0.1.
- **Demo Studio** (`apps/web/src/features/demo/`, `/projects/<slug>/demo`, `/demos`):
  - three demos, a tour and a guided demo with checks and a rehearsal record;
  - notes on the code behind each screen, and reset to the example;
  - the analyzer port is compared with the real Python output (`pnpm demo:fixtures`, 11 cases).
- **Presentation mode** (`apps/web/src/features/presentation/`, `/projects/<slug>/present`): slides built from the manifest, learning guide and demo, with source labels, speaking notes and the live demo.
- **Readiness check** (`apps/web/src/features/readiness/`, `/projects/<slug>/ready`): eleven items with evidence, three kinds, a documented score and next actions.
- **Integration:**
  - project page journey and demo section;
  - card links, gallery search fields, home page tour stop and tagline;
  - generator next steps;
  - learning links (`?component=`, `?questions=`, “Selected questions” in viva practice).
- **Fixes from testing:** see “Found and fixed during the checks” in BUILD_STATUS.md.
- **Screenshots:** four new README screenshots; the home page tour has a Demonstrate stop.
- **Documentation:**
  - new: `docs/demo-studio.md` and `docs/guides/present-your-project.md`;
  - updated: README, architecture, design system, deployment, CONTRIBUTING, CHANGELOG and BUILD_STATUS;
  - versions bumped to 4.0.0.

## Results (24 October 2026, macOS 26.2 arm64, Node.js 24.12.0)

| Command                   | Result                                                                      |
| ------------------------- | --------------------------------------------------------------------------- |
| `pnpm check`              | Passed; 406 unit tests in 49 files                                          |
| `pnpm test:e2e`           | 218 passed, 6 skipped by design                                             |
| `pnpm verify:generated`   | 6 of 6 generated projects verified (Python 3.11.7 from python.org)          |
| `pnpm demo:fixtures`      | Same data as the committed fixture                                          |
| Overflow sweep (one-off)  | No sideways scrolling on 43 routes at 7 widths                              |
| Release ZIP, clean folder | `pnpm install --frozen-lockfile` and `pnpm check` passed (see BUILD_STATUS) |

## Commands used

```bash
npx -y pnpm@10.34.7 check
npx -y pnpm@10.34.7 test:e2e
CAMPUSKIT_PYTHON=/Library/Frameworks/Python.framework/Versions/3.11/bin/python3 npx -y pnpm@10.34.7 verify:generated
CAMPUSKIT_PYTHON=/Library/Frameworks/Python.framework/Versions/3.11/bin/python3 npx -y pnpm@10.34.7 demo:fixtures
npx -y pnpm@10.34.7 build && npx -y pnpm@10.34.7 screenshots web && npx -y pnpm@10.34.7 build
```

## Open items for the maintainer

1. Review the changes, then commit and push them. CI should pass `format:check` again.
2. If “Generated projects (windows-latest)” still fails after the push, read its annotations or job summary, or download the `verify-generated-windows-latest` artifact. They now contain the failing step's output.
3. Enable GitHub Pages: Settings → Pages → Source: GitHub Actions, then rerun “Deploy to GitHub Pages”.

## Next action

None in this working copy. Resume from the open items above after the push.
