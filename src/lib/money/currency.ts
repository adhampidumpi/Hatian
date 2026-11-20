import * as currencies from "dinero.js/currencies";

/**
 * Largest amount a money column can hold: amounts are stored in Postgres
 * `integer` columns (32-bit), in minor units. ₱21,474,836.47 for PHP.
 * Validate against this before anything reaches the database.
 */
export const MAX_MINOR = 2_147_483_647;

export type CurrencyCode = keyof typeof currencies;

/**
 * ISO 4217 codes we can handle. Excludes MGA and MRU, whose minor unit is a
 * fifth rather than a power of ten, which formatting and parsing don't support.
 */
export function isCurrencyCode(code: string): code is CurrencyCode {
  return (
    Object.prototype.hasOwnProperty.call(currencies, code) &&
    currencies[code as CurrencyCode].base === 10
  );
}

export function getCurrency(code: string) {
  if (!isCurrencyCode(code)) throw new Error(`Unsupported currency: ${code}`);
  return currencies[code];
}

/** Number of minor-unit digits (2 for PHP, 0 for JPY). */
export function currencyExponent(code: string): number {
  return getCurrency(code).exponent;
}

/** True for a whole, non-negative number of minor units that fits a column. */
export function isValidMinor(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= MAX_MINOR;
}
