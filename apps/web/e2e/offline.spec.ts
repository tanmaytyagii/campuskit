/**
 * Offline use: after one visit with a connection, the service worker serves the site, so saved
 * work, the dashboard and viva practice keep working without a network.
 */
import { expect, test } from './fixtures.ts';

test('saved work, the dashboard and viva practice work offline after one visit', async ({
  page,
  context,
  problems,
}) => {
  await page.goto('/my-projects');
  await page.getByRole('button', { name: 'New project' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Offline Planner');
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Offline Planner' })).toBeVisible();
  const projectUrl = page.url();

  // The worker installs in the background and takes control of the page.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 30_000,
  });

  await context.setOffline(true);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Your dashboard' })).toBeVisible();
  await expect(page.getByText(/You’re offline/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Recent activity' })).toContainText(
    'Offline Planner',
  );

  await page.goto(projectUrl);
  await expect(page.getByRole('heading', { level: 1, name: 'Offline Planner' })).toBeVisible();
  const milestones = page.getByRole('region', { name: 'Milestones' });
  await milestones.getByRole('textbox', { name: 'New milestone' }).fill('Written offline');
  await milestones.getByRole('button', { name: 'Add' }).click();
  await expect(milestones.getByRole('checkbox', { name: /Written offline/ })).toBeVisible();

  await page.goto('/projects/attendance-system/viva');
  await expect(page.getByRole('button', { name: 'Start quick practice' })).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText(/You’re offline/)).toHaveCount(0);
  // Images that were never stored can't load offline; those failures are expected here.
  problems.splice(
    0,
    problems.length,
    ...problems.filter((problem) => !problem.startsWith('request failed')),
  );
});

test('the site can be installed: a manifest with icons and a service worker', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = (await (await request.get(href ?? '')).json()) as {
    name: string;
    start_url: string;
    display: string;
    icons: Array<{ src: string; sizes: string; purpose?: string }>;
  };
  expect(manifest).toMatchObject({ name: 'CampusKit', display: 'standalone' });
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512', '512x512']);
  for (const icon of manifest.icons) expect((await request.get(`/${icon.src}`)).ok()).toBe(true);
  const worker = await request.get('/sw.js');
  expect(worker.ok()).toBe(true);
  expect(await worker.text()).toMatch(/const SHELL = \["/);
});
