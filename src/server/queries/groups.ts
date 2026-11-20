import "server-only";
import { computeBalances } from "@/lib/money/balances";
import { db } from "../db";

export type GroupSummary = {
  id: string;
  name: string;
  icon: string;
  currency: string;
  memberCount: number;
  /** Net for the current user in minor units. Positive: they're owed. */
  myBalance: number;
  /** True when every member's balance is zero and the group has history. */
  settled: boolean;
  lastActivityAt: Date;
};

/**
 * Every group the user belongs to, with their balance in each.
 *
 * Balances are computed on read from expense shares and payments (as Spliit
 * does) rather than kept in a materialised table (as SplitPro does). Simpler
 * and always correct; revisit if groups grow to thousands of expenses.
 */
export async function getGroupSummaries(
  userId: string,
): Promise<GroupSummary[]> {
  const groups = await db.group.findMany({
    where: { members: { some: { userId } } },
    select: {
      id: true,
      name: true,
      icon: true,
      currency: true,
      createdAt: true,
      members: { select: { userId: true } },
      expenses: {
        where: { deletedAt: null },
        select: {
          paidById: true,
          amount: true,
          shares: { select: { userId: true, amount: true } },
        },
      },
      payments: {
        where: { deletedAt: null },
        select: { fromId: true, toId: true, amount: true },
      },
      activities: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return groups
    .map((group) => {
      const balances = computeBalances(
        group.expenses,
        group.payments,
        group.members.map((m) => m.userId),
      );
      const hasHistory = group.expenses.length > 0;
      return {
        id: group.id,
        name: group.name,
        icon: group.icon,
        currency: group.currency,
        memberCount: group.members.length,
        myBalance: balances[userId] ?? 0,
        settled: hasHistory && Object.values(balances).every((v) => v === 0),
        lastActivityAt: group.activities[0]?.createdAt ?? group.createdAt,
      };
    })
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
}

/**
 * Totals for the Home summary card. Groups may use different currencies;
 * until multi-currency lands (phase 3) only the given currency is summed.
 */
export function summarise(groups: GroupSummary[], currency = "PHP") {
  const inCurrency = groups.filter((g) => g.currency === currency);
  const owed = inCurrency
    .filter((g) => g.myBalance > 0)
    .reduce((sum, g) => sum + g.myBalance, 0);
  const owe = inCurrency
    .filter((g) => g.myBalance < 0)
    .reduce((sum, g) => sum - g.myBalance, 0);
  return { currency, owed, owe, net: owed - owe };
}
