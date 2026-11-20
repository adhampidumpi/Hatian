import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { expenseSnapshot, isoDate } from "@/lib/activity";
import { allocateShares, type SplitError } from "@/lib/money/split";
import type {
  ExpenseInput,
  UpdateExpenseInput,
} from "@/lib/validation/expenses";
import { db } from "../db";
import { requireMembership } from "./access";
import { logActivity } from "./activity-log";
import { badRequest, notFound } from "./errors";

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

/** One live expense, for the edit form. */
export async function getExpense(
  userId: string,
  groupId: string,
  expenseId: string,
) {
  await requireMembership(groupId, userId);
  const row = await db.expense.findFirst({
    where: { id: expenseId, groupId, deletedAt: null },
    select: expenseSelect,
  });
  if (!row) throw notFound("That expense");
  return toView(row);
}

const splitErrorMessage: Record<SplitError["code"], string> = {
  INVALID_AMOUNT: "Enter an amount.",
  INVALID_WEIGHT: "One of the split values isn't valid.",
  NO_PARTICIPANTS: "Pick at least one person to split with.",
  PERCENT_MISMATCH: "The percentages must add up to 100%.",
  EXACT_MISMATCH: "The amounts must add up to the total.",
};

/**
 * Check the people involved and compute the shares. Members must be in the
 * group and not removed, except people already on an expense being edited
 * (so old expenses stay editable after someone leaves). Shares are computed
 * in member order, so who gets an extra centavo is stable.
 */
async function prepare(
  tx: Prisma.TransactionClient,
  input: ExpenseInput,
  currency: string,
  alreadyOnExpense: string[] = [],
) {
  const members = await tx.groupMember.findMany({
    where: { groupId: input.groupId },
    select: { id: true, removedAt: true, colorIndex: true },
  });
  const allowed = new Map(
    members
      .filter((m) => !m.removedAt || alreadyOnExpense.includes(m.id))
      .map((m) => [m.id, m.colorIndex]),
  );
  if (!allowed.has(input.paidById)) throw badRequest("Pick who paid.");
  if (input.weights.some((w) => !allowed.has(w.memberId))) {
    throw badRequest("Someone in the split isn't in this group.");
  }

  const ordered = [...input.weights].sort(
    (a, b) => allowed.get(a.memberId)! - allowed.get(b.memberId)!,
  );
  const split = allocateShares(
    input.amount,
    currency,
    input.splitMode,
    ordered,
  );
  if (!split.ok) throw badRequest(splitErrorMessage[split.error.code]);
  return split.shares;
}

function fields(input: ExpenseInput, currency: string) {
  return {
    description: input.description,
    categoryId: input.categoryId,
    date: new Date(`${input.date}T00:00:00Z`),
    amount: input.amount,
    currency,
    paidById: input.paidById,
    splitMode: input.splitMode,
    note: input.note || null,
  };
}

export async function createExpense(userId: string, input: ExpenseInput) {
  const me = await requireMembership(input.groupId, userId);
  const currency = me.group.currency;
  return db.$transaction(async (tx) => {
    const shares = await prepare(tx, input, currency);
    const expense = await tx.expense.create({
      data: {
        groupId: input.groupId,
        createdById: userId,
        ...fields(input, currency),
        shares: { create: shares },
      },
      include: { shares: true },
    });
    await logActivity(tx, {
      groupId: input.groupId,
      actorId: userId,
      entityId: expense.id,
      diff: { type: "EXPENSE_CREATED", after: expenseSnapshot(expense) },
    });
    return { id: expense.id };
  });
}

/** Any member can edit (as Splitwise); the log keeps before → after. */
export async function updateExpense(userId: string, input: UpdateExpenseInput) {
  const me = await requireMembership(input.groupId, userId);
  const currency = me.group.currency;
  return db.$transaction(async (tx) => {
    const before = await tx.expense.findFirst({
      where: { id: input.expenseId, groupId: input.groupId, deletedAt: null },
      include: { shares: true },
    });
    if (!before) throw notFound("That expense");

    const shares = await prepare(tx, input, currency, [
      before.paidById,
      ...before.shares.map((s) => s.memberId),
    ]);
    await tx.expenseShare.deleteMany({ where: { expenseId: before.id } });
    const after = await tx.expense.update({
      where: { id: before.id },
      data: { ...fields(input, currency), shares: { create: shares } },
      include: { shares: true },
    });
    await logActivity(tx, {
      groupId: input.groupId,
      actorId: userId,
      entityId: before.id,
      diff: {
        type: "EXPENSE_UPDATED",
        before: expenseSnapshot(before),
        after: expenseSnapshot(after),
      },
    });
    return { id: after.id };
  });
}

/** Soft delete, so it can be undone and still shows in the history. */
export async function deleteExpense(
  userId: string,
  groupId: string,
  expenseId: string,
) {
  await requireMembership(groupId, userId);
  await db.$transaction(async (tx) => {
    const expense = await tx.expense.findFirst({
      where: { id: expenseId, groupId, deletedAt: null },
      include: { shares: true },
    });
    if (!expense) throw notFound("That expense");
    await tx.expense.update({
      where: { id: expenseId },
      data: { deletedAt: new Date() },
    });
    await logActivity(tx, {
      groupId,
      actorId: userId,
      entityId: expenseId,
      diff: { type: "EXPENSE_DELETED", before: expenseSnapshot(expense) },
    });
  });
}

/** Undo a delete. */
export async function restoreExpense(
  userId: string,
  groupId: string,
  expenseId: string,
) {
  await requireMembership(groupId, userId);
  await db.$transaction(async (tx) => {
    const expense = await tx.expense.findFirst({
      where: { id: expenseId, groupId, deletedAt: { not: null } },
      include: { shares: true },
    });
    if (!expense) throw notFound("That expense");
    await tx.expense.update({
      where: { id: expenseId },
      data: { deletedAt: null },
    });
    await logActivity(tx, {
      groupId,
      actorId: userId,
      entityId: expenseId,
      diff: { type: "EXPENSE_RESTORED", after: expenseSnapshot(expense) },
    });
  });
}
