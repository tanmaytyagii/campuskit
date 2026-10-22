/**
 * Transaction categories. Each category belongs to one transaction type and
 * has a chart colour. To add a category, add an entry here; existing data is
 * not affected.
 */
import type { TransactionType } from '../types';

export interface Category {
  id: string;
  label: string;
  type: TransactionType;
  colour: string;
}

export const CATEGORIES: readonly Category[] = [
  { id: 'food', label: 'Food & dining', type: 'expense', colour: '#D97706' },
  { id: 'transport', label: 'Transport', type: 'expense', colour: '#2563EB' },
  { id: 'housing', label: 'Rent & bills', type: 'expense', colour: '#7C3AED' },
  { id: 'education', label: 'Books & supplies', type: 'expense', colour: '#059669' },
  { id: 'shopping', label: 'Shopping', type: 'expense', colour: '#DB2777' },
  { id: 'entertainment', label: 'Entertainment', type: 'expense', colour: '#0891B2' },
  { id: 'health', label: 'Health', type: 'expense', colour: '#DC2626' },
  { id: 'other-expense', label: 'Other spending', type: 'expense', colour: '#64748B' },
  { id: 'allowance', label: 'Allowance', type: 'income', colour: '#047857' },
  { id: 'stipend', label: 'Stipend & part-time work', type: 'income', colour: '#0369A1' },
  { id: 'scholarship', label: 'Scholarship', type: 'income', colour: '#7E22CE' },
  { id: 'gift', label: 'Gifts', type: 'income', colour: '#C2410C' },
  { id: 'other-income', label: 'Other income', type: 'income', colour: '#475569' },
];

const BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));

export function getCategory(id: string): Category | undefined {
  return BY_ID.get(id);
}

export function categoryLabel(id: string): string {
  return BY_ID.get(id)?.label ?? 'Unknown category';
}

export function categoriesFor(type: TransactionType): Category[] {
  return CATEGORIES.filter((category) => category.type === type);
}

export function isCategoryFor(id: string, type: TransactionType): boolean {
  return BY_ID.get(id)?.type === type;
}
