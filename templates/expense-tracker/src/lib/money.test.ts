import { describe, expect, it } from 'vitest';

import { currencyDigits, formatMoney, majorToMinor, parseAmount, toAmountInput } from './money';

// Intl output uses narrow/no-break spaces in some locales; normalise for comparisons.
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');

describe('money', () => {
  it('knows how many decimal places each currency uses', () => {
    expect(currencyDigits('INR')).toBe(2);
    expect(currencyDigits('USD')).toBe(2);
    expect(currencyDigits('JPY')).toBe(0);
  });

  it('formats amounts with the currency’s own grouping', () => {
    expect(plain(formatMoney(15000000, 'INR'))).toBe('₹1,50,000.00');
    expect(plain(formatMoney(123456, 'USD'))).toBe('$1,234.56');
    expect(plain(formatMoney(1200, 'JPY'))).toMatch(/[¥￥]1,200/);
  });

  it.each([
    ['250', 'INR', 25000],
    ['250.5', 'INR', 25050],
    ['1,250.75', 'USD', 125075],
    ['.5', 'USD', 50],
    ['0.1', 'USD', 10],
    ['1200', 'JPY', 1200],
  ] as const)(
    'parses %s %s into %i minor units without rounding errors',
    (input, currency, expected) => {
      expect(parseAmount(input, currency)).toEqual({ ok: true, amountMinor: expected });
    },
  );

  it.each([
    ['', 'INR', /Enter an amount/],
    ['abc', 'INR', /digits only/],
    ['-5', 'INR', /digits only/],
    ['1,25', 'INR', /digits only/],
    ['10.555', 'INR', /at most 2 decimal places/],
    ['10.5', 'JPY', /no decimal places/],
    ['0', 'INR', /greater than zero/],
    ['200000000', 'INR', /not supported/],
  ] as const)('rejects %j for %s', (input, currency, message) => {
    const result = parseAmount(input, currency);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });

  it('round-trips amounts through the input field format', () => {
    expect(toAmountInput(125075, 'USD')).toBe('1250.75');
    expect(toAmountInput(500, 'INR')).toBe('5.00');
    expect(toAmountInput(1200, 'JPY')).toBe('1200');
    expect(majorToMinor(15000, 'INR')).toBe(1500000);
  });
});
