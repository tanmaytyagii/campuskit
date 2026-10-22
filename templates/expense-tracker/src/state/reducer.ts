/**
 * Every change to the data goes through this pure reducer:
 * (current data, action) => new data. Nothing is modified in place.
 */
import type { ExpenseData, Transaction } from '../types';

export type ExpenseAction =
  | { type: 'transaction/add'; transaction: Transaction }
  | { type: 'transaction/update'; transaction: Transaction }
  | { type: 'transaction/delete'; id: string }
  | { type: 'budget/set'; monthlyBudgetMinor: number | null }
  | { type: 'data/replace'; data: ExpenseData };

export function expenseReducer(state: ExpenseData, action: ExpenseAction): ExpenseData {
  switch (action.type) {
    case 'transaction/add':
      return { ...state, transactions: [...state.transactions, action.transaction] };
    case 'transaction/update':
      return {
        ...state,
        transactions: state.transactions.map((item) =>
          item.id === action.transaction.id ? action.transaction : item,
        ),
      };
    case 'transaction/delete':
      return { ...state, transactions: state.transactions.filter((item) => item.id !== action.id) };
    case 'budget/set':
      return {
        ...state,
        settings: { ...state.settings, monthlyBudgetMinor: action.monthlyBudgetMinor },
      };
    case 'data/replace':
      return action.data;
  }
}
