import "server-only";
import { z } from "zod";
import { isoDate } from "@/lib/activity";
import { db } from "../db";
import { unavailable } from "./errors";

const FRANKFURTER = "https://api.frankfurter.dev/v1";

/**
 * The ECB publishes each day's rates around 16:00 CET; until then Frankfurter
 * answers with the previous day's. So today's rate is checked again hourly,
 * and past days are cached for good.
 */
const PROVISIONAL_FOR_MS = 60 * 60 * 1000;

const responseSchema = z.object({
  rates: z.record(z.string(), z.number().positive()),
});

/**
 * Units of `quote` per one unit of `base` on `date` (YYYY-MM-DD), as a
 * decimal string. Weekends and holidays get the last business day's rate.
 * Cached in CurrencyRate, so each pair is fetched about once per day.
 */
export async function getRate(
  base: string,
  quote: string,
  date: string,
): Promise<string> {
  if (base === quote) return "1";
  const key = { base, quote, date: new Date(`${date}T00:00:00Z`) };
  const cached = await db.currencyRate.findUnique({
    where: { base_quote_date: key },
  });
  const settled = date < isoDate(new Date());
  if (
    cached &&
    (settled || Date.now() - cached.fetchedAt.getTime() < PROVISIONAL_FOR_MS)
  ) {
    return cached.rate.toFixed();
  }

  const fetched = await fetchRate(base, quote, date);
  if (fetched === null) {
    if (cached) return cached.rate.toFixed(); // stale beats nothing
    throw unavailable("Couldn't get the exchange rate. Try again in a bit.");
  }
  await db.currencyRate.upsert({
    where: { base_quote_date: key },
    create: { ...key, rate: fetched },
    update: { rate: fetched, fetchedAt: new Date() },
  });
  return fetched;
}

async function fetchRate(base: string, quote: string, date: string) {
  try {
    const res = await fetch(
      `${FRANKFURTER}/${date}?base=${base}&symbols=${quote}`,
      { signal: AbortSignal.timeout(5_000), cache: "no-store" },
    );
    if (!res.ok) return null;
    const rate = responseSchema.parse(await res.json()).rates[quote];
    // Fixed-point, as stored (DECIMAL(20,10)), without trailing zeros.
    return rate ? rate.toFixed(10).replace(/\.?0+$/, "") : null;
  } catch {
    return null;
  }
}
