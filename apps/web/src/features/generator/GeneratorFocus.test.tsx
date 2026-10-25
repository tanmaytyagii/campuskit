/**
 * The generator moves focus to the heading of each new step. The last step appears after an
 * await, so React renders it as a normal-priority update, and an effect queued after that
 * commit may run a task later. A test (or a screen reader) could then see the new step while
 * focus is still on the page body. This happened once in a full test run.
 *
 * This test forces the two conditions that make it happen: a render longer than React's 5 ms
 * time slice, so the scheduler yields after the commit, and a pause after zero-delay timers, so
 * Testing Library's own setTimeout(0) runs before the scheduler's next task. With the focus
 * moved in a passive effect it fails every time; moving it in a layout effect fixed it.
 */
import type * as TemplateEngine from '@campuskit/template-engine';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';

import { renderRoute } from '../../test/render.tsx';

vi.mock('../../lib/download.ts', () => ({ downloadFile: vi.fn() }));

function busy(ms: number) {
  const until = performance.now() + ms;
  while (performance.now() < until) {
    // spin
  }
}

// Condition 1: rendering the done panel takes longer than the scheduler's 5 ms slice.
vi.mock('@campuskit/template-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof TemplateEngine>();
  return {
    ...actual,
    formatBytes: (bytes: number) => {
      busy(20);
      return actual.formatBytes(bytes);
    },
  };
});

// Condition 2: at least 1 ms passes after a zero-delay timer is set, before the loop moves on.
const realSetTimeout = globalThis.setTimeout;
beforeAll(() => {
  globalThis.setTimeout = ((handler: () => void, timeout?: number) => {
    const id = realSetTimeout(handler, timeout);
    if (!timeout) busy(2);
    return id;
  }) as typeof setTimeout;
});
afterAll(() => {
  globalThis.setTimeout = realSetTimeout;
});

it('moves focus to the done heading even when React yields after the commit', async () => {
  const user = userEvent.setup();
  renderRoute('/generate?template=attendance-system');
  await user.click(await screen.findByRole('button', { name: 'Continue to options' }));
  await user.click(await screen.findByRole('button', { name: 'Review your project' }));
  await screen.findByText(/will be packed into/);
  await user.click(screen.getByRole('button', { name: 'Generate ZIP' }));
  expect(await screen.findByRole('heading', { name: /\.zip is ready$/ })).toHaveFocus();
});
