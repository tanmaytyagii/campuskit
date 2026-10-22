import { expect, isMobile, test } from './fixtures.ts';

test('filters are kept in the address, survive a reload and work with Back', async ({
  page,
}, testInfo) => {
  await page.goto('/projects');
  await expect(page.getByRole('status').filter({ hasText: 'projects' })).toHaveText('3 projects');

  await page.getByRole('searchbox', { name: 'Search' }).fill('react');
  await expect(page).toHaveURL(/\?q=react$/);
  await expect(page.getByRole('status').filter({ hasText: 'projects' })).toHaveText(
    'Showing 2 of 3 projects',
  );

  if (isMobile(testInfo.project.name)) {
    await page.getByRole('button', { name: /^Filters/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Filter projects' });
    await dialog.getByRole('checkbox', { name: /^Beginner/ }).check();
    await dialog.getByRole('button', { name: 'Show 1 project' }).click();
  } else {
    await page
      .getByRole('complementary', { name: 'Filters' })
      .getByRole('checkbox', { name: /^Beginner/ })
      .check();
  }
  await expect(page).toHaveURL(/\?q=react&difficulty=beginner$/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Student Attendance System' }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('react');
  await expect(page.getByRole('status').filter({ hasText: 'projects' })).toHaveText(
    'Showing 1 of 3 projects',
  );

  await page.goBack();
  await expect(page).toHaveURL(/\?q=react$/);
  await expect(page.getByRole('status').filter({ hasText: 'projects' })).toHaveText(
    'Showing 2 of 3 projects',
  );
});

test('a search with no results offers a way out', async ({ page }) => {
  await page.goto('/projects?q=blockchain');
  await expect(
    page.getByRole('heading', { name: 'No projects match these filters' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).last().click();
  await expect(page.getByRole('status').filter({ hasText: 'projects' })).toHaveText('3 projects');
});

test('home search suggestions open a project', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('combobox', { name: 'Search projects' });
  await search.fill('pandas');
  await page.getByRole('option', { name: /Student Result Analyzer/ }).click();
  await expect(page).toHaveURL(/\/projects\/student-result-analyzer$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Student Result Analyzer');
});
