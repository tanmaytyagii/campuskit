/**
 * Every manifest file must be registered here. The raw JSON is imported
 * without validation so the catalog validator can report problems itself;
 * src/index.ts validates it for the app.
 */
import analyzer from '../manifests/student-result-analyzer.json';
import attendance from '../manifests/attendance-system.json';
import expenses from '../manifests/expense-tracker.json';
import type { RawManifest } from './catalog.ts';

export const REGISTERED_MANIFESTS: readonly RawManifest[] = [
  { file: 'attendance-system.json', data: attendance },
  { file: 'expense-tracker.json', data: expenses },
  { file: 'student-result-analyzer.json', data: analyzer },
];
