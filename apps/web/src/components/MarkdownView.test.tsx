import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { MarkdownView } from './MarkdownView.tsx';

describe('MarkdownView', () => {
  it('copies a code block without its trailing newline', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MarkdownView markdown={'Run:\n\n```bash\npnpm install\npnpm dev\n```\n'} />
      </MemoryRouter>,
    );
    const button = screen.getByRole('button', { name: 'Copy code' });
    expect(button).toHaveTextContent('Copy');

    await user.click(button);
    expect(await navigator.clipboard.readText()).toBe('pnpm install\npnpm dev');
    expect(button).toHaveTextContent('Copied');
    // The code itself stays focusable so keyboard users can scroll it sideways.
    expect(screen.getByText(/pnpm install/).closest('pre')).toHaveAttribute('tabindex', '0');
  });

  it('does not render raw HTML from the document', () => {
    render(
      <MemoryRouter>
        <MarkdownView markdown={'Hello <img src=x onerror="alert(1)"> world'} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(document.querySelector('[onerror]')).toBeNull();
  });
});
