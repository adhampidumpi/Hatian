import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { isoDate } from "@/lib/activity";
import { db } from "../db";
import { requireMembership } from "./access";

const expenseSelect = {
  id: true,
  description: true,
  categoryId: true,
  date: true,
  amount: true,
  currency: true,
  paidById: true,
  splitMode: true,
  note: true,
  createdAt: true,
  shares: { select: { memberId: true, weight: true, amount: true } },
} satisfies Prisma.ExpenseSelect;

type ExpenseRow = Prisma.ExpenseGetPayload<{ select: typeof expenseSelect }>;

function toView(e: ExpenseRow) {
  return { ...e, date: isoDate(e.date) };
}

export type ExpenseView = ReturnType<typeof toView>;

/** Live expenses, newest day first (then newest added first). */
export async function listExpenses(userId: string, groupId: string) {
  await requireMembership(groupId, userId);
  const rows = await db.expense.findMany({
    where: { groupId, deletedAt: null },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: expenseSelect,
  });
  return rows.map(toView);
}
