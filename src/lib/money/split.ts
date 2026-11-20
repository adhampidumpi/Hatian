import { getCurrency, isValidMinor } from "./currency";

export type SplitMode = "EQUAL" | "SHARES" | "PERCENT" | "EXACT";

/**
 * One participant's input to a split.
 * - EQUAL: 1 to include, 0 to leave out
 * - SHARES: share count (e.g. 2 for a couple)
 * - PERCENT: basis points (10000 = 100%)
 * - EXACT: the amount in minor units
 */
export type SplitInput = { userId: string; weight: number };

export type Share = { userId: string; weight: number; amount: number };

export type SplitError =
  | { code: "INVALID_AMOUNT" }
  | { code: "INVALID_WEIGHT"; userId: string }
  | { code: "NO_PARTICIPANTS" }
  /** `remaining` is in basis points: positive means still to assign. */
  | { code: "PERCENT_MISMATCH"; remaining: number }
  /** `remaining` is in minor units: positive means still to assign. */
  | { code: "EXACT_MISMATCH"; remaining: number };

export type SplitResult =
  | {
      ok: true;
      shares: Share[];
      /** Users whose share was rounded up by one minor unit (the "extra centavo"). */
      roundedUp: string[];
    }
  | { ok: false; error: SplitError };

export const FULL_PERCENT_BP = 10_000;

/**
 * Turn an expense amount and per-person inputs into exact per-person shares.
 *
 * Shares always add up to `amount`. Leftover minor units from rounding go to
 * the largest fractional remainders (ties: earliest in `inputs` order), so
 * the caller's ordering decides who gets the extra centavo in an equal split.
 * Amounts and weights must fit the database's integer columns (MAX_MINOR).
 */
export function allocateShares(
  amount: number,
  currency: string,
  mode: SplitMode,
  inputs: SplitInput[],
): SplitResult {
  if (!isValidMinor(amount) || amount === 0) {
    return fail({ code: "INVALID_AMOUNT" });
  }
  for (const input of inputs) {
    if (!isValidMinor(input.weight)) {
      return fail({ code: "INVALID_WEIGHT", userId: input.userId });
    }
    if (mode === "EQUAL" && input.weight > 1) {
      return fail({ code: "INVALID_WEIGHT", userId: input.userId });
    }
  }

  const participants = inputs.filter((i) => i.weight > 0);
  if (participants.length === 0) return fail({ code: "NO_PARTICIPANTS" });

  const totalWeight = sum(participants.map((p) => p.weight));

  if (mode === "EXACT") {
    if (totalWeight !== amount) {
      return fail({ code: "EXACT_MISMATCH", remaining: amount - totalWeight });
    }
    return {
      ok: true,
      shares: participants.map((p) => ({ ...p, amount: p.weight })),
      roundedUp: [],
    };
  }

  if (mode === "PERCENT" && totalWeight !== FULL_PERCENT_BP) {
    return fail({
      code: "PERCENT_MISMATCH",
      remaining: FULL_PERCENT_BP - totalWeight,
    });
  }

  getCurrency(currency); // throws on an unknown code
  const amounts = largestRemainder(
    amount,
    participants.map((p) => p.weight),
  );
  const shares = participants.map((p, i) => ({ ...p, amount: amounts[i]! }));
  const roundedUp = shares
    .filter(
      (s, i) =>
        s.amount > floorShare(amount, participants[i]!.weight, totalWeight),
    )
    .map((s) => s.userId);

  return { ok: true, shares, roundedUp };
}

/**
 * Largest-remainder (Hamilton) apportionment, the method Spliit uses: floor
 * every exact share, then hand the leftover units one each to the largest
 * fractional remainders. Ties go to the earliest entry, so input order decides
 * who gets the extra centavo in an equal split.
 *
 * Not dinero.js `allocate()`: that gives leftovers to the largest *ratios*, so
 * 5:1:4 of an amount whose first share is already whole would still round the
 * first person up. BigInt keeps amount × weight exact for any input.
 */
export function largestRemainder(amount: number, weights: number[]): number[] {
  const total = BigInt(sum(weights));
  const exact = weights.map((w) => BigInt(amount) * BigInt(w));
  const floors = exact.map((e) => e / total);
  let leftover = amount - sum(floors.map(Number));

  const order = exact
    .map((e, index) => ({ index, rem: e % total }))
    .sort((a, b) =>
      a.rem === b.rem ? a.index - b.index : a.rem > b.rem ? -1 : 1,
    );

  const result = floors.map(Number);
  for (const { index } of order) {
    if (leftover === 0) break;
    result[index]! += 1;
    leftover -= 1;
  }
  return result;
}

function floorShare(amount: number, weight: number, total: number): number {
  return Number((BigInt(amount) * BigInt(weight)) / BigInt(total));
}

function fail(error: SplitError): SplitResult {
  return { ok: false, error };
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
