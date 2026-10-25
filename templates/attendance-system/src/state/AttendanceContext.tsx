/**
 * Makes the attendance data available to every component and saves it to
 * localStorage whenever it changes.
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

import { createDemoData, createEmptyData } from '../lib/demo-data';
import { getBrowserStorage, loadData, saveData, type LoadResult } from '../lib/storage';
import type { AttendanceData } from '../types';
import { attendanceReducer, type AttendanceAction } from './reducer';

export type StorageState =
  | { kind: 'ok' }
  /** Some saved data was left out; a copy of it is under `backupKey`. */
  | { kind: 'partial'; reason: string; backupKey: string }
  /** Nothing saved could be used, so the app started fresh; a copy is under `backupKey`. */
  | { kind: 'recovered'; reason: string; backupKey: string }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'save-failed'; reason: string };

interface AttendanceContextValue {
  data: AttendanceData;
  dispatch: (action: AttendanceAction) => void;
  storageState: StorageState;
}

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
  /** Load demo data when nothing has been saved yet (from app.config.json). */
  seedDemoData: boolean;
  /** Injected in tests; defaults to window.localStorage. */
  storage?: Storage | null;
}

function initialData(result: LoadResult, seedDemoData: boolean): AttendanceData {
  if (result.status === 'loaded' || result.status === 'partial') return result.data;
  return seedDemoData ? createDemoData() : createEmptyData();
}

export function AttendanceProvider({ children, seedDemoData, storage }: ProviderProps) {
  const [store] = useState(() => (storage === undefined ? getBrowserStorage() : storage));
  const [loadResult] = useState(() => loadData(store));
  const [data, dispatch] = useReducer(attendanceReducer, undefined, () =>
    initialData(loadResult, seedDemoData),
  );
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

  const value = useMemo(() => ({ data, dispatch, storageState }), [data, storageState]);
  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}

export function useAttendance(): AttendanceContextValue {
  const value = useContext(AttendanceContext);
  if (!value) throw new Error('useAttendance must be used inside <AttendanceProvider>');
  return value;
}
