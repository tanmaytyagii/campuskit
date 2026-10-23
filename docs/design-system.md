# Design system

The website is built from a small set of design tokens and shared components, so every page looks and behaves the same way. There is no separate component library: tokens are CSS custom properties in `apps/web/src/styles/index.css`, exposed to Tailwind CSS through `@theme inline`, and components live in `apps/web/src/components/`.

## Principles

- **Real content first.** Pages show real catalog data, real code and real screenshots. Screenshots are captured from the running site and templates with `pnpm screenshots`, and illustrations say that they are illustrations.
- **One main action per view.** A page or card has at most one primary (filled violet) button. Other actions are secondary buttons or links.
- **Colour is never the only signal.** Every status badge has a written label, the difficulty meter shows its word next to the bars, and an error is described in text as well as coloured.
- **Violet means interactive, lime means a signal.** Violet marks links, buttons, the current page and focus in the light theme. Lime is kept for signals: a verified template, a finished step, keyboard focus in the dark theme. It is never decoration.
- **Fewer boxes.** Group content with spacing, headings and dividers before adding another bordered panel. Panels are for things that act as a unit: a card, a form, a dialog.
- **Calm motion.** Transitions are short and only show a change of state. When the operating system asks for reduced motion, they are turned off.

## Colour

Surfaces are a warm, paper-like neutral in the light theme and navy in the dark theme. Every text colour reaches at least 4.5:1 against every surface in both themes, and control borders reach at least 3:1. `pnpm test:e2e` runs axe with its colour-contrast rule on every page type in both themes.

| Token (Tailwind name)                 | Light     | Dark      | Use                                                    |
| ------------------------------------- | --------- | --------- | ------------------------------------------------------ |
| `canvas`                              | `#f7f6f3` | `#0b1330` | Page background                                        |
| `surface`                             | `#ffffff` | `#111b3d` | Cards, panels, inputs                                  |
| `raised`                              | `#f1f0eb` | `#16224a` | Hover fills, table headers, quiet panels               |
| `line` / `line-strong`                | `#e4e2db` | `#24305e` | Dividers and card borders / stronger dividers          |
| `control`                             | `#8a8780` | `#6573a8` | Borders of inputs and selects (at least 3:1)           |
| `ink` / `ink-2` / `ink-3`             | `#141a33` | `#edf0fa` | Headings and body / secondary text / meta text         |
| `violet` / `violet-hover`             | `#5434e6` | `#a79bff` | Links, primary buttons, current page                   |
| `violet-soft`                         | `#efebff` | `#221e58` | Selected items and icon tiles                          |
| `lime`, `lime-text`, `lime-soft`      | `#c8f23c` | `#c8f23c` | Verified and ready states only                         |
| `danger`, `warn` (with `-soft` fills) | `#c0263f` | `#ff8a9b` | Errors and warnings                                    |
| `inverse` / `on-inverse`              | `#121935` | `#16224a` | The navy closing band on the home page, in both themes |
| `code-bg` / `code-ink`                | `#10172f` | `#070d24` | Code blocks and terminal commands                      |

The table lists the main value of each group; the full set, including `ink-2`, `ink-3`, `line-strong` and the soft fills, is in `index.css`.

## Type

Headings use **Archivo**, a variable font whose width axis gives display headings their wide, confident shape. Code, file names and commands use **IBM Plex Mono**. Both are bundled with the site; nothing is loaded from a font service.

Use these classes instead of choosing sizes by hand:

| Class          | Size                               | Use                                                 |
| -------------- | ---------------------------------- | --------------------------------------------------- |
| `type-display` | 2.4 to 4.25 rem, fluid, 125% width | The home page headline only                         |
| `type-title`   | 2 to 2.75 rem, fluid, 120% width   | Every page's `<h1>`                                 |
| `type-h2`      | 1.4 to 1.75 rem, fluid             | Section headings                                    |
| `type-h3`      | 1.125 rem, bold                    | Card titles and sub-sections                        |
| `type-eyebrow` | 0.75 rem, uppercase, letter-spaced | The short label above a page or section title       |
| `type-lead`    | 1.125 rem, `ink-2`                 | The introduction under a page title                 |
| `type-meta`    | 0.8125 rem, `ink-3`                | Dates, counts, captions and other secondary details |

