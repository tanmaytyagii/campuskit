import { readZipArchive, utf8Decode, type TemplateBundle } from '@campuskit/template-engine';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadFile } from '../../lib/download.ts';
import { diskBundleLoader, renderRoute } from '../../test/render.tsx';

vi.mock('../../lib/download.ts', () => ({ downloadFile: vi.fn() }));
const download = vi.mocked(downloadFile);

beforeEach(() => {
  download.mockReset();
});

async function downloadedZip() {
  expect(download).toHaveBeenCalledTimes(1);
  const [data, fileName, mimeType] = download.mock.calls[0] ?? [];
  expect(mimeType).toBe('application/zip');
  if (!(data instanceof Uint8Array)) throw new Error('expected ZIP bytes');
  const entries = await readZipArchive(data);
  const text = (path: string) => {
    const entry = entries.find((item) => item.path === path);
    if (!entry) throw new Error(`${path} is missing from the ZIP`);
    return utf8Decode(entry.data);
  };
  return { fileName, entries, text };
}

describe('project generator', () => {
  it('walks through every step and downloads a customized ZIP', async () => {
    const user = userEvent.setup();
    renderRoute('/generate');

    expect(await screen.findByRole('heading', { name: 'Choose a template' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose a template to continue' })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /Student Attendance System/ }));
    expect(screen.getByRole('heading', { name: 'What you get' })).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Continue with Student Attendance System' }),
    );

    // Details: invalid values are explained and focused.
    expect(await screen.findByRole('heading', { name: 'Name your project' })).toHaveFocus();
    const name = screen.getByRole('textbox', { name: 'Project name' });
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: 'Continue to options' }));
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription(expect.stringContaining('Project name is required'));
    expect(name).toHaveFocus();

    await user.type(name, 'Riya’s Lab <Attendance> & “Notes” — हाज़िरी');
    await user.type(
      screen.getByRole('textbox', { name: 'Institution name (optional)' }),
      'St. Xavier’s College',
    );
    const preview = within(screen.getByRole('complementary', { name: 'Live preview' }));
    expect(
      preview.getAllByText('Riya’s Lab &lt;Attendance&gt; &amp; “Notes” — हाज़िरी').length,
    ).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Continue to options' }));

    // Options: only what this template supports.
    expect(await screen.findByRole('heading', { name: 'Choose options' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Teal' }));
    const threshold = screen.getByRole('spinbutton', { name: 'Attendance threshold' });
    await user.clear(threshold);
    await user.type(threshold, '150');
    await user.click(screen.getByRole('button', { name: 'Review your project' }));
    expect(threshold).toHaveAccessibleDescription(expect.stringContaining('Use 100 or less'));
    await user.clear(threshold);
    await user.type(threshold, '80');
    await user.click(screen.getByRole('checkbox', { name: /Include the demo class/ }));
    await user.click(screen.getByRole('button', { name: 'Review your project' }));

    // Review: a summary of choices and the files they change.
    expect(await screen.findByRole('heading', { name: 'Review and generate' })).toBeInTheDocument();
    const review = within(screen.getByRole('region', { name: 'Review' }));
    expect(review.getByText('riya-s-lab-attendance-and-notes/')).toBeInTheDocument();
    expect(review.getByText('St. Xavier’s College')).toBeInTheDocument();
    expect(await screen.findByText(/will be packed into/)).toHaveTextContent(
      'riya-s-lab-attendance-and-notes.zip',
    );

    // The preview shows the real generated files, not an illustration.
    const fileSelect = screen.getByRole('combobox', { name: 'File' });
    expect(fileSelect).toHaveValue('GETTING_STARTED.md');
    expect(screen.getByLabelText('Contents of GETTING_STARTED.md')).toHaveTextContent(
      'cd riya-s-lab-attendance-and-notes',
    );
    await user.selectOptions(fileSelect, 'src/app.config.json');
    expect(screen.getByLabelText('Contents of src/app.config.json')).toHaveTextContent(
      '"institutionName": "St. Xavier’s College"',
    );
    await user.click(screen.getByRole('button', { name: 'Generate ZIP' }));

    // Done: setup steps for this exact project.
    expect(
      await screen.findByRole('heading', { name: 'riya-s-lab-attendance-and-notes.zip is ready' }),
    ).toHaveFocus();
    expect(screen.getAllByText('cd riya-s-lab-attendance-and-notes').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Environment variables' })).toBeInTheDocument();
    expect(screen.getByText(/needs no API keys, passwords or other secrets/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Known limitations' })).toBeInTheDocument();

    const zip = await downloadedZip();
    expect(zip.fileName).toBe('riya-s-lab-attendance-and-notes.zip');
    const root = 'riya-s-lab-attendance-and-notes/';
    expect(zip.entries.every((entry) => entry.path.startsWith(root))).toBe(true);
    expect(JSON.parse(zip.text(`${root}src/app.config.json`))).toMatchObject({
      appName: 'Riya’s Lab <Attendance> & “Notes” — हाज़िरी',
      institutionName: 'St. Xavier’s College',
      theme: 'teal',
      attendanceThreshold: 80,
      seedDemoData: false,
    });
    expect(zip.text(`${root}index.html`)).toContain(
      '<title>Riya’s Lab &lt;Attendance&gt; &amp; “Notes” — हाज़िरी</title>',
    );
    expect((JSON.parse(zip.text(`${root}package.json`)) as { name: string }).name).toBe(
      'riya-s-lab-attendance-and-notes',
    );
    expect(zip.text(`${root}GETTING_STARTED.md`)).toContain(
      '# Getting started with Riya’s Lab \\<Attendance\\> \\& “Notes” — हाज़िरी',
    );
    const guide = zip.text(`${root}GETTING_STARTED.md`);
    expect(guide).toContain('## Known limitations');
    expect(guide).toContain(
      '[Project report draft (edit before you submit)](docs/PROJECT_REPORT_DRAFT.md)',
    );
    const report = zip.text(`${root}docs/PROJECT_REPORT_DRAFT.md`);
    expect(report).toContain('# Riya’s Lab \\<Attendance\\> \\& “Notes” — हाज़िरी');
    expect(report).toContain('**Institution:** St. Xavier’s College');
    expect(report).toContain('## 1. Abstract');
    const paths = zip.entries.map((entry) => entry.path);
    expect(paths).toContain(`${root}.gitignore`);
    expect(paths.some((path) => /node_modules|\/dist\/|\.env$/.test(path))).toBe(false);

    // "Download again" offers the same bytes.
    await user.click(screen.getByRole('button', { name: 'Download again' }));
    expect(download).toHaveBeenCalledTimes(2);
    expect(download.mock.calls[1]?.[0]).toBe(download.mock.calls[0]?.[0]);
  });

  it('starts on the details step when linked from a project page with a name', async () => {
    renderRoute('/generate?template=expense-tracker&name=Hostel%20Budget');
    expect(await screen.findByRole('heading', { name: 'Name your project' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Project name' })).toHaveValue('Hostel Budget');
    // The expense tracker has no institution option, so none is offered.
    expect(screen.queryByRole('textbox', { name: /Institution/ })).toBeNull();
  });

  it('keeps typed details when switching templates', async () => {
    const user = userEvent.setup();
    renderRoute('/generate?template=attendance-system');
    const name = await screen.findByRole('textbox', { name: 'Project name' });
    await user.clear(name);
    await user.type(name, 'My Project');
    await user.click(screen.getByRole('button', { name: /Template \(completed\)/ }));
    await user.click(screen.getByRole('radio', { name: /Student Result Analyzer/ }));
    await user.click(screen.getByRole('button', { name: 'Continue with Student Result Analyzer' }));
    expect(await screen.findByRole('textbox', { name: 'Project name' })).toHaveValue('My Project');
  });

  it('explains a failed template download and retries it', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const flaky = (id: string): Promise<TemplateBundle> => {
      attempts += 1;
      return attempts === 1
        ? Promise.reject(new Error('Network error while loading the template'))
        : diskBundleLoader(id);
    };
    renderRoute('/generate?template=student-result-analyzer', { loader: flaky });
    await user.click(await screen.findByRole('button', { name: 'Continue to options' }));
    await user.click(await screen.findByRole('button', { name: 'Review your project' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The template files couldn’t be loaded');
    expect(alert).toHaveTextContent('Network error while loading the template');
    expect(screen.getByRole('button', { name: 'Generate ZIP' })).toBeDisabled();

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/will be packed into/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate ZIP' })).toBeEnabled();
  });

  it('previews the app with the chosen name and the template’s real theme colour', async () => {
    const user = userEvent.setup();
    renderRoute('/generate?template=attendance-system');
    const name = await screen.findByRole('textbox', { name: 'Project name' });
    await user.clear(name);
    await user.type(name, 'Hostel Register');
    const preview = within(screen.getByRole('complementary', { name: 'Live preview' }));
    expect(preview.getByText(/An illustration drawn from your settings/)).toBeInTheDocument();
    expect(preview.getByText(/The app's title is “Hostel Register”/)).toBeInTheDocument();
    expect(screen.getAllByText(/Written to/).length).toBeGreaterThan(0);
  });

  it('keeps choices when the student leaves the generator and comes back', async () => {
    const user = userEvent.setup();
    const first = renderRoute('/generate?template=expense-tracker');
    const name = await screen.findByRole('textbox', { name: 'Project name' });
    await user.clear(name);
    await user.type(name, 'Pocket Money');
    first.unmount();

    renderRoute('/generate?template=expense-tracker');
    expect(await screen.findByRole('textbox', { name: 'Project name' })).toHaveValue(
      'Pocket Money',
    );
  });

  it('shows which common settings the chosen template does not offer', async () => {
    renderRoute('/generate?template=expense-tracker');
    expect(
      await screen.findByText('Not available in Personal Expense Tracker'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Institution name (offered by Student Attendance System and Student Result Analyzer)',
      ),
    ).toBeInTheDocument();
  });
});
