import { currencyExponent } from "./currency";

/**
 * Format minor units for display, e.g. 1375300 PHP → "₱13,753.00".
 * Formatting happens only at the edge; never feed the result back into maths.
 */
export function formatMoney(
  amount: number,
  currency: string,
  {
    signed = false,
    locale = "en-PH",
  }: { signed?: boolean; locale?: string } = {},
): string {
  const exponent = currencyExponent(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(amount / 10 ** exponent);
}

/**
 * Parse what a person typed ("1,250.5", "₱ 1250") into minor units without
 * going through floating point. Returns null for anything that isn't a
 * non-negative amount with at most `exponent` decimals.
 */
export function parseAmount(input: string, currency: string): number | null {
  const exponent = currencyExponent(currency);
  const cleaned = input.replace(/[\s,]/g, "").replace(/^[^\d.-]+/, "");
  const match = /^(\d*)(?:\.(\d*))?$/.exec(cleaned);
  if (!match || cleaned === "" || cleaned === ".") return null;

  const [, whole = "", fraction = ""] = match;
  if (fraction.length > exponent) return null;

  const minor =
    Number(whole || "0") * 10 ** exponent +
    Number(fraction.padEnd(exponent, "0") || "0");
  return Number.isSafeInteger(minor) ? minor : null;
}
