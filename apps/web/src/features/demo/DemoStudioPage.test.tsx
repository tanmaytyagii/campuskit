import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '../../test/render.tsx';
import {
  createDemoData,
  DEFAULT_FILTERS,
  filterTransactions,
  formatMoney,
  todayKey,
  totals,
} from './demos/expenses/template.ts';

function frame(name: string) {
  return screen.getByRole('region', { name: `${name} demo` });
}

async function addStudent(user: UserEvent, name: string, roll: string) {
  const demo = frame('Student Attendance System');
  await user.click(within(demo).getByRole('button', { name: 'Add student' }));
  const dialog = await screen.findByRole('dialog', { name: 'Add student' });
  await user.type(within(dialog).getByRole('textbox', { name: 'Full name' }), name);
  await user.type(within(dialog).getByRole('textbox', { name: 'Roll number' }), roll);
  await user.click(within(dialog).getByRole('button', { name: 'Add student' }));
  return dialog;
}

/** The delete buttons of the table's rows, in order. */
function deleteButtons() {
  const table = screen.queryByRole('table');
  return table ? within(table).getAllByRole('button', { name: /^Delete / }) : [];
}

/** Deletes the row at `index` through its confirmation dialog. */
async function deleteRow(user: UserEvent, index: number, confirm: string) {
  const button = deleteButtons()[index];
  if (!button) throw new Error(`there is no row ${index}`);
  await user.click(button);
  const dialog = await screen.findByRole('alertdialog', { name: /^Delete / });
  await user.click(within(dialog).getByRole('button', { name: confirm }));
}

const labels = () => deleteButtons().map((button) => button.getAttribute('aria-label'));

