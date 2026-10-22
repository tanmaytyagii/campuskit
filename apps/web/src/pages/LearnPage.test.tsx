import { getProjectById } from '@campuskit/project-catalog';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadFile } from '../lib/download.ts';
import { renderRoute } from '../test/render.tsx';

vi.mock('../lib/download.ts', () => ({ downloadFile: vi.fn() }));
const download = vi.mocked(downloadFile);

beforeEach(() => {
  download.mockReset();
});

const STORAGE_KEY = 'campuskit:report:v1:student-result-analyzer';

// jest-dom's toHaveValue compares with lodash, so asymmetric matchers don't work there.
const valueOf = (element: HTMLElement) => (element as HTMLTextAreaElement).value;

describe('learning center', () => {
  it('drafts every report section from the selected project', async () => {
    const project = getProjectById('expense-tracker');
    if (!project) throw new Error('missing project');
    renderRoute('/learn?project=expense-tracker');

    const results = await screen.findByRole('textbox', {
      name: 'Results and limitations (Markdown)',
    });
    for (const limitation of project.limitations) expect(valueOf(results)).toContain(limitation);
    expect(
      valueOf(screen.getByRole('textbox', { name: 'Viva questions and answers (Markdown)' })),
    ).toContain('### 1. What problem does the project solve?');
    expect(screen.getByText('This is a draft for you to complete')).toBeInTheDocument();
  });

  it('downloads the assembled draft as Markdown', async () => {
    const user = userEvent.setup();
    renderRoute('/learn?project=attendance-system');
    await user.type(await screen.findByRole('textbox', { name: 'Team members' }), 'Asha K.');
    await user.click(screen.getByRole('button', { name: 'Download Markdown (.md)' }));

    const [text, fileName, mimeType] = download.mock.calls[0] ?? [];
    expect(fileName).toBe('student-attendance-system-report-draft.md');
    expect(mimeType).toBe('text/markdown');
    expect(text).toContain('**Team:** Asha K.');
    expect(text).toContain('Draft started with CampusKit');
  });

  it('offers blank prompts for a student’s own project', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/learn');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Project' }), 'custom');
    expect(router.state.location.search).toBe('?project=custom');
    expect(valueOf(await screen.findByRole('textbox', { name: 'Abstract (Markdown)' }))).toContain(
      '[In 150–250 words',
    );
  });

  it('saves nothing until the student edits the draft', async () => {
    const first = renderRoute('/learn?project=student-result-analyzer');
    await screen.findByRole('textbox', { name: 'Abstract (Markdown)' });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    first.unmount();

    renderRoute('/learn?project=student-result-analyzer');
    await screen.findByRole('textbox', { name: 'Abstract (Markdown)' });
    expect(screen.queryByText('Restored your saved draft from this browser.')).toBeNull();
  });

  it('keeps edits in this browser and can clear them', async () => {
    const user = userEvent.setup();
    const first = renderRoute('/learn?project=student-result-analyzer');
    const abstract = await screen.findByRole('textbox', { name: 'Abstract (Markdown)' });
    await user.clear(abstract);
    await user.type(abstract, 'My own abstract.');
    first.unmount();

    renderRoute('/learn?project=student-result-analyzer');
    expect(await screen.findByRole('textbox', { name: 'Abstract (Markdown)' })).toHaveValue(
      'My own abstract.',
    );
    expect(screen.getByText('Restored your saved draft from this browser.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear saved work' }));
    expect(valueOf(screen.getByRole('textbox', { name: 'Abstract (Markdown)' }))).toContain(
      'This project presents',
    );
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
