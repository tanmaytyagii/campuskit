import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AI_USAGE_SESSION, anthropicProvider, type AiResult } from '../../lib/ai.ts';
import { renderRoute } from '../../test/render.tsx';

const KEY = 'sk-ant-test-not-a-real-key-0001';

afterEach(() => {
  vi.restoreAllMocks();
});

async function addKey(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/^API key/), KEY);
  await user.click(screen.getByRole('button', { name: 'Use this key' }));
}

async function pasteCode(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole('combobox', { name: 'Task' }), 'code');
  await user.type(screen.getByRole('textbox', { name: /^Code to explain/ }), 'print("hello")');
  await user.click(screen.getByRole('button', { name: 'Review what will be sent' }));
  return screen.findByRole('dialog', { name: 'Review before sending' });
}

describe('AI assistant', () => {
  it('shows exactly what will be sent and sends nothing until the student agrees', async () => {
    const stream = vi
      .spyOn(anthropicProvider, 'stream')
      .mockImplementation((_request, { onText }) => {
        onText('## What it does\n\nIt prints');
        onText('## What it does\n\nIt prints hello.');
        return Promise.resolve<AiResult>({
          kind: 'done',
          text: '## What it does\n\nIt prints hello.',
        });
      });
    const user = userEvent.setup();
    renderRoute('/assistant');
    await addKey(user);
    expect(JSON.stringify({ ...window.localStorage })).not.toContain('sk-ant');

    const dialog = await pasteCode(user);
    expect(stream).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/Nothing has been sent yet/)).toBeInTheDocument();
    expect(within(dialog).getByText('claude-opus-5-5')).toBeInTheDocument();
    const material = within(dialog).getByRole('region', { name: 'Your material' });
    expect(material).toHaveTextContent('Code: ``` print("hello") ```');

    await user.click(within(dialog).getByRole('button', { name: 'Send to Anthropic (Claude)' }));
    expect(stream).toHaveBeenCalledTimes(1);
    expect(stream.mock.calls[0]?.[0].user).toContain('print("hello")');
    expect(stream.mock.calls[0]?.[1].apiKey).toBe(KEY);
    expect(await screen.findByText('Answer ready.')).toBeInTheDocument();
    expect(screen.getByText('Written by AI')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What it does' })).toBeInTheDocument();
    expect(screen.getByText(/1 of 20/)).toBeInTheDocument();
  });

  it('cancelling the review sends nothing and counts nothing', async () => {
    const stream = vi.spyOn(anthropicProvider, 'stream');
    const user = userEvent.setup();
    renderRoute('/assistant');
    await addKey(user);
    const dialog = await pasteCode(user);
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(stream).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(AI_USAGE_SESSION)).toBeNull();
  });

  it('can’t send without a key, offline, or once the limit is used up', async () => {
    const user = userEvent.setup();
    renderRoute('/assistant');
    let dialog = await pasteCode(user);
    expect(within(dialog).getByRole('button', { name: /^Send to/ })).toBeDisabled();
    expect(
      within(dialog).getByText('Add your API key above to send requests.'),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await addKey(user);
    window.sessionStorage.setItem(AI_USAGE_SESSION, '20');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    await user.click(screen.getByRole('button', { name: 'Review what will be sent' }));
    dialog = await screen.findByRole('dialog', { name: 'Review before sending' });
    expect(within(dialog).getByRole('button', { name: /^Send to/ })).toBeDisabled();
    expect(within(dialog).getByText(/You’re offline, so nothing can be sent/)).toBeInTheDocument();
  });

  it('explains a failure and keeps what arrived', async () => {
    const { AiError } = await import('../../lib/ai.ts');
    vi.spyOn(anthropicProvider, 'stream').mockImplementation((_request, { onText }) => {
      onText('Part of an answer');
      return Promise.reject(new AiError('key', 'The API key wasn’t accepted.'));
    });
    const user = userEvent.setup();
    renderRoute('/assistant');
    await addKey(user);
    const dialog = await pasteCode(user);
    await user.click(within(dialog).getByRole('button', { name: /^Send to/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The API key wasn’t accepted.');
    expect(screen.getByText('Part of an answer')).toBeInTheDocument();
  });

  it('builds a template request from its learning guide', async () => {
    const user = userEvent.setup();
    renderRoute('/assistant');
    await user.selectOptions(
      await screen.findByRole('combobox', { name: /^Template/ }),
      'student-management-system',
    );
    await user.click(screen.getByRole('button', { name: 'Review what will be sent' }));
    const dialog = await screen.findByRole('dialog', { name: 'Review before sending' });
    await waitFor(() =>
      expect(within(dialog).getByRole('region', { name: 'Your material' })).toHaveTextContent(
        'Project: Student Management System',
      ),
    );
  });
});