describe('demo studio: attendance', () => {
  it('is labelled as a demonstration and starts from the template’s sample class', async () => {
    renderRoute('/projects/attendance-system/demo');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Student Attendance System' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'A demonstration with fictional sample data, not a live system',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/run the template’s own code/)).toBeInTheDocument();
    expect(
      await within(frame('Student Attendance System')).findByText('Showing 12 of 12 students'),
    ).toBeInTheDocument();
  });

  it('adds and edits students with the template’s validation', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/demo');
    await screen.findByText('Showing 12 of 12 students');

    const dialog = await addStudent(user, 'Kavya Rao', '10A-01');
    const roll = within(dialog).getByRole('textbox', { name: 'Roll number' });
    expect(roll).toHaveAccessibleDescription(
      'Roll number 10A-01 is already used by Aarav Sharma in Class 10-A.',
    );
    expect(roll).toHaveFocus();
    await user.clear(roll);
    await user.type(roll, '10A-07');
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }));
    expect(await screen.findByText('Added Kavya Rao.')).toBeInTheDocument();
    expect(screen.getByText('Showing 13 of 13 students')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit Kavya Rao' }));
    const edit = await screen.findByRole('dialog', { name: 'Edit student' });
    const name = within(edit).getByRole('textbox', { name: 'Full name' });
    await user.clear(name);
    await user.type(name, 'Kavya R. Rao');
    await user.click(within(edit).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Saved changes to Kavya R. Rao.')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'kavya');
    expect(screen.getByText('Showing 1 of 13 students')).toBeInTheDocument();
  });

  it('saves attendance through the template’s reducer and updates the summary', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/demo?feature=mark');
    await screen.findByRole('heading', { name: 'Mark attendance' });
    expect(screen.getByRole('button', { name: 'Save attendance' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Mark all present' }));
    await user.click(
      within(screen.getByRole('group', { name: 'Diya Patel' })).getByRole('radio', {
        name: 'Late',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Save attendance' }));
    expect(await screen.findByText(/^Attendance saved for /)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Summary' }));
    expect(await screen.findByText('11 present, 1 late, 0 absent.')).toBeInTheDocument();
    // Diya: 9 present and 1 absent in the sample, plus today's late = 10 of 11 marks.
    const row = screen.getByRole('rowheader', { name: /Diya Patel/ }).closest('tr');
    if (!row) throw new Error('missing row');
    expect(within(row).getByText('90.9%')).toBeInTheDocument();
  });

  it('refuses future dates, as the template does', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/demo?feature=mark');
    const date = await screen.findByLabelText('Date');
    await user.clear(date);
    await user.type(date, '2999-01-01');
    expect(date).toHaveAccessibleDescription('Attendance can’t be marked for a future date.');
  });

  it('keeps changes in this tab only, survives coming back, and resets to the example', async () => {
    const user = userEvent.setup();
    const first = renderRoute('/projects/attendance-system/demo');
    await screen.findByText('Showing 12 of 12 students');
    await addStudent(user, 'Kavya Rao', '10A-07');
    await screen.findByText('Added Kavya Rao.');

    const stored = window.sessionStorage.getItem('campuskit:demo-studio:v1:attendance-system');
    expect(stored).toContain('Kavya Rao');
    // Nothing is written where the template, learning progress or report drafts keep data.
    for (let index = 0; index < window.localStorage.length; index += 1)
      expect(window.localStorage.getItem(window.localStorage.key(index) ?? '')).not.toContain(
        'Kavya',
      );
    expect(window.localStorage.getItem('campuskit-attendance:v1')).toBeNull();
    first.unmount();

    renderRoute('/projects/attendance-system/demo');
    expect(await screen.findByText('Showing 13 of 13 students')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset to the example' }));
    expect(await screen.findByText('Showing 12 of 12 students')).toBeInTheDocument();
    expect(screen.getByText('The demo is back to the example data.')).toBeInTheDocument();
  });

  it('shows empty states when started with no data', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/demo');
    await screen.findByText('Showing 12 of 12 students');
    await user.click(screen.getByRole('button', { name: 'Start with no data' }));
    expect(await screen.findByRole('heading', { name: 'No students yet' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Mark attendance' }));
    expect(
      screen.getByRole('heading', { name: 'Add students before marking attendance' }),
    ).toBeInTheDocument();
  });

  it('asks before deleting a student, and says what else would be deleted', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/demo');
    await screen.findByText('Showing 12 of 12 students');
    const [first] = deleteButtons();
    if (!first) throw new Error('no rows');
    await user.click(first);
    // An alert dialog, so screen readers read the consequence along with the question.
    const dialog = await screen.findByRole('alertdialog', { name: /^Delete .+\?$/ });
    expect(dialog).toHaveAccessibleDescription(
      /^This also deletes \d+ attendance marks? for this student\. In this demo, Reset brings the sample class back\.$/,
    );
    // Browsers give focus back to the delete button when it closes (see e2e/demo.spec.ts).
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('Showing 12 of 12 students')).toBeInTheDocument();
  });

  it('moves focus to a remaining row after deleting the first, a middle or the last student', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/demo');
    await screen.findByText('Showing 12 of 12 students');

    // The first row: focus moves to the row that took its place.
    let before = labels();
    await deleteRow(user, 0, 'Delete student');
    expect(deleteButtons()[0]).toHaveFocus();
    expect(deleteButtons()[0]).toHaveAccessibleName(before[1] ?? '');
    expect(screen.getByText(/^Deleted .+ and their attendance history\.$/)).toBeInTheDocument();

    // A middle row: the same position, now holding the next student.
    before = labels();
    await deleteRow(user, 4, 'Delete student');
    expect(deleteButtons()[4]).toHaveFocus();
    expect(deleteButtons()[4]).toHaveAccessibleName(before[5] ?? '');

    // The last row: focus moves to the row before it.
    before = labels();
    const last = before.length - 1;
    await deleteRow(user, last, 'Delete student');
    expect(deleteButtons()).toHaveLength(last);
    expect(deleteButtons()[last - 1]).toHaveFocus();
    expect(deleteButtons()[last - 1]).toHaveAccessibleName(before[last - 1] ?? '');
  });

  it('moves focus to the empty state or the filter reset when no row is left', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/demo');
    await screen.findByText('Showing 12 of 12 students');

    // Filtered down to one student: after deleting it, focus goes to the way out of the filter.
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'Diya');
    await screen.findByText('Showing 1 of 12 students');
    await deleteRow(user, 0, 'Delete student');
    expect(screen.getByRole('button', { name: 'Clear the filters' })).toHaveFocus();

    // The only student in the class: focus goes to the empty state's heading.
    await user.click(screen.getByRole('button', { name: 'Start with no data' }));
    await user.click(await screen.findByRole('button', { name: 'Add your first student' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add student' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Full name' }), 'Kavya Rao');
    await user.type(within(dialog).getByRole('textbox', { name: 'Roll number' }), '10A-07');
    await user.type(within(dialog).getByLabelText('Class or section'), 'Class 10-A');
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }));
    await screen.findByText('Showing 1 of 1 students');
    await deleteRow(user, 0, 'Delete student');
    expect(screen.getByRole('heading', { name: 'No students yet' })).toHaveFocus();
  });

  it('moves between screens with the arrow keys', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/demo');
    const students = await screen.findByRole('tab', { name: 'Students' });
    expect(students).toHaveAttribute('aria-selected', 'true');
    students.focus();
    await user.keyboard('{ArrowRight}');
    const mark = screen.getByRole('tab', { name: 'Mark attendance' });
    expect(mark).toHaveFocus();
    expect(mark).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: 'Mark attendance' })).toBeInTheDocument();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Data model' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Students' })).toHaveAttribute('aria-selected', 'true');
  });

  it('links each screen to the real source and learning material', async () => {
    renderRoute('/projects/attendance-system/demo?feature=summary');
    const panel = await screen.findByRole('complementary', { name: 'About this screen: Summary' });
    expect(within(panel).getByRole('link', { name: /attendancePercentage/ })).toHaveAttribute(
      'href',
      '/projects/attendance-system/source?file=src%2Flib%2Fattendance.ts&symbol=attendancePercentage',
    );
    expect(
      await within(panel).findByRole('link', { name: /Attendance calculations.*Code walkthrough/ }),
    ).toHaveAttribute('href', '/projects/attendance-system/learn/code?entry=calculations');
    expect(
      within(panel).getByRole('link', { name: /Practise 2 related viva questions/ }),
    ).toHaveAttribute('href', '/projects/attendance-system/viva?questions=percentage,threshold');
  });
});

