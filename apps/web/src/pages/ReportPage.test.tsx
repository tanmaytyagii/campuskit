import { getProjectById } from '@campuskit/project-catalog';
import { screen, within } from '@testing-library/react';
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

describe('submission workspace', () => {
  it('drafts every report section from the selected project', async () => {
    const project = getProjectById('expense-tracker');
    if (!project) throw new Error('missing project');
    renderRoute('/learn/report?project=expense-tracker');

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
    renderRoute('/learn/report?project=attendance-system');
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
    const { router } = renderRoute('/learn/report');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Project' }), 'custom');
    expect(router.state.location.search).toBe('?project=custom');
    expect(valueOf(await screen.findByRole('textbox', { name: 'Abstract (Markdown)' }))).toContain(
      '[In 150–250 words',
    );
  });

  it('saves nothing until the student edits the draft', async () => {
    const first = renderRoute('/learn/report?project=student-result-analyzer');
    await screen.findByRole('textbox', { name: 'Abstract (Markdown)' });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    first.unmount();

    renderRoute('/learn/report?project=student-result-analyzer');
    await screen.findByRole('textbox', { name: 'Abstract (Markdown)' });
    expect(screen.queryByText('Restored your saved draft from this browser.')).toBeNull();
  });

  it('keeps edits in this browser and can clear them', async () => {
    const user = userEvent.setup();
    const first = renderRoute('/learn/report?project=student-result-analyzer');
    const abstract = await screen.findByRole('textbox', { name: 'Abstract (Markdown)' });
    await user.clear(abstract);
    await user.type(abstract, 'My own abstract.');
    first.unmount();

    renderRoute('/learn/report?project=student-result-analyzer');
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

  it('adds a labelled facts appendix and the demonstration checklist to the download', async () => {
    const user = userEvent.setup();
    renderRoute('/learn/report?project=student-result-analyzer');
    const demo = await screen.findByRole('checkbox', {
      name: /^1\. Activate the virtual environment/,
    });
    await user.click(demo);
    expect(screen.getByText('1 of 8 steps rehearsed.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Download Markdown (.md)' }));

    const [text] = download.mock.calls[0] ?? [];
    expect(text).toContain('## Appendix A: Project facts from CampusKit');
    expect(text).toContain('it was not written by the student');
    expect(text).toContain('## Appendix B: Demonstration checklist');
    expect(text).toContain('- [x] Activate the virtual environment');
    expect(text).toContain('## 6. Implemented features');
    expect(text).toContain('## 8. Testing methodology');
  });

  it('labels untouched drafts and edited sections differently', async () => {
    const user = userEvent.setup();
    renderRoute('/learn/report?project=attendance-system');
    const abstract = await screen.findByRole('textbox', { name: 'Abstract (Markdown)' });
    const section = abstract.closest('section');
    if (!section) throw new Error('missing section');
    expect(within(section).getByText('CampusKit draft')).toBeInTheDocument();
    await user.type(abstract, ' Mine.');
    expect(within(section).getByText('Edited by you')).toBeInTheDocument();
  });

  it('restores drafts saved before the new sections existed', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        info: {
          title: 'Old draft',
          team: '',
          guide: '',
          institution: '',
          department: '',
          academicYear: '',
        },
        sections: { abstract: 'My old abstract.' },
      }),
    );
    renderRoute('/learn/report?project=student-result-analyzer');
    expect(await screen.findByRole('textbox', { name: 'Abstract (Markdown)' })).toHaveValue(
      'My old abstract.',
    );
    expect(
      valueOf(screen.getByRole('textbox', { name: 'Implemented features (Markdown)' })),
    ).toContain('The template provides these features:');
  });
});
