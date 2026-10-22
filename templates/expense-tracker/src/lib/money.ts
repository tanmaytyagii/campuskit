/**
 * Money helpers. Amounts are stored as whole numbers of the currency's
 * smallest unit (for example paise for INR, cents for USD; yen has none), so
 * adding many transactions never produces rounding errors.
 */
import { CURRENCIES, type CurrencyCode } from '../config';

/** The largest amount accepted for one transaction, in whole currency units. */
export const MAX_AMOUNT = 100_000_000;

const formatters = new Map<CurrencyCode, Intl.NumberFormat>();

function formatter(currency: CurrencyCode): Intl.NumberFormat {
  let existing = formatters.get(currency);
  if (!existing) {
    existing = new Intl.NumberFormat(CURRENCIES[currency].locale, { style: 'currency', currency });
    formatters.set(currency, existing);
  }
  return existing;
}

/** Number of decimal places the currency uses: 2 for INR and USD, 0 for JPY. */
export function currencyDigits(currency: CurrencyCode): number {
  return formatter(currency).resolvedOptions().maximumFractionDigits ?? 2;
}

export function formatMoney(amountMinor: number, currency: CurrencyCode): string {
  return formatter(currency).format(amountMinor / 10 ** currencyDigits(currency));
}

/** Compact axis labels such as "₹15K". */
export function formatMoneyCompact(amountMinor: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat(CURRENCIES[currency].locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amountMinor / 10 ** currencyDigits(currency));
}

export type ParsedAmount = { ok: true; amountMinor: number } | { ok: false; error: string };

/**
 * Parses what a person typed ("1,250.50", "800", "12.5") into minor units
 * using string arithmetic, so no floating-point rounding can creep in.
 */
export function parseAmount(input: string, currency: CurrencyCode): ParsedAmount {
  const trimmed = input.trim();
  const text = trimmed.startsWith('.') ? `0${trimmed}` : trimmed;
  if (text === '') return { ok: false, error: 'Enter an amount.' };
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d*)?$/.test(text)) {
    return { ok: false, error: 'Use digits only, for example 1250 or 1,250.50.' };
  }
  const [whole = '', fraction = ''] = text.replace(/,/g, '').split('.');
  const digits = currencyDigits(currency);
  if (fraction.length > digits) {
    return {
      ok: false,
      error:
        digits === 0
          ? `${currency} amounts have no decimal places.`
          : `Use at most ${digits} decimal places.`,
    };
  }
  const wholeNumber = Number(whole);
  if (wholeNumber > MAX_AMOUNT)
    return { ok: false, error: `Amounts above ${MAX_AMOUNT.toLocaleString()} are not supported.` };
  const amountMinor = wholeNumber * 10 ** digits + Number(fraction.padEnd(digits, '0') || '0');
  if (amountMinor <= 0) return { ok: false, error: 'The amount must be greater than zero.' };
  return { ok: true, amountMinor };
}

/** Converts minor units back to the text shown in the amount field ("1250.50"). */
export function toAmountInput(amountMinor: number, currency: CurrencyCode): string {
  const digits = currencyDigits(currency);
  if (digits === 0) return String(amountMinor);
  const whole = Math.floor(amountMinor / 10 ** digits);
  const fraction = String(amountMinor % 10 ** digits).padStart(digits, '0');
  return `${whole}.${fraction}`;
}

export function majorToMinor(amount: number, currency: CurrencyCode): number {
  return Math.round(amount * 10 ** currencyDigits(currency));
}
