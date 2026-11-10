# Testing with a screen reader

CampusKit's automated checks catch a lot, but not everything a screen-reader user meets. This guide explains what is already tested automatically and gives short manual scripts for VoiceOver on a Mac, VoiceOver on an iPhone and NVDA on Windows.

**No screen reader has been used on CampusKit yet.** The scripts below say what _should_ happen, based on the markup. When you run one, record what actually happened, the date and your versions in the pull request or an issue.

## What the automated checks cover

- **axe-core** runs in a real browser on 27 pages, in both colour themes, with every WCAG 2.2 A and AA rule and the best-practice rules (`apps/web/e2e/accessibility.spec.ts`). That covers names, labels, contrast, landmarks, heading order and duplicate IDs. Dialogs are scanned open.
- **Role-based tests** find controls the way assistive technology does: by role, accessible name and description. For example, a delete confirmation must be an `alertdialog` whose description says what else is deleted.
- **Keyboard tests** in Chromium, Firefox and WebKit:
  - the skip link;
  - focus after navigation, after deleting a row, after removing a filter and after closing a dialog;
  - tabs with the arrow keys;
  - slides with the arrow keys and Escape.
- **Layout sweeps** at 320 px to 1920 px, also with WCAG 1.4.12 text spacing.

They can't tell whether an announcement makes sense when you hear it, whether its order is confusing, or whether a long page is tiring to move through.

## Before you start

- Use a fresh browser profile, or clear CampusKit's site data, so earlier progress doesn't change what you hear.
- Turn on the screen reader before opening the site.
- Test the published site, or `pnpm build && pnpm preview`, rather than the development server.

| Screen reader      | Browser           | Turn on and off                      | Next item      | Headings menu                     |
| ------------------ | ----------------- | ------------------------------------ | -------------- | --------------------------------- |
| VoiceOver (macOS)  | Safari            | Command-F5                           | VO-Right Arrow | VO-U, then Left/Right to Headings |
| VoiceOver (iPhone) | Safari            | Settings → Accessibility → VoiceOver | Swipe right    | Rotor (two-finger turn): Headings |
| NVDA (Windows)     | Firefox or Chrome | Control-Alt-N; Insert-Q to quit      | Down Arrow     | H, or Insert-F7 for the list      |

On a Mac, also turn on Safari → Settings → Advanced → “Press Tab to highlight each item on a webpage”. Otherwise Tab skips links and buttons (Option-Tab still reaches them).

## Scripts

Run each script, and note anything that differs from **Expect**.

### 1. Find a project

1. Open the home page. Open the headings list.
   - **Expect:** one level-1 heading, “Explore it. Build it. Understand it. Demonstrate it.”, then section headings in order.
2. Use the skip link: the first thing on the page.
   - **Expect:** “Skip to content”, then focus in the main content.
3. Go to **Projects** in the main navigation. Type “budget” in **Search**.
   - **Expect:** the result count is announced, for example “Showing 1 of 3 projects”.
4. Tick a filter, then remove it from the active filters.
   - **Expect:** focus moves to the next filter, or to the result count, and isn't lost.

### 2. Generate a project

1. On a project page, choose **Customize and download**.
   - **Expect:** the step heading “Name your project” and the stepper's current step.
2. Clear **Project name** and choose **Continue to options**.
   - **Expect:** focus returns to **Project name**, which is announced as invalid, with its error.
3. Finish the steps and choose **Generate ZIP**.
   - **Expect:** focus moves to “… is ready”, and the download starts.

### 3. Use a demo

1. Open **Try the interactive demo** on the attendance system.
   - **Expect:** the demo region “Student Attendance System demo”, and a tab list where the arrow keys move between screens.
2. Choose a student's delete button.
   - **Expect:** an alert dialog, “Delete … ?”, that reads its explanation: how many attendance marks are deleted too.
3. Confirm the deletion.
   - **Expect:** “Deleted … and their attendance history.” is announced, and focus is on the next student's delete button.
4. Open a chart's **Table view**.
   - **Expect:** the button names its chart, for example “Table view of Attendance by class”, is announced as pressed, and the table follows it.

### 4. Practise the viva

1. Open **Practise viva questions** and **Start quick practice**.
   - **Expect:** focus on the question's heading.
2. Choose **I don’t know yet: show the answer**.
   - **Expect:** focus moves to the answer.
3. Rate the four criteria (each a group of radio buttons) and **Save rating and continue**.
   - **Expect:** the next question's heading.

### 5. Present and check readiness

1. Open **Present the project**. Press the Right Arrow, then Escape.
   - **Expect:** each slide's heading when it changes; Escape returns to the project page.
2. Open **Check your readiness**. Tick **I’ve done this on my computer** on an item.
   - **Expect:** the checkbox state, then “Your readiness is now …%: … of … items.”
3. Choose **Clear my confirmations**.
   - **Expect:** an alert dialog that reads what will be cleared.

## Reporting

Note the screen reader and its version, the browser and its version, the operating system, the page and the step. Write down what you heard, word for word, and what you expected. Issues found this way are as important as any failing test.
