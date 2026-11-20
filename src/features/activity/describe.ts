/**
 * Turn an activity entry into words, from the reader's point of view
 * ("You borrowed", "paid you"). Pure, so every phrasing is unit-tested.
 */
import type { ActivityDiff, ExpenseSnapshot } from "@/lib/activity";
import { categoryNames } from "@/lib/categories";
import { formatShortDay } from "@/lib/dates";
import { myEffect, type MyEffect } from "@/lib/expenses";
import { formatMoney } from "@/lib/money/format";
import {
  paymentMethodLabels,
  type PaymentMethod,
} from "@/lib/validation/payments";

export type DescribeContext = {
  members: Record<string, { name: string; isMe: boolean }>;
  /** The reader's member id in this entry's group. */
  myMemberId?: string;
  currency: string;
};

export type Described = {
  /** Sentence after the actor's name: 'added “Surf lessons”'. */
  text: string;
  /** Amount shown after the text, in mono. */
  amount?: number;
  /** What it means for the reader: "You borrowed ₱2,500.00". */
  effect?: MyEffect;
  /** Second line, e.g. what an edit changed. */
  details?: string;
};

const splitWords = {
  EQUAL: "equally",
  SHARES: "by shares",
  PERCENT: "by percent",
  EXACT: "by exact amounts",
} as const;

export function describeActivity(
  change: ActivityDiff,
  /** The actor's member id in the group (null if they've no member). */
  actorMemberId: string | null,
  ctx: DescribeContext,
): Described {
  // Someone mid-sentence: "you" or their name.
  const who = (memberId: string) => {
    const m = ctx.members[memberId];
    if (!m) return "someone";
    return m.isMe ? "you" : m.name;
  };
  const money = (n: number) => formatMoney(n, ctx.currency);
  const effectOf = (e: ExpenseSnapshot) =>
    ctx.myMemberId ? myEffect(toExpense(e), ctx.myMemberId) : undefined;

  switch (change.type) {
    case "GROUP_CREATED":
      return { text: `created ${change.after.name ?? "the group"}` };

    case "GROUP_UPDATED": {
      const parts: string[] = [];
      if (change.after.name !== undefined)
        parts.push(`renamed the group to “${change.after.name}”`);
      if (change.after.simplifyDebts !== undefined)
        parts.push(
          `turned simplified debts ${change.after.simplifyDebts ? "on" : "off"}`,
        );
      if (change.after.currency !== undefined)
        parts.push(`changed the currency to ${change.after.currency}`);
      if (change.after.icon !== undefined) parts.push("changed the group icon");
      return { text: parts.join(", ") || "updated the group" };
    }

    case "EXPENSE_CREATED":
      return {
        text: `added “${change.after.description}”`,
        amount: change.after.amount,
        effect: effectOf(change.after),
      };

    case "EXPENSE_UPDATED":
      return {
        text: `edited “${change.after.description}”`,
        details: expenseChanges(change.before, change.after, who, money),
        effect: effectOf(change.after),
      };

    case "EXPENSE_DELETED":
      return {
        text: `deleted “${change.before.description}”`,
        amount: change.before.amount,
      };

    case "EXPENSE_RESTORED":
      return {
        text: `restored “${change.after.description}”`,
        amount: change.after.amount,
      };

    case "PAYMENT_RECORDED": {
      const p = change.after;
      const method = paymentMethodLabels[p.method as PaymentMethod] ?? p.method;
      return {
        text:
          actorMemberId === p.fromId
            ? `paid ${who(p.toId)}`
            : `recorded ${who(p.fromId)} paying ${who(p.toId)}`,
        amount: p.amount,
        details: [method, p.reference].filter(Boolean).join(" · "),
      };
    }

    case "PAYMENT_DELETED":
      return {
        text: `removed a payment from ${who(change.before.fromId)} to ${who(change.before.toId)}`,
        amount: change.before.amount,
      };

    case "PAYMENT_RESTORED":
      return {
        text: `restored a payment from ${who(change.after.fromId)} to ${who(change.after.toId)}`,
        amount: change.after.amount,
      };

    case "MEMBER_ADDED":
      return { text: `added ${change.after.name}` };

    case "MEMBER_JOINED":
      return {
        text: change.after.claimed
          ? `joined as ${change.after.name}`
          : "joined with the invite link",
      };

    case "MEMBER_REMOVED":
      return {
        text:
          actorMemberId === change.before.memberId
            ? "left the group"
            : `removed ${change.before.name}`,
      };
  }
}

/** "Amount ₱2,140.00 → ₱2,340.00 · Dan removed from split" */
function expenseChanges(
  before: ExpenseSnapshot,
  after: ExpenseSnapshot,
  who: (memberId: string) => string,
  money: (n: number) => string,
): string {
  const parts: string[] = [];
  if (before.amount !== after.amount)
    parts.push(`Amount ${money(before.amount)} → ${money(after.amount)}`);
  if (before.description !== after.description)
    parts.push(`Renamed from “${before.description}”`);
  if (before.paidById !== after.paidById)
    parts.push(`Paid by ${who(before.paidById)} → ${who(after.paidById)}`);
  if (before.date !== after.date)
    parts.push(
      `Date ${formatShortDay(before.date)} → ${formatShortDay(after.date)}`,
    );
  if (before.categoryId !== after.categoryId)
    parts.push(
      `Category ${categoryNames[before.categoryId ?? "other"]} → ${categoryNames[after.categoryId ?? "other"]}`,
    );
  if (before.splitMode !== after.splitMode)
    parts.push(
      `Split ${splitWords[before.splitMode]} → ${splitWords[after.splitMode]}`,
    );

  const was = new Set(Object.keys(before.shares));
  const now = new Set(Object.keys(after.shares));
  const removed = [...was].filter((id) => !now.has(id)).map(who);
  const added = [...now].filter((id) => !was.has(id)).map(who);
  if (removed.length)
    parts.push(`${capitalise(list(removed))} removed from split`);
  if (added.length) parts.push(`${capitalise(list(added))} added to split`);
  if (
    !removed.length &&
    !added.length &&
    before.amount === after.amount &&
    [...now].some((id) => before.shares[id] !== after.shares[id])
  ) {
    parts.push("Shares changed");
  }
  return parts.join(" · ") || "No visible changes";
}

function toExpense(e: ExpenseSnapshot) {
  return {
    date: e.date,
    amount: e.amount,
    paidById: e.paidById,
    shares: Object.entries(e.shares).map(([memberId, amount]) => ({
      memberId,
      amount,
    })),
  };
}

function list(names: string[]) {
  return names.length <= 2
    ? names.join(" and ")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