Body text is 1 rem (16 px) with a line height of 1.6, and long text is kept to about 70 characters per line.

## Shape, spacing and depth

- **Radius:** `rounded-md` (6 px) for badges and chips, `rounded-lg` (8 px) for buttons and inputs, `rounded-xl` (12 px) for cards and panels, `rounded-2xl` (16 px) for large surfaces and dialogs.
- **Spacing:** Tailwind's 4 px scale. Page sections are separated by 48 to 96 px, cards by 16 to 24 px, and the page gutter is 16 px on phones and 24 px from 640 px up (`container-page`, at most 1240 px wide).
- **Shadows:** `shadow-card` is a hairline for resting cards; `shadow-lift` is for hover states, the hero preview and dialogs.

## Motion

Transitions last 160 ms with a soft ease-out curve (`--default-transition-duration`, `--ease-out-soft`). They are used for hover and focus colours, a button moving down 1 px while pressed, dialogs fading in, progress bars filling and the colour theme changing. `prefers-reduced-motion: reduce` turns all of them off, including the theme fade, which is only added in JavaScript when reduced motion is not requested.

## Components

| Component                              | File                                                            | Notes                                                                                  |
| -------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `Button`, `ButtonLink`                 | `components/ui/Button.tsx`                                      | Primary, secondary, ghost and danger variants in three sizes                           |
| `TextField`, `SelectField`, `Checkbox` | `components/ui/Field.tsx`                                       | Label, description and error wired up with `aria-describedby` and `aria-invalid`       |
| `Dialog`                               | `components/ui/Dialog.tsx`                                      | The native `<dialog>`; used to confirm anything that deletes saved work                |
| `Badge`, `StatusBadge`                 | `components/ui/Badge.tsx`, `components/StatusBadge.tsx`         | Status always has a text label                                                         |
| `DifficultyMeter`                      | `components/DifficultyMeter.tsx`                                | One to three bars plus the difficulty's name                                           |
| `Meter`                                | `components/ui/Meter.tsx`                                       | A labelled amount with a decorative bar, inside a `<dl>`                               |
| `PageHeader`, `Breadcrumbs`            | `components/layout/`                                            | Every page starts with the same eyebrow, title and lead; nested pages add breadcrumbs  |
| `ProjectCard`                          | `components/ProjectCard.tsx`                                    | Screenshot, verification status, title, tagline, difficulty and stack                  |
| `CommandBlock`, `MarkdownView`         | `components/ui/CommandBlock.tsx`, `components/MarkdownView.tsx` | Code blocks with a copy button; code stays focusable so it can be scrolled by keyboard |
| `Callout`, `EmptyState`, `Skeleton`    | `components/ui/`                                                | Notes, empty results and loading placeholders                                          |

## Accessibility rules

These are checked by the unit tests (axe in jsdom) and the Playwright tests (axe in Chromium, both themes, desktop and phone):

- Every page has one `<h1>` and headings in order. Landmarks are named when there is more than one of a kind.
- Everything works with a keyboard. Focus is always visible (violet in the light theme, lime in the dark theme), and moves to the new page's content after navigation.
- Tabs, the stepper and the comboboxes follow the ARIA patterns: arrow keys move between tabs, the current step is marked with `aria-current="step"`, and a step with errors says so to screen readers.
- Tap targets are at least 24 by 24 px (WCAG 2.2). Buttons and inputs are 32 px tall in compact places such as cards and 40 to 48 px elsewhere.
- Nothing scrolls sideways at 320 px except tables and code, which scroll inside their own focusable region.

## Changing the design

Change a token in `index.css` rather than writing a new colour in a component, and run `pnpm test:e2e`: it fails if a change breaks contrast, causes sideways scrolling or adds a console error. After a visible change, run `pnpm build` and `pnpm screenshots web` so the README and the home page tour show the new interface.
