/**
 * Shares the expense data with every component and saves it to localStorage
 * whenever it changes.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';

import type { AppConfig } from '../config';
import { createDemoData, createEmptyData } from '../lib/demo-data';
import { majorToMinor } from '../lib/money';
import { getBrowserStorage, loadData, saveData } from '../lib/storage';
import type { ExpenseData } from '../types';
import { expenseReducer, type ExpenseAction } from './reducer';

export type StorageState =
  | { kind: 'ok' }
  /** Some saved data was left out; a copy of it is under `backupKey`. */
  | { kind: 'partial'; reason: string; backupKey: string }
  /** Nothing saved could be used, so the app started fresh; a copy is under `backupKey`. */
  | { kind: 'recovered'; reason: string; backupKey: string }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'save-failed'; reason: string };

interface ExpenseContextValue {
  data: ExpenseData;
  dispatch: (action: ExpenseAction) => void;
  storageState: StorageState;
  /** The budget in use: the saved override, or the default from app.config.json. */
  budgetMinor: number;
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
  config: AppConfig;
  storage?: Storage | null;
}

export function ExpenseProvider({ children, config, storage }: ProviderProps) {
  const [store] = useState(() => (storage === undefined ? getBrowserStorage() : storage));
  const [loadResult] = useState(() => loadData(store));
  const [data, dispatch] = useReducer(expenseReducer, undefined, () => {
    if (loadResult.status === 'loaded' || loadResult.status === 'partial') return loadResult.data;
    return config.seedDemoData ? createDemoData(config.currency) : createEmptyData();
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  // Saving replaces the saved data. If some of it couldn't be read and no copy could be kept,
  // nothing is saved, so that data isn't lost.
  const keepsSavedData =
    (loadResult.status === 'partial' || loadResult.status === 'invalid') &&
    loadResult.backupKey === null;

  // Saving is a side effect of the data changing, so it runs in an effect. Whether it worked is
  // only known afterwards, so the result is stored here; React skips the extra render when the
  // value is unchanged (null after every successful save).
  useEffect(() => {
    if (keepsSavedData) return;
    const result = saveData(store, data);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- records the outcome of the save above
    setSaveError(result.ok ? null : result.reason);
  }, [store, data, keepsSavedData]);

  const storageState: StorageState = useMemo(() => {
    if (loadResult.status === 'unavailable')
      return { kind: 'unavailable', reason: loadResult.reason };
    if (keepsSavedData)
      return {
        kind: 'unavailable',
        reason: `some saved data couldn’t be read (${loadResult.reason}) and the browser refused to keep a copy, so saving would lose it`,
      };
    if (saveError) return { kind: 'save-failed', reason: saveError };
    if (loadResult.status === 'partial' && loadResult.backupKey)
      return { kind: 'partial', reason: loadResult.reason, backupKey: loadResult.backupKey };
    if (loadResult.status === 'invalid' && loadResult.backupKey)
      return { kind: 'recovered', reason: loadResult.reason, backupKey: loadResult.backupKey };
    return { kind: 'ok' };
  }, [loadResult, keepsSavedData, saveError]);

  const budgetMinor =
    data.settings.monthlyBudgetMinor ?? majorToMinor(config.monthlyBudget, config.currency);
  const value = useMemo(
    () => ({ data, dispatch, storageState, budgetMinor }),
    [data, storageState, budgetMinor],
  );
  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}

export function useExpenses(): ExpenseContextValue {
  const value = useContext(ExpenseContext);
  if (!value) throw new Error('useExpenses must be used inside <ExpenseProvider>');
  return value;
}
