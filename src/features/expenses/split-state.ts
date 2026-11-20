/**
 * The split editor's state and everything derived from it, as plain
 * functions (unit-tested). Uses the same allocateShares as the server, so
 * the preview is exactly what gets saved.
 */
import { minorUnitName } from "@/lib/money/currency";
import { formatDecimal, formatMoney, parseAmount } from "@/lib/money/format";
import {
  allocateShares,
  FULL_PERCENT_BP,
  largestRemainder,
  sum,
  type SplitMode,
} from "@/lib/money/split";

export type SplitState = {
  mode: SplitMode;
  /** EQUAL: who's in. */
  included: Record<string, boolean>;
  /** SHARES: share count per person. */
  shares: Record<string, number>;
  /** PERCENT: basis points per person (10000 = 100%). */
  percent: Record<string, number>;
  /** EXACT: what was typed, per person. */
  exact: Record<string, string>;
};

export type SplitMember = { id: string; label: string };

export const SHARES_MAX = 99;
export const PERCENT_STEP_BP = 500;

/** Defaults: everyone in, 1 share each, an even percentage split, blanks. */
export function initialSplit(
  memberIds: string[],
  currency: string,
  existing?: {
    mode: SplitMode;
    shares: { memberId: string; weight: number; amount: number }[];
  },
): SplitState {
  const even = largestRemainder(
    FULL_PERCENT_BP,
    memberIds.map(() => 1),
  );
  const state: SplitState = {
    mode: existing?.mode ?? "EQUAL",
    included: Object.fromEntries(memberIds.map((id) => [id, true])),
    shares: Object.fromEntries(memberIds.map((id) => [id, 1])),
    percent: Object.fromEntries(memberIds.map((id, i) => [id, even[i] ?? 0])),
    exact: Object.fromEntries(memberIds.map((id) => [id, ""])),
  };
  if (!existing) return state;

  const weightOf = new Map(existing.shares.map((s) => [s.memberId, s]));
  for (const id of memberIds) {
    const share = weightOf.get(id);
    if (existing.mode === "EQUAL") state.included[id] = Boolean(share);
    if (existing.mode === "SHARES") state.shares[id] = share?.weight ?? 0;
    if (existing.mode === "PERCENT") state.percent[id] = share?.weight ?? 0;
    if (existing.mode === "EXACT") {
      // The weight, not the amount: for an expense paid in another currency
      // the amount is converted, the weight is what was typed.
      state.exact[id] = share ? formatDecimal(share.weight, currency) : "";
    }
  }
  return state;
}

export type SplitView = {
  valid: boolean;
  /** Sent to the server (one entry per member, zeros included). */
  weights: { memberId: string; weight: number }[];
  /** Preview per member; null when they're not in the split. */
  amounts: Record<string, number | null>;
  status: string;
  summary: string;
  roundNote: string | null;
  /** Coloured bar: each person's part of the total (0–1). */
  segments: { memberId: string; fraction: number }[];
};

/** Everything the editor shows for a given state and amount. */
export function evaluateSplit(
  state: SplitState,
  amount: number | null,
  currency: string,
  members: SplitMember[],
): SplitView {
  const money = (n: number) => formatMoney(n, currency);
  const label = (id: string) =>
    members.find((m) => m.id === id)?.label ?? "someone";

  let badExact: string | null = null;
  const weights = members.map(({ id }) => {
    switch (state.mode) {
      case "EQUAL":
        return { memberId: id, weight: state.included[id] ? 1 : 0 };
      case "SHARES":
        return { memberId: id, weight: state.shares[id] ?? 0 };
      case "PERCENT":
        return { memberId: id, weight: state.percent[id] ?? 0 };
      case "EXACT": {
        const text = state.exact[id]?.trim() ?? "";
        const parsed = text === "" ? 0 : parseAmount(text, currency);
        if (parsed === null) badExact ??= id;
        return { memberId: id, weight: parsed ?? 0 };
      }
    }
  });
  const totalWeight = sum(weights.map((w) => w.weight));
  const people = weights.filter((w) => w.weight > 0).length;
  const summary = {
    EQUAL: `${people} of ${members.length} people`,
    SHARES: `${totalWeight} ${totalWeight === 1 ? "share" : "shares"}`,
    PERCENT: `${formatPercent(totalWeight)} of 100%`,
    EXACT: `${money(totalWeight)} of ${money(amount ?? 0)}`,
  }[state.mode];

  const empty = Object.fromEntries(members.map((m) => [m.id, null]));
  const invalid = (status: string): SplitView => ({
    valid: false,
    weights,
    amounts: empty,
    status,
    summary,
    roundNote: null,
    segments: [],
  });

  if (badExact) return invalid(`Check the amount for ${label(badExact)}`);
  if (!amount) return invalid("Enter an amount");

  const result = allocateShares(amount, currency, state.mode, weights);
  if (!result.ok) {
    const { error } = result;
    switch (error.code) {
      case "NO_PARTICIPANTS":
        return invalid(
          state.mode === "SHARES"
            ? "Give someone a share"
            : "Pick at least one person",
        );
      case "PERCENT_MISMATCH":
        return invalid(
          error.remaining > 0
            ? `${formatPercent(error.remaining)} left to assign`
            : `${formatPercent(-error.remaining)} too much`,
        );
      case "EXACT_MISMATCH":
        return invalid(
          error.remaining > 0
            ? `${money(error.remaining)} left to assign`
            : `${money(-error.remaining)} over the total`,
        );
      default:
        return invalid("Enter an amount");
    }
  }

  const amounts: Record<string, number | null> = { ...empty };
  for (const share of result.shares) amounts[share.memberId] = share.amount;

  const status = {
    EQUAL: `${money(amount)} split ${people} ${people === 1 ? "way" : "ways"}`,
    SHARES: `${totalWeight} ${totalWeight === 1 ? "share" : "shares"} · ${money(Math.round(amount / totalWeight))} per share`,
    PERCENT: "Adds up to 100%",
    EXACT: `Adds up to ${money(amount)}`,
  }[state.mode];

  const bumped = result.roundedUp.map((id) =>
    label(id) === "You" ? "you" : label(id),
  );
  const n = bumped.length;
  const roundNote =
    n > 0
      ? `Can't split evenly to the ${minorUnitName(currency, 1)}, so ${n} extra ${minorUnitName(currency, n)} ${n === 1 ? "goes" : "go"} to ${joinNames(bumped)}. Everyone else pays the rounded-down amount.`
      : null;

  return {
    valid: true,
    weights,
    amounts,
    status,
    summary,
    roundNote,
    segments: result.shares.map((s) => ({
      memberId: s.memberId,
      fraction: s.amount / amount,
    })),
  };
}

/** 2500 → "25%", 3334 → "33.34%". */
export function formatPercent(bp: number): string {
  return `${Number((bp / 100).toFixed(2))}%`;
}

/** "33.34" → 3334 basis points; null if not a percentage. */
export function parsePercent(text: string): number | null {
  const match = /^(\d{1,3})(?:\.(\d{0,2}))?$/.exec(
    text.trim().replace(/%$/, ""),
  );
  if (!match) return null;
  const bp = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return bp <= FULL_PERCENT_BP ? bp : null;
}

function joinNames(names: string[]) {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
