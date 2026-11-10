/**
 * The optional AI assistant with the real Anthropic SDK in the browser. Anthropic's API is
 * replaced by a recorded-shape streaming response, so no key or network is needed, and the
 * request the SDK sends is checked: the model, the refusal fallback, the student's key and the
 * exact text they reviewed. Nothing reaches the API until the student agrees.
 */
import AxeBuilder from '@axe-core/playwright';

import type { Page } from '@playwright/test';

import { expect, test } from './fixtures.ts';

const KEY = 'sk-ant-test-not-a-real-key-0001';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
};

async function violations(page: Page) {
  // Dialogs fade in; wait until every animation has finished so axe measures settled colours.
  await page.evaluate(() =>
    // A cancelled animation (a toast that was dismissed) rejects; it has finished either way.
    Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  return results.violations.map((violation) => violation.id);
}

function sse(text: string): string {
  const events: [string, unknown][] = [
    [
      'message_start',
      {
        type: 'message_start',
        message: {
          id: 'msg_e2e',
          type: 'message',
          role: 'assistant',
          model: 'claude-opus-5-5',
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 50, output_tokens: 1 },
        },
      },
    ],
    [
      'content_block_start',
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    ],
    ...text
      .split(/(?<=\n)/)
      .map((part): [string, unknown] => [
        'content_block_delta',
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: part } },
      ]),
    ['content_block_stop', { type: 'content_block_stop', index: 0 }],
    [
      'message_delta',
      {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn', stop_sequence: null },
        usage: { output_tokens: 20 },
      },
    ],
    ['message_stop', { type: 'message_stop' }],
  ];
  return events
    .map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    .join('');
}

// Requests from a page the offline service worker controls bypass Playwright's routing (WebKit
// sends them on to the real API), so the worker is blocked here; it never handles API calls.
test.use({ serviceWorkers: 'block' });

test('reviews, sends and streams an answer through the SDK', async ({ page }) => {
  const sent: { headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  await page.route('https://api.anthropic.com/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    sent.push({
      headers: await request.allHeaders(),
      body: request.postDataJSON() as Record<string, unknown>,
    });
    await route.fulfill({
      status: 200,
      headers: { ...CORS, 'content-type': 'text/event-stream' },
      body: sse('## What it does\n\nThe route saves a student.\n'),
    });
  });

  await page.goto('/assistant');
  await expect(page.getByRole('heading', { level: 1, name: 'AI assistant' })).toBeVisible();
  await page.getByLabel(/^API key/).fill(KEY);
  await page.getByRole('button', { name: 'Use this key' }).click();
  await page.getByRole('combobox', { name: 'Task' }).selectOption('code');
  await page.getByRole('textbox', { name: /^Code to explain/ }).fill('def save(): pass');
  await page.getByRole('button', { name: 'Review what will be sent' }).click();

  const dialog = page.getByRole('dialog', { name: 'Review before sending' });
  await expect(dialog.getByRole('region', { name: 'Your material' })).toContainText(
    'def save(): pass',
  );
  expect(await violations(page)).toEqual([]);
  expect(sent).toHaveLength(0);

  await dialog.getByRole('button', { name: 'Send to Anthropic (Claude)' }).click();
  await expect(page.getByText('Answer ready.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What it does' })).toBeVisible();
  await expect(page.getByText('Written by AI')).toBeVisible();

  expect(sent).toHaveLength(1);
  const [request] = sent;
  expect(request?.headers.authorization).toBe(`Bearer ${KEY}`);
  expect(request?.headers['anthropic-beta']).toContain('server-side-fallback-2026-07-01');
  expect(request?.body).toMatchObject({
    model: 'claude-opus-5-5',
    stream: true,
    fallbacks: 'default',
    output_config: { effort: 'medium' },
  });
  expect(JSON.stringify(request?.body.messages)).toContain('def save(): pass');

  // The key never reaches localStorage.
  const stored = await page.evaluate(() => JSON.stringify({ ...window.localStorage }));
  expect(stored).not.toContain('sk-ant');
  expect(await violations(page)).toEqual([]);
});
