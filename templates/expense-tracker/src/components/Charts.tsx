/**
 * Charts drawn with Recharts. Each chart has a "Show as table" toggle with the
 * same numbers, so the information never depends on seeing colours.
 */
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { CurrencyCode } from '../config';
import type { CategoryTotal, MonthTotal } from '../lib/analytics';
import { formatMoney, formatMoneyCompact } from '../lib/money';

const INCOME_COLOUR = '#059669';
const EXPENSE_COLOUR = '#E11D48';

function percent(share: number): string {
  return `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`;
}

function TableToggle({ showTable, onToggle }: { showTable: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="button button-small button-secondary"
      aria-pressed={showTable}
      onClick={onToggle}
    >
      {showTable ? 'Show chart' : 'Show as table'}
    </button>
  );
}

export function CategoryChart({
  data,
  currency,
  title,
}: {
  data: CategoryTotal[];
  currency: CurrencyCode;
  title: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const total = data.reduce((sum, item) => sum + item.totalMinor, 0);
  const summary = data
    .slice(0, 3)
    .map((item) => `${item.label} ${percent(item.share)}`)
    .join(', ');

  return (
    <section className="panel chart-panel" aria-labelledby="category-chart-title">
      <div className="panel-heading">
        <h2 id="category-chart-title">{title}</h2>
        {data.length > 0 ? (
          <TableToggle showTable={showTable} onToggle={() => setShowTable((value) => !value)} />
        ) : null}
      </div>
      {data.length === 0 ? (
        <p className="muted">No spending in this period yet.</p>
      ) : showTable ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col" className="numeric">
                  Spent
                </th>
                <th scope="col" className="numeric">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.categoryId}>
                  <td>{item.label}</td>
                  <td className="numeric">{formatMoney(item.totalMinor, currency)}</td>
                  <td className="numeric">{percent(item.share)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="numeric">{formatMoney(total, currency)}</td>
                <td className="numeric">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="donut-layout">
          <div className="donut" role="img" aria-label={`Spending by category: ${summary}`}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="totalMinor"
                  nameKey="label"
                  innerRadius="60%"
                  outerRadius="92%"
                  paddingAngle={1.5}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((item) => (
                    <Cell key={item.categoryId} fill={item.colour} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMoney(Number(value), currency)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-centre" aria-hidden="true">
              <span className="muted">Total</span>
              <strong>{formatMoney(total, currency)}</strong>
            </div>
          </div>
          <ul className="legend">
            {data.map((item) => (
              <li key={item.categoryId}>
                <span
                  className="legend-swatch"
                  style={{ background: item.colour }}
                  aria-hidden="true"
                />
                <span className="legend-label">{item.label}</span>
                <span className="legend-value">{formatMoney(item.totalMinor, currency)}</span>
                <span className="legend-share muted">{percent(item.share)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function MonthlyChart({ data, currency }: { data: MonthTotal[]; currency: CurrencyCode }) {
  const [showTable, setShowTable] = useState(false);
  const hasData = data.some((month) => month.incomeMinor > 0 || month.expenseMinor > 0);

  return (
    <section className="panel chart-panel" aria-labelledby="monthly-chart-title">
      <div className="panel-heading">
        <h2 id="monthly-chart-title">Income and spending, last {data.length} months</h2>
        {hasData ? (
          <TableToggle showTable={showTable} onToggle={() => setShowTable((value) => !value)} />
        ) : null}
      </div>
      {!hasData ? (
        <p className="muted">Add transactions to see your monthly trend.</p>
      ) : showTable ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" className="numeric">
                  Income
                </th>
                <th scope="col" className="numeric">
                  Spending
                </th>
                <th scope="col" className="numeric">
                  Difference
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((month) => (
                <tr key={month.month}>
                  <td>{month.label}</td>
                  <td className="numeric">{formatMoney(month.incomeMinor, currency)}</td>
                  <td className="numeric">{formatMoney(month.expenseMinor, currency)}</td>
                  <td className="numeric">
                    {formatMoney(month.incomeMinor - month.expenseMinor, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="bar-chart"
          role="img"
          aria-label={`Monthly income and spending. ${data
            .map(
              (month) =>
                `${month.label}: income ${formatMoney(month.incomeMinor, currency)}, spending ${formatMoney(month.expenseMinor, currency)}`,
            )
            .join('; ')}`}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={4}>
              <CartesianGrid vertical={false} stroke="#94A3B8" strokeOpacity={0.3} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'currentColor', fontSize: 13 }}
              />
              <YAxis
                tickFormatter={(value: number) => formatMoneyCompact(value, currency)}
                tickLine={false}
                axisLine={false}
                width={70}
                tick={{ fill: 'currentColor', fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => formatMoney(Number(value), currency)}
                cursor={{ fill: '#94A3B8', fillOpacity: 0.15 }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar
                dataKey="incomeMinor"
                name="Income"
                fill={INCOME_COLOUR}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="expenseMinor"
                name="Spending"
                fill={EXPENSE_COLOUR}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
