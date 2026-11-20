import { currencyExponent, MAX_MINOR } from "./currency";
import { largestRemainder, type Share } from "./split";

/**
 * Currencies with daily reference rates (the European Central Bank's set,
 * served by Frankfurter). An expense can be entered in any of them and is
 * converted to the group's currency.
 */
export const RATE_CURRENCIES = [
  "AUD",
  "BRL",
  "CAD",
  "CHF",
  "CNY",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "ISK",
  "JPY",
  "KRW",
  "MXN",
  "MYR",
  "NOK",
  "NZD",
  "PHP",
  "PLN",
  "RON",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "USD",
  "ZAR",
] as const;

export function isRateCurrency(code: string): boolean {
  return (RATE_CURRENCIES as readonly string[]).includes(code);
}

const TWO = BigInt(2);
const TEN = BigInt(10);

/** "63.813" → 63813/1000, exactly. Rates are positive decimal strings. */
function parseRate(rate: string): { num: bigint; den: bigint } {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(rate);
  if (!match) throw new Error(`Not a rate: ${rate}`);
  const fraction = match[2] ?? "";
  const num = BigInt(match[1]! + fraction);
  if (num === BigInt(0)) throw new Error(`Not a rate: ${rate}`);
  return { num, den: TEN ** BigInt(fraction.length) };
}

/**
 * Minor units of `from` in minor units of `to`, at `rate` units of `to` per
 * one unit of `from` (as stored: a decimal string). Exact integer maths,
 * rounded half up. Null when the result is too large for a money column.
 */
export function convertMinor(
  amount: number,
  from: string,
  to: string,
  rate: string,
): number | null {
  const { num, den } = parseRate(rate);
  const top = BigInt(amount) * num * TEN ** BigInt(currencyExponent(to));
  const bottom = den * TEN ** BigInt(currencyExponent(from));
  const result = (TWO * top + bottom) / (TWO * bottom);
  return result <= BigInt(MAX_MINOR) ? Number(result) : null;
}

/**
 * Shares worked out in the currency the expense was paid in, re-expressed
 * in the group's: everyone keeps their proportion, leftover units go by
 * largest remainder, so they add up exactly to the converted `total`.
 */
export function convertShares(shares: Share[], total: number): Share[] {
  const amounts = largestRemainder(
    total,
    shares.map((s) => s.amount),
  );
  return shares.map((s, i) => ({ ...s, amount: amounts[i]! }));
}
