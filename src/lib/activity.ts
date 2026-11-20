/**
 * Shape of Activity.diff. Activity stores snapshots, not references, so the
 * feed can always show what an expense or payment looked like at the time
 * (and show edits as before → after) even after later changes or deletes.
 *
 * Pure types and builders: used by the server services and the seed script.
 */
import type { SplitMode } from "./money/split";

export type ExpenseSnapshot = {
  description: string;
  amount: number;
  currency: string;
  /** YYYY-MM-DD */
  date: string;
  categoryId: string | null;
  /** GroupMember id */
  paidById: string;
  splitMode: SplitMode;
  /** GroupMember id → share in minor units */
  shares: Record<string, number>;
  note: string | null;
};

export type PaymentSnapshot = {
  fromId: string;
  toId: string;
  amount: number;
  currency: string;
  method: string;
  date: string;
  reference: string | null;
};

export type MemberSnapshot = { memberId: string; name: string };

export type GroupSnapshot = {
  name?: string;
  icon?: string;
  currency?: string;
  simplifyDebts?: boolean;
};

/** Activity.diff by Activity.type. */
export type ActivityDiff =
  | { type: "GROUP_CREATED"; after: GroupSnapshot }
  | { type: "GROUP_UPDATED"; before: GroupSnapshot; after: GroupSnapshot }
  | { type: "EXPENSE_CREATED"; after: ExpenseSnapshot }
  | { type: "EXPENSE_UPDATED"; before: ExpenseSnapshot; after: ExpenseSnapshot }
  | { type: "EXPENSE_DELETED"; before: ExpenseSnapshot }
  | { type: "EXPENSE_RESTORED"; after: ExpenseSnapshot }
  | { type: "PAYMENT_RECORDED"; after: PaymentSnapshot }
  | { type: "PAYMENT_DELETED"; before: PaymentSnapshot }
  | { type: "PAYMENT_RESTORED"; after: PaymentSnapshot }
  | { type: "MEMBER_ADDED"; after: MemberSnapshot }
  | { type: "MEMBER_JOINED"; after: MemberSnapshot & { claimed: boolean } }
  | { type: "MEMBER_REMOVED"; before: MemberSnapshot };

export type ActivityType = ActivityDiff["type"];

/** The JSON stored in Activity.diff (the `type` lives in its own column). */
export function diffJson(diff: ActivityDiff) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, ...rest } = diff;
  return rest;
}

/** YYYY-MM-DD for a DATE column value (stored at UTC midnight). */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function expenseSnapshot(expense: {
  description: string;
  amount: number;
  currency: string;
  date: Date;
  categoryId: string | null;
  paidById: string;
  splitMode: SplitMode;
  note: string | null;
  shares: { memberId: string; amount: number }[];
}): ExpenseSnapshot {
  return {
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    date: isoDate(expense.date),
    categoryId: expense.categoryId,
    paidById: expense.paidById,
    splitMode: expense.splitMode,
    shares: Object.fromEntries(
      expense.shares.map((s) => [s.memberId, s.amount]),
    ),
    note: expense.note,
  };
}

export function paymentSnapshot(payment: {
  fromId: string;
  toId: string;
  amount: number;
  currency: string;
  method: string;
  date: Date;
  reference: string | null;
}): PaymentSnapshot {
  return {
    fromId: payment.fromId,
    toId: payment.toId,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    date: isoDate(payment.date),
    reference: payment.reference,
  };
}
