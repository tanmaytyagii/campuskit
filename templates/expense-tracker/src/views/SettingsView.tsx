import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { useNotify } from '../components/Notices';
import { CURRENCIES, THEMES, type AppConfig } from '../config';
import { downloadTextFile } from '../lib/csv';
import { todayKey } from '../lib/dates';
import { createDemoData, createEmptyData } from '../lib/demo-data';
import { formatMoney, majorToMinor, parseAmount, toAmountInput } from '../lib/money';
import { parseBackup, STORAGE_KEY } from '../lib/storage';
import { useExpenses } from '../state/ExpenseContext';
import type { ExpenseData } from '../types';

type Pending =
  { kind: 'demo' } | { kind: 'clear' } | { kind: 'import'; data: ExpenseData; fileName: string };

export function SettingsView({ config }: { config: AppConfig }) {
  const { data, dispatch, budgetMinor } = useExpenses();
  const notify = useNotify();
  const currency = config.currency;
  const defaultBudgetMinor = majorToMinor(config.monthlyBudget, currency);
  const [budgetInput, setBudgetInput] = useState(
    budgetMinor > 0 ? toAmountInput(budgetMinor, currency) : '0',
  );
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const budgetId = useId();

  // Keep the field in sync when the budget changes elsewhere (import, demo data, reset).
  // This adjusts state while rendering, as React recommends, instead of in an effect:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [shownBudget, setShownBudget] = useState(budgetMinor);
  if (shownBudget !== budgetMinor) {
    setShownBudget(budgetMinor);
    setBudgetInput(budgetMinor > 0 ? toAmountInput(budgetMinor, currency) : '0');
  }

  function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (budgetInput.trim() === '0') {
      dispatch({ type: 'budget/set', monthlyBudgetMinor: 0 });
      setBudgetError(null);
      notify('Monthly budget turned off.');
      return;
    }
    const parsed = parseAmount(budgetInput, currency);
    if (!parsed.ok) {
      setBudgetError(`${parsed.error} Enter 0 to turn the budget off.`);
      return;
    }
    setBudgetError(null);
    dispatch({ type: 'budget/set', monthlyBudgetMinor: parsed.amountMinor });
    notify(`Monthly budget set to ${formatMoney(parsed.amountMinor, currency)}.`);
  }

  function resetToDefaultBudget() {
    dispatch({ type: 'budget/set', monthlyBudgetMinor: null });
    setBudgetInput(defaultBudgetMinor > 0 ? toAmountInput(defaultBudgetMinor, currency) : '0');
    setBudgetError(null);
    notify('Using the default budget from app.config.json.');
  }

  function exportBackup() {
    const fileName = `expenses-backup-${todayKey()}.json`;
    downloadTextFile(fileName, `${JSON.stringify(data, null, 2)}\n`, 'application/json');
    notify(`Downloaded ${fileName}.`);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setImportError('That file is larger than 5 MB. Choose a backup exported from this app.');
      return;
    }
    const result = parseBackup(await file.text());
    if (typeof result === 'string') setImportError(`That file can’t be imported: ${result}.`);
    else setPending({ kind: 'import', data: result, fileName: file.name });
  }

  function confirm() {
    if (!pending) return;
    if (pending.kind === 'demo') {
      dispatch({ type: 'data/replace', data: createDemoData(currency) });
      notify('Loaded the demo transactions.');
    } else if (pending.kind === 'clear') {
      dispatch({ type: 'data/replace', data: createEmptyData() });
      notify('Deleted all transactions.');
    } else {
      dispatch({ type: 'data/replace', data: pending.data });
      notify(`Imported ${pending.fileName}.`);
    }
    setPending(null);
  }

  const texts = {
    demo: {
      title: 'Replace your data with demo transactions?',
      message:
        'Your current transactions will be replaced. Export a backup first if you want to keep them.',
      confirm: 'Load demo data',
    },
    clear: {
      title: 'Delete all transactions?',
      message:
        'Every transaction and your budget setting will be deleted from this browser. This can’t be undone.',
      confirm: 'Delete all data',
    },
    import: {
      title: 'Replace your data with this backup?',
      message: 'Your current transactions will be replaced by the contents of the backup file.',
      confirm: 'Import backup',
    },
  } as const;
  const text = pending ? texts[pending.kind] : null;

  return (
    <div className="stack">
      <section className="panel" aria-labelledby="budget-settings-heading">
        <h2 id="budget-settings-heading">Monthly budget</h2>
        <form className="budget-form" onSubmit={saveBudget} noValidate>
          <div className="field">
            <label htmlFor={budgetId}>Budget per month ({currency})</label>
            <input
              id={budgetId}
              inputMode="decimal"
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
              aria-invalid={budgetError ? true : undefined}
              aria-describedby={`${budgetId}-hint${budgetError ? ` ${budgetId}-error` : ''}`}
            />
            <p id={`${budgetId}-hint`} className="muted field-hint">
              Enter 0 to turn the budget off. The default from app.config.json is{' '}
              {config.monthlyBudget > 0 ? formatMoney(defaultBudgetMinor, currency) : 'no budget'}.
            </p>
            {budgetError ? (
              <p id={`${budgetId}-error`} className="field-error">
                {budgetError}
              </p>
            ) : null}
          </div>
          <div className="button-row">
            <button type="submit" className="button button-primary">
              Save budget
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={resetToDefaultBudget}
              disabled={data.settings.monthlyBudgetMinor === null}
            >
              Use default
            </button>
          </div>
        </form>
      </section>

      <section className="panel" aria-labelledby="config-heading">
        <h2 id="config-heading">App configuration</h2>
        <p className="muted">
          These values come from <code>src/app.config.json</code>. Edit that file and restart the
          app to change them.
        </p>
        <dl className="details">
          <div>
            <dt>App name</dt>
            <dd>{config.appName}</dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>{CURRENCIES[currency].label}</dd>
          </div>
          <div>
            <dt>Accent colour</dt>
            <dd>
              <span
                className="swatch"
                style={{ background: THEMES[config.theme].accent }}
                aria-hidden="true"
              />{' '}
              {config.theme}
            </dd>
          </div>
          <div>
            <dt>Demo data on first run</dt>
            <dd>{config.seedDemoData ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </section>

      <section className="panel" aria-labelledby="data-heading">
        <h2 id="data-heading">Your data</h2>
        <p>
          {data.transactions.length}{' '}
          {data.transactions.length === 1 ? 'transaction is' : 'transactions are'} saved in this
          browser only, under the localStorage key <code>{STORAGE_KEY}</code>. Nothing is uploaded
          anywhere.
        </p>
        <div className="button-row">
          <button type="button" className="button button-secondary" onClick={exportBackup}>
            Export backup (JSON)
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => fileInput.current?.click()}
          >
            Import backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            tabIndex={-1}
            aria-label="Choose a backup file to import"
            onChange={handleImport}
          />
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setPending({ kind: 'demo' })}
          >
            Load demo data
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={() => setPending({ kind: 'clear' })}
          >
            Delete all data
          </button>
        </div>
        {importError ? (
          <p className="field-error" role="alert">
            {importError}
          </p>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="reset-heading">
        <h2 id="reset-heading">Resetting data without the app</h2>
        <p>
          Open your browser’s developer tools (F12), go to <strong>Application</strong> (Chrome,
          Edge) or <strong>Storage</strong> (Firefox), choose <strong>Local Storage</strong>, select
          this site and delete the <code>{STORAGE_KEY}</code> entry. Reload the page afterwards.
        </p>
      </section>

      <ConfirmDialog
        open={pending !== null}
        title={text?.title ?? ''}
        message={text?.message ?? ''}
        confirmLabel={text?.confirm ?? 'Confirm'}
        tone={pending?.kind === 'clear' ? 'danger' : 'default'}
        onCancel={() => setPending(null)}
        onConfirm={confirm}
      />
    </div>
  );
}
