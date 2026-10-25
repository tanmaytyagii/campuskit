/**
 * Number formatting and rounding that match Python and numpy exactly. Python
 * formats from a float's exact binary value and rounds ties to even, so
 * 62.25 becomes "62.2" with one decimal; JavaScript's toFixed gives "62.3".
 * The analyzer's messages and explanations are built with Python formatting,
 * so the browser port uses these helpers to produce the same text.
 */

/** The exact value of a finite double: mantissa × 2^exponent. */
function decompose(value: number): { mantissa: bigint; exponent: number } {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, Math.abs(value));
  const high = view.getUint32(0);
  const low = view.getUint32(4);
  const biased = (high >>> 20) & 0x7ff;
  let mantissa = (BigInt(high & 0xfffff) << 32n) | BigInt(low);
  if (biased === 0) return { mantissa, exponent: -1074 };
  mantissa |= 1n << 52n;
  return { mantissa, exponent: biased - 1075 };
}

/** numerator ÷ denominator rounded to an integer, ties to even. */
function divideHalfEven(numerator: bigint, denominator: bigint): bigint {
  let quotient = numerator / denominator;
  const twice = (numerator % denominator) * 2n;
  if (twice > denominator || (twice === denominator && quotient % 2n === 1n)) quotient += 1n;
  return quotient;
}

/** |value| as an exact fraction. */
function fraction(value: number): { numerator: bigint; denominator: bigint } {
  const { mantissa, exponent } = decompose(value);
  return exponent >= 0
    ? { numerator: mantissa << BigInt(exponent), denominator: 1n }
    : { numerator: mantissa, denominator: 1n << BigInt(-exponent) };
}

function nonFinite(value: number): string | null {
  if (Number.isNaN(value)) return 'nan';
  if (!Number.isFinite(value)) return value > 0 ? 'inf' : '-inf';
  return null;
}

/** Python's f"{value:.{digits}f}". */
export function formatFixed(value: number, digits: number): string {
  const special = nonFinite(value);
  if (special) return special;
  const { numerator, denominator } = fraction(value);
  const scaled = divideHalfEven(numerator * 10n ** BigInt(digits), denominator);
  const sign = value < 0 || Object.is(value, -0) ? '-' : '';
  const text = scaled.toString().padStart(digits + 1, '0');
  return digits === 0
    ? `${sign}${text}`
    : `${sign}${text.slice(0, -digits)}.${text.slice(-digits)}`;
}

/** Python's f"{value:g}": six significant digits, trailing zeros removed. */
export function formatGeneral(value: number, precision = 6): string {
  const special = nonFinite(value);
  if (special) return special;
  if (value === 0) return Object.is(value, -0) ? '-0' : '0';
  const sign = value < 0 ? '-' : '';
  const { numerator, denominator } = fraction(value);
  const power = (k: number) => 10n ** BigInt(Math.abs(k));
  const atLeast = (k: number) =>
    k >= 0 ? numerator >= denominator * power(k) : numerator * power(k) >= denominator;
  let exponent = Math.floor(Math.log10(Math.abs(value)));
  while (!atLeast(exponent)) exponent -= 1;
  while (atLeast(exponent + 1)) exponent += 1;
  const shift = exponent - precision + 1;
  let digits =
    shift >= 0
      ? divideHalfEven(numerator, denominator * power(shift))
      : divideHalfEven(numerator * power(shift), denominator);
  if (digits === 10n ** BigInt(precision)) {
    digits = 10n ** BigInt(precision - 1);
    exponent += 1;
  }
  const text = digits.toString();
  const strip = (part: string) => part.replace(/\.?0+$/, '');
  if (exponent >= -4 && exponent < precision) {
    const decimals = precision - 1 - exponent;
    const padded = text.padStart(decimals + 1, '0');
    const whole = padded.slice(0, padded.length - decimals);
    const rest = padded.slice(padded.length - decimals);
    return `${sign}${decimals > 0 ? strip(`${whole}.${rest}`) : whole}`;
  }
  const mantissa = strip(`${text[0] ?? '0'}.${text.slice(1)}`);
  const magnitude = Math.abs(exponent).toString().padStart(2, '0');
  return `${sign}${mantissa}e${exponent < 0 ? '-' : '+'}${magnitude}`;
}

/** numpy's rint: rounds to the nearest integer, ties to even. */
function rint(value: number): number {
  const floor = Math.floor(value);
  const difference = value - floor;
  if (difference > 0.5) return floor + 1;
  if (difference < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

/** pandas' Series.round(decimals), which is numpy's around: rint(value × 10ⁿ) ÷ 10ⁿ. */
export function roundLikeNumpy(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return rint(value * scale) / scale;
}
