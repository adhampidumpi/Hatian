import { sum } from "./money/split";

type ExpenseLike = {
  date: string;
  amount: number;
  paidById: string;
  shares: { memberId: string; amount: number }[];
};

export type MyEffect =
  | { kind: "lent"; amount: number }
  | { kind: "borrowed"; amount: number }
  | { kind: "none" };

/**
 * What an expense means for one member: if they paid, how much they lent the
 * others; otherwise how much they borrowed. Matches "you lent ₱3,888.00".
 */
export function myEffect(expense: ExpenseLike, memberId: string): MyEffect {
  const myShare =
    expense.shares.find((s) => s.memberId === memberId)?.amount ?? 0;
  if (expense.paidById === memberId) {
    const lent = expense.amount - myShare;
    return lent > 0 ? { kind: "lent", amount: lent } : { kind: "none" };
  }
  return myShare > 0 ? { kind: "borrowed", amount: myShare } : { kind: "none" };
}

/** Net effect as a signed number: positive when lent, negative when borrowed. */
export function signedEffect(effect: MyEffect): number {
  if (effect.kind === "lent") return effect.amount;
  if (effect.kind === "borrowed") return -effect.amount;
  return 0;
}

/** Consecutive expenses on the same date, with the day's total. */
export function groupByDay<T extends ExpenseLike>(expenses: T[]) {
  const days: { date: string; total: number; expenses: T[] }[] = [];
  for (const expense of expenses) {
    const last = days.at(-1);
    if (last?.date === expense.date) {
      last.expenses.push(expense);
    } else {
      days.push({ date: expense.date, total: 0, expenses: [expense] });
    }
  }
  for (const day of days) day.total = sum(day.expenses.map((e) => e.amount));
  return days;
}
