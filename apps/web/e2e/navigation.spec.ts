import { expect, hasHorizontalOverflow, isMobile, test } from './fixtures.ts';

const PAGES = [
  { path: '/', heading: 'Build it. Understand it. Present it.' },
  { path: '/projects', heading: 'Projects' },
  { path: '/projects/attendance-system', heading: 'Student Attendance System' },
  { path: '/projects/expense-tracker/docs/architecture', heading: 'Architecture' },
  { path: '/projects/student-result-analyzer/source?file=app.py', heading: 'Source code' },
  { path: '/generate', heading: 'Generate a project' },
  { path: '/learn', heading: 'Learning center' },
  { path: '/learn/report?project=attendance-system', heading: 'Submission workspace' },
  { path: '/viva', heading: 'Viva practice' },
  { path: '/projects/attendance-system/learn', heading: 'Learning studio' },
  { path: '/projects/expense-tracker/learn/architecture', heading: 'Learning studio' },
  { path: '/projects/student-result-analyzer/learn/code', heading: 'Learning studio' },
  { path: '/projects/student-result-analyzer/learn/troubleshooting', heading: 'Learning studio' },
  { path: '/projects/attendance-system/viva', heading: 'Viva practice' },
  {
    path: '/compare?ids=attendance-system,expense-tracker,student-result-analyzer',
    heading: 'Compare projects',
  },
  { path: '/docs', heading: 'Documentation' },
  { path: '/docs/run-a-python-project', heading: 'Run a Python project' },
];

test.describe('every page', () => {
  for (const { path, heading } of PAGES) {
    test(`${path} loads directly, with no errors and no sideways scrolling`, async ({
      page,
    }, testInfo) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
      expect(await hasHorizontalOverflow(page)).toBe(false);
      if (isMobile(testInfo.project.name)) {
        // WCAG 1.4.10 (Reflow): no sideways scrolling at 320 CSS pixels.
        await page.setViewportSize({ width: 320, height: 640 });
        expect(await hasHorizontalOverflow(page)).toBe(false);
        await page.setViewportSize({ width: 360, height: 780 });
      }
      // Every image that is shown has actually loaded.
      for (const image of await page.locator('main img:visible').all()) {
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate(
              (element: HTMLImageElement) => element.complete && element.naturalWidth > 0,
            ),
          )
          .toBe(true);
      }
    });
  }

  test('unknown addresses show the 404 page', async ({ page }) => {
    await page.goto('/this/does/not/exist');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page doesn’t exist');
    await page.getByRole('link', { name: 'Browse projects' }).click();
    await expect(page).toHaveURL(/\/projects$/);
  });

  test('links that open other sites open safely in a new tab', async ({ page }) => {
    await page.goto('/projects/student-result-analyzer');
    const external = page.locator('a[href^="http"]');
    expect(await external.count()).toBeGreaterThan(0);
    for (const link of await external.all()) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
  });
});

test.describe('site navigation', () => {
  test('the header reaches every section', async ({ page }, testInfo) => {
    await page.goto('/');
    for (const [label, heading] of [
      ['Projects', 'Projects'],
      ['Generator', 'Generate a project'],
      ['Learn', 'Learning center'],
      ['Viva practice', 'Viva practice'],
      ['Compare', 'Compare projects'],
      ['Docs', 'Documentation'],
    ] as const) {
      if (isMobile(testInfo.project.name))
        await page.getByRole('button', { name: 'Open menu' }).click();
      await page
        .getByRole('navigation', { name: 'Main' })
        .getByRole('link', { name: label })
        .click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
      await expect(page.getByRole('button', { name: 'Close menu' })).toHaveCount(0);
    }
  });

  test('the header search opens the gallery filtered by the text', async ({ page }, testInfo) => {
    await page.goto('/docs');
    if (isMobile(testInfo.project.name))
      await page.getByRole('button', { name: 'Open menu' }).click();
    const search = page
      .getByRole('searchbox', { name: 'Search projects' })
      .filter({ visible: true });
    await search.fill('budget');
    await search.press('Enter');
    await expect(page).toHaveURL(/\/projects\?q=budget$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Projects');
    await expect(page.getByRole('heading', { name: 'Personal Expense Tracker' })).toBeVisible();
  });

  test('the documents menu folds away on phones', async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), 'the sidebar is always visible on desktop');
    await page.goto('/docs/run-a-react-project');
    const documents = page.getByRole('navigation', { name: 'All documents' });
    await expect(documents).toBeHidden();
    await page.getByText('All documents', { exact: true }).click();
    await documents.getByRole('link', { name: 'Run a Python project' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Run a Python project');
    await expect(page.getByRole('navigation', { name: 'All documents' })).toBeHidden();
  });

  test('the skip link moves focus to the page content', async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), 'keyboard navigation is tested on desktop');
    await page.goto('/projects');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    // The next focusable element is inside <main>, not the header.
    expect(await page.evaluate(() => document.activeElement?.closest('main') !== null)).toBe(true);
  });

  test('the mobile menu opens, traps nothing and closes with Escape', async ({
    page,
  }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), 'the menu button only exists on small screens');
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Open menu' });
    await button.click();
    await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Learn' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('the colour theme is remembered and applied before the app starts', async ({
    page,
    problems,
  }, testInfo) => {
    // On phones the theme switch is inside the menu.
    const openMenuOnPhones = async () => {
      if (isMobile(testInfo.project.name))
        await page.getByRole('button', { name: 'Open menu' }).click();
    };
    await page.goto('/');
    await openMenuOnPhones();
    // The radio button is visually hidden inside its icon label, so the click is forced.
    await page.getByRole('radio', { name: 'Dark theme' }).check({ force: true });
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Block the app's JavaScript: the inline script in index.html must apply the theme on its own.
    await page.route('**/assets/*.js', (route) => route.abort());
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.unroute('**/assets/*.js');
    problems.splice(0); // the blocked scripts were reported as failed requests on purpose

    await page.reload();
    await openMenuOnPhones();
    await expect(page.getByRole('radio', { name: 'Dark theme' })).toBeChecked();
  });
});