describe('demo studio: tour and guided demo', () => {
  it('tours the demo, opening the screen each step describes', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/demo');
    await screen.findByText('Showing 12 of 12 students');
    await user.click(screen.getByRole('button', { name: 'Take the tour' }));
    expect(await screen.findByRole('heading', { name: 'The student list' })).toHaveFocus();
    expect(screen.getByText('Tour · Step 1 of 5')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: 'Attendance records' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Mark attendance' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Tour · Step 2 of 5')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'End the tour' }));
    expect(screen.queryByText(/^Tour · Step/)).not.toBeInTheDocument();
  });

  it('checks each action in the demo and records a complete rehearsal', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/demo');
    await screen.findByText('Showing 12 of 12 students');
    await user.click(screen.getByRole('button', { name: 'Practise the demo' }));
    expect(
      await screen.findByRole('heading', {
        name: 'Practise demonstrating Student Attendance System',
      }),
    ).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Start the guided demo' }));
    expect(await screen.findByRole('heading', { name: 'Introduce the project' })).toHaveFocus();
    expect(screen.getByText('Guided demo · Step 1 of 6')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next step' }));
    await user.click(screen.getByRole('button', { name: 'Next step' }));
    expect(await screen.findByRole('heading', { name: 'Add a student' })).toBeInTheDocument();
    expect(screen.getByText('No new student in the list yet.')).toBeInTheDocument();
    await addStudent(user, 'Kavya Rao', '10A-07');
    expect(await screen.findByText('Added Kavya Rao.', { selector: 'span' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next step' }));
    expect(
      await screen.findByRole('heading', { name: 'Mark attendance for today' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mark all present' }));
    await user.click(screen.getByRole('button', { name: 'Save attendance' }));
    expect(await screen.findByText(/^Saved marks for /)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next step' }));
    await user.click(screen.getByRole('button', { name: 'Next step' }));
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(await screen.findByRole('heading', { name: 'Guided demo finished' })).toHaveFocus();
    expect(screen.getByText(/today’s date is saved in this browser/)).toBeInTheDocument();
    const record = JSON.parse(
      window.localStorage.getItem('campuskit:rehearsal:v1:attendance-system') ?? 'null',
    ) as { completedOn: string; checkedSteps: number } | null;
    expect(record?.checkedSteps).toBe(3);
    expect(record?.completedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('records nothing when a checked action wasn’t done', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/demo');
    await screen.findByText('Showing 12 of 12 students');
    await user.click(screen.getByRole('button', { name: 'Practise the demo' }));
    await user.click(await screen.findByRole('button', { name: 'Start the guided demo' }));
    for (let step = 0; step < 5; step += 1)
      await user.click(screen.getByRole('button', { name: 'Next step' }));
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(await screen.findByText(/so nothing was saved/)).toBeInTheDocument();
    expect(window.localStorage.getItem('campuskit:rehearsal:v1:attendance-system')).toBeNull();
  });
});

describe('demo studio: expense tracker', () => {
  it('validates amounts with the template’s parser and recalculates the totals', async () => {
    const user = userEvent.setup();
    const today = todayKey();
    const before = totals(
      filterTransactions(
        createDemoData('INR', new Date()).transactions,
        { ...DEFAULT_FILTERS },
        today,
      ),
    );
    renderRoute('/projects/expense-tracker/demo?feature=transactions');
    await screen.findByRole('heading', { name: 'Transactions' });
    await user.click(screen.getByRole('button', { name: 'Add transaction' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add transaction' });
    const amount = within(dialog).getByRole('textbox', { name: 'Amount (INR)' });
    await user.type(amount, '12.345');
    await user.click(within(dialog).getByRole('button', { name: 'Add transaction' }));
    expect(amount).toHaveAccessibleDescription('Use at most 2 decimal places.');
    await user.clear(amount);
    await user.type(amount, '120');
    await user.click(within(dialog).getByRole('button', { name: 'Add transaction' }));
    expect(await screen.findByText('Added expense of ₹120.00.')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    await screen.findByRole('heading', { name: /\w+ \d{4}/ });
    const spending = screen.getByText('Spending', { selector: 'dt' });
    expect(spending.nextElementSibling).toHaveTextContent(
      formatMoney(before.expenseMinor + 12000, 'INR'),
    );
  });

  it('names each chart’s table view after its chart, and shows the figures as a table', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/expense-tracker/demo?feature=overview');
    await screen.findByRole('heading', { name: 'Spending by category this month' });
    expect(screen.getAllByRole('img', { name: /./ })).toHaveLength(2);
    const toggles = screen.getAllByRole('button', { name: /^Table view/ });
    expect(toggles.map((button) => button.textContent)).toEqual([
      'Table view of Spending by category this month',
      'Table view of Income and spending, last 6 months',
    ]);
    const [byCategory] = toggles;
    if (!byCategory) throw new Error('no chart');
    await user.click(byCategory);
    expect(byCategory).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('region', { name: 'Spending by category this month' })).getByRole(
        'table',
      ),
    ).toBeInTheDocument();
  });

  it('filters by period and category, with totals for the filtered list', async () => {
    const user = userEvent.setup();
    const today = todayKey();
    const expected = filterTransactions(
      createDemoData('INR', new Date()).transactions,
      { ...DEFAULT_FILTERS, period: 'last-month', categoryId: 'food' },
      today,
    );
    renderRoute('/projects/expense-tracker/demo?feature=transactions');
    await screen.findByRole('heading', { name: 'Transactions' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Period' }), 'last-month');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'food');
    expect(
      screen.getByText(new RegExp(`^Showing ${expected.length} of \\d+ transactions$`)),
    ).toBeInTheDocument();
    const net = screen.getByText('Net').nextElementSibling;
    expect(net).toHaveTextContent(formatMoney(-totals(expected).expenseMinor, 'INR'));
    await user.click(screen.getAllByRole('button', { name: 'Reset filters' })[0] as HTMLElement);
    expect(screen.getByText(/^Showing all \d+ transactions$/)).toBeInTheDocument();
  });

  it('moves focus to a remaining transaction after deleting one, or to the filter reset', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/expense-tracker/demo?feature=transactions');
    await screen.findByRole('heading', { name: 'Transactions' });

    const before = labels();
    await deleteRow(user, 2, 'Delete transaction');
    expect(deleteButtons()[2]).toHaveFocus();
    expect(deleteButtons()[2]).toHaveAccessibleName(before[3] ?? '');
    expect(screen.getByText('Deleted the transaction.')).toBeInTheDocument();

    // Filtered down to one transaction: focus goes to the reset in the "no match" message.
    const note = (before[0] ?? '').replace(/^Delete (.+) on .+$/, '$1');
    await user.type(screen.getByRole('searchbox', { name: 'Search notes' }), note);
    await waitFor(() => expect(deleteButtons().length).toBeGreaterThan(0));
    while (deleteButtons().length > 0) await deleteRow(user, 0, 'Delete transaction');
    const noMatch = screen.getByText('No transactions match these filters.').parentElement;
    expect(document.activeElement).toHaveAccessibleName('Reset filters');
    expect(noMatch).toContainElement(document.activeElement as HTMLElement);
  });

  it('sets the monthly budget with the template’s rules', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/expense-tracker/demo?feature=budget');
    const field = await screen.findByRole('textbox', { name: 'Monthly budget (INR)' });
    await user.clear(field);
    await user.type(field, '5,0000');
    await user.click(screen.getByRole('button', { name: 'Save budget' }));
    expect(field).toHaveAccessibleDescription(/Use digits only.*Enter 0 to turn the budget off\./);
    await user.clear(field);
    await user.type(field, '5000');
    await user.click(screen.getByRole('button', { name: 'Save budget' }));
    expect(await screen.findByText('Monthly budget set to ₹5,000.00.')).toBeInTheDocument();
    expect(screen.getByText(/of ₹5,000\.00 spent/)).toBeInTheDocument();
  });
});

describe('demo studio: result analyzer', () => {
  it('stops the analysis for the file with mistakes, like the real app', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/student-result-analyzer/demo');
    expect(
      await screen.findByText(/40 students and 5 subjects passed validation/),
    ).toBeInTheDocument();
    expect(screen.getByText(/browser does not run Python/)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /File with mistakes/ }));
    expect(await screen.findByText('Name is empty on line(s) 4.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Mathematics: scores must be between 0 and 100, but found 105 (line 3), -4 (line 6).',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(
      screen.getByRole('heading', { name: 'This file can’t be analysed yet' }),
    ).toBeInTheDocument();
  });

  it('analyses edited CSV text', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/student-result-analyzer/demo');
    await screen.findByText(/40 students and 5 subjects passed validation/);
    await user.click(screen.getByText('Edit the CSV text'));
    const editor = screen.getByRole('textbox', { name: 'CSV text' });
    await user.clear(editor);
    await user.type(editor, 'Student ID,Name,Maths{Enter}S1,Ann,105');
    await user.click(screen.getByRole('button', { name: 'Analyse this file' }));
    expect(
      await screen.findByText('Maths: scores must be between 0 and 100, but found 105 (line 2).'),
    ).toBeInTheDocument();
  });

  it('finds a student’s rank and explains an incomplete result', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/student-result-analyzer/demo?feature=students');
    const search = await screen.findByRole('searchbox', { name: 'Search by name or student ID' });
    await user.type(search, 'Navya');
    expect(screen.getByText('Showing 1 of 40 students')).toBeInTheDocument();
    const row = screen.getByRole('rowheader', { name: /Navya Das/ }).closest('tr');
    if (!row) throw new Error('missing row');
    expect(within(row).getByText('39')).toBeInTheDocument();
    expect(within(row).getByText('48.50')).toBeInTheDocument();
    expect(within(row).getByText('Incomplete')).toBeInTheDocument();
    await waitFor(() => expect(window.sessionStorage.length).toBeGreaterThan(0));
  });
});
