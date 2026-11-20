import "server-only";
import {
  computeBalances,
  computePairwiseDebts,
  simplifyDebts,
} from "@/lib/money/balances";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { requireMembership } from "./access";

type Client = Prisma.TransactionClient | typeof db;

/**
 * Everything that moves money in a group (live expenses and payments), and
 * the balances derived from it. Balances are computed on read, never stored.
 */
export async function loadLedger(groupId: string, client: Client = db) {
  const [members, expenses, payments] = await Promise.all([
    client.groupMember.findMany({
      where: { groupId },
      select: { id: true, removedAt: true },
    }),
    client.expense.findMany({
      where: { groupId, deletedAt: null },
      select: {
        paidById: true,
        amount: true,
        shares: { select: { memberId: true, amount: true } },
      },
    }),
    client.payment.findMany({
      where: { groupId, deletedAt: null },
      select: { fromId: true, toId: true, amount: true },
    }),
  ]);
  const activeIds = members.filter((m) => !m.removedAt).map((m) => m.id);
  const balances = computeBalances(expenses, payments, activeIds);
  return { expenses, payments, balances };
}

export async function balanceOf(
  groupId: string,
  memberId: string,
  client: Client = db,
) {
  const { balances } = await loadLedger(groupId, client);
  return balances[memberId] ?? 0;
}

/**
 * Balances and suggested settle-up payments both ways, so the Simplify
 * switch can show "4 payments instead of 10" without another request.
 */
export async function getSettleUp(userId: string, groupId: string) {
  await requireMembership(groupId, userId);
  const { expenses, payments, balances } = await loadLedger(groupId);
  return {
    balances,
    simplified: simplifyDebts(balances),
    pairwise: computePairwiseDebts(expenses, payments),
  };
}
