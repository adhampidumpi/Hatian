import { currencyExponent, MAX_MINOR } from "./currency";

/** U+2212, the typographic minus used in the designs ("−₱2,500.00"). */
const MINUS = "−";

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
  })
    .format(amount / 10 ** exponent)
    .replace("-", MINUS);
}

/** "₱" for PHP, "$" for USD: the short symbol used next to inputs. */
export function currencySymbol(currency: string, locale = "en-PH"): string {
  return (
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
}

/** Plain decimal for files and inputs, no symbol or grouping: "12500.00". */
export function formatDecimal(amount: number, currency: string): string {
  const exponent = currencyExponent(currency);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (exponent === 0) return `${sign}${abs}`;
  const unit = 10 ** exponent;
  const fraction = String(abs % unit).padStart(exponent, "0");
  return `${sign}${Math.floor(abs / unit)}.${fraction}`;
}

/**
 * Short signed balance without the currency symbol, for tight spaces like the
 * sidebar: "+13,753", "−2,450". Rounds to whole units, except that amounts
 * under one unit keep their decimals so a non-zero balance never reads "0".
 */
export function formatCompact(
  amount: number,
  currency: string,
  { locale = "en-PH" }: { locale?: string } = {},
): string {
  const exponent = currencyExponent(currency);
  const units = amount / 10 ** exponent;
  const keepDecimals = amount !== 0 && Math.abs(amount) < 10 ** exponent;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: keepDecimals ? exponent : 0,
    maximumFractionDigits: keepDecimals ? exponent : 0,
    signDisplay: "exceptZero",
  })
    .format(units)
    .replace("-", MINUS);
}

/**
 * Parse what a person typed ("1,250.5", "₱ 1250") into minor units without
 * going through floating point. Commas are accepted only as thousands
 * separators in groups of three, so a decimal comma ("1,25") is rejected
 * rather than misread as 125. Returns null for anything that isn't a
 * non-negative amount with at most `exponent` decimals that fits a column.
 */
export function parseAmount(input: string, currency: string): number | null {
  const exponent = currencyExponent(currency);
  // Drop spaces and a leading currency symbol or code ("₱", "PHP").
  const cleaned = input.replace(/\s/g, "").replace(/^[^\d.,-]+/, "");
  const match = /^(\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d*))?$/.exec(cleaned);
  if (!match || cleaned === "" || cleaned === ".") return null;

  const whole = (match[1] ?? "").replace(/,/g, "");
  const fraction = match[2] ?? "";
  if (fraction.length > exponent) return null;

  const minor =
    Number(whole || "0") * 10 ** exponent +
    Number(fraction.padEnd(exponent, "0") || "0");
  return Number.isSafeInteger(minor) && minor <= MAX_MINOR ? minor : null;
}
