import type { CurrencyCode } from '../config';
import { getCategory } from '../lib/categories';
import { formatDateKey } from '../lib/dates';
import { formatMoney } from '../lib/money';
import type { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  currency: CurrencyCode;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

/*
 * On small screens styles.css turns each row into a stacked card by changing the
 * CSS display of the table elements, which makes some browsers drop the table's
 * meaning for screen readers. The explicit ARIA table roles below keep it, so the
 * lint rules that call these roles redundant are switched off for this file.
 */
/* eslint-disable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role */

/** A table of transactions; income amounts are marked with "+". */
export function TransactionList({
  transactions,
  currency,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const withActions = Boolean(onEdit || onDelete);
  return (
    <div className="table-wrap">
      <table className="transactions" role="table">
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">
              Date
            </th>
            <th scope="col" role="columnheader">
              Details
            </th>
            <th scope="col" role="columnheader" className="numeric">
              Amount
            </th>
            {withActions ? (
              <th scope="col" role="columnheader">
                <span className="visually-hidden">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {transactions.map((transaction) => {
            const category = getCategory(transaction.categoryId);
            const description = transaction.note || category?.label || 'Transaction';
            return (
              <tr key={transaction.id} role="row">
                <td role="cell" className="nowrap">
                  {formatDateKey(transaction.date)}
                </td>
                <td role="cell">
                  <span className="txn-note">{description}</span>
                  <span className="txn-category">
                    <span
                      className="legend-swatch"
                      style={{ background: category?.colour }}
                      aria-hidden="true"
                    />
                    {category?.label ?? 'Unknown category'}
                  </span>
                </td>
                <td role="cell" className={`numeric nowrap amount amount-${transaction.type}`}>
                  <span className="visually-hidden">
                    {transaction.type === 'income' ? 'Income' : 'Expense'}:{' '}
                  </span>
                  {transaction.type === 'income' ? '+' : '−'}
                  {formatMoney(transaction.amountMinor, currency)}
                </td>
                {withActions ? (
                  <td role="cell" className="row-actions">
                    {onEdit ? (
                      <button
                        type="button"
                        className="button button-small button-secondary"
                        onClick={() => onEdit(transaction)}
                        aria-label={`Edit ${description} on ${formatDateKey(transaction.date)}`}
                      >
                        Edit
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        className="button button-small button-ghost-danger"
                        onClick={() => onDelete(transaction)}
                        aria-label={`Delete ${description} on ${formatDateKey(transaction.date)}`}
                      >
                        Delete
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
