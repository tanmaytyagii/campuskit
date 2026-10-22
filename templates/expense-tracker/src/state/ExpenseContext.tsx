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
  | { kind: 'recovered'; reason: string }
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
    if (loadResult.status === 'loaded') return loadResult.data;
    return config.seedDemoData ? createDemoData(config.currency) : createEmptyData();
  });
  const [saveError, setSaveError] = useState<string | null>(null);

  // Saving is a side effect of the data changing, so it runs in an effect. Whether it worked is
  // only known afterwards, so the result is stored here; React skips the extra render when the
  // value is unchanged (null after every successful save).
  useEffect(() => {
    const result = saveData(store, data);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- records the outcome of the save above
    setSaveError(result.ok ? null : result.reason);
  }, [store, data]);

  const storageState: StorageState = useMemo(() => {
    if (loadResult.status === 'unavailable')
      return { kind: 'unavailable', reason: loadResult.reason };
    if (saveError) return { kind: 'save-failed', reason: saveError };
    if (loadResult.status === 'invalid') return { kind: 'recovered', reason: loadResult.reason };
    return { kind: 'ok' };
  }, [loadResult, saveError]);

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
