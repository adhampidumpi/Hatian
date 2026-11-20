import { dinero, type Dinero } from "dinero.js";
import * as currencies from "dinero.js/currencies";

export type CurrencyCode = keyof typeof currencies;

export function isCurrencyCode(code: string): code is CurrencyCode {
  return Object.prototype.hasOwnProperty.call(currencies, code);
}

export function getCurrency(code: string) {
  if (!isCurrencyCode(code)) throw new Error(`Unknown currency: ${code}`);
  return currencies[code];
}

/** Number of minor-unit digits (2 for PHP, 0 for JPY). */
export function currencyExponent(code: string): number {
  return getCurrency(code).exponent;
}

/** Wrap an integer minor-unit amount in a Dinero object. */
export function toDinero(amount: number, code: string): Dinero<number> {
  if (!Number.isSafeInteger(amount)) {
    throw new Error(`Amount must be an integer in minor units, got ${amount}`);
  }
  return dinero({ amount, currency: getCurrency(code) });
}
