import "server-only";
import { cache } from "react";
import { isoDate } from "@/lib/activity";
import { computeBalances } from "@/lib/money/balances";
import { convertMinor } from "@/lib/money/convert";
import type {
  CreateGroupInput,
  UpdateGroupInput,
} from "@/lib/validation/groups";
import { db } from "../db";
import type { CurrentUser } from "../session";
import { requireMembership } from "./access";
import { logActivity } from "./activity-log";
import { conflict, forbidden } from "./errors";
import { balanceOf, loadLedger } from "./ledger";
import { getRate } from "./rates";
import { publish } from "../realtime/bus";

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
 *
 * Wrapped in React `cache()` so the sidebar and the page share one query per
 * request.
 */
export const getGroupSummaries = cache(async function getGroupSummaries(
  userId: string,
): Promise<GroupSummary[]> {
  const groups = await db.group.findMany({
    where: { members: { some: { userId, removedAt: null } } },
    select: {
      id: true,
      name: true,
      icon: true,
      currency: true,
      createdAt: true,
      members: {
        where: { removedAt: null },
        select: { id: true, userId: true },
      },
      expenses: {
        where: { deletedAt: null },
        select: {
          paidById: true,
          amount: true,
          shares: { select: { memberId: true, amount: true } },
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
        group.members.map((m) => m.id),
      );
      const me = group.members.find((m) => m.userId === userId);
      const hasHistory = group.expenses.length > 0;
      return {
        id: group.id,
        name: group.name,
        icon: group.icon,
        currency: group.currency,
        memberCount: group.members.length,
        myBalance: me ? (balances[me.id] ?? 0) : 0,
        settled: hasHistory && Object.values(balances).every((v) => v === 0),
        lastActivityAt: group.activities[0]?.createdAt ?? group.createdAt,
      };
    })
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
});

export type MemberView = {
  id: string;
  name: string;
  colorIndex: number;
  role: "OWNER" | "MEMBER";
  isMe: boolean;
  /** Has an account (joined or claimed). False for placeholders. */
  joined: boolean;
  removed: boolean;
};

export type GroupDetail = Awaited<ReturnType<typeof loadGroupDetail>>;

/**
 * One group as the signed-in member sees it: settings, members, balances and
 * headline numbers. NOT_FOUND unless the user is an active member.
 */
export const getGroupDetail = cache(loadGroupDetail);

async function loadGroupDetail(groupId: string, userId: string) {
  const me = await requireMembership(groupId, userId);
  const [group, ledger, stats] = await Promise.all([
    db.group.findUniqueOrThrow({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        icon: true,
        currency: true,
        simplifyDebts: true,
        createdAt: true,
        members: {
          orderBy: { colorIndex: "asc" },
          select: {
            id: true,
            name: true,
            colorIndex: true,
            role: true,
            userId: true,
            removedAt: true,
          },
        },
      },
    }),
    loadLedger(groupId),
    db.expense.aggregate({
      where: { groupId, deletedAt: null },
      _sum: { amount: true },
      _count: true,
      _min: { date: true },
      _max: { date: true },
    }),
  ]);

  const members: MemberView[] = group.members.map((m) => ({
    id: m.id,
    name: m.name,
    colorIndex: m.colorIndex,
    role: m.role,
    isMe: m.id === me.id,
    joined: m.userId !== null,
    removed: m.removedAt !== null,
  }));

  return {
    id: group.id,
    name: group.name,
    icon: group.icon,
    currency: group.currency,
    simplifyDebts: group.simplifyDebts,
    createdAt: group.createdAt,
    me: { memberId: me.id, role: me.role },
    members,
    balances: ledger.balances,
    totalSpent: stats._sum.amount ?? 0,
    expenseCount: stats._count,
    firstDate: stats._min.date ? isoDate(stats._min.date) : null,
    lastDate: stats._max.date ? isoDate(stats._max.date) : null,
    /** Live expenses or payments exist (currency can no longer change). */
    hasMoney: ledger.expenses.length > 0 || ledger.payments.length > 0,
  };
}

/** Create a group with the creator as owner and friends as placeholders. */
export async function createGroup(user: CurrentUser, input: CreateGroupInput) {
  const ownerName = displayNameFor(user);
  return db.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: {
        name: input.name,
        icon: input.icon,
        currency: input.currency,
        createdById: user.id,
      },
    });
    await logActivity(tx, {
      groupId: group.id,
      actorId: user.id,
      diff: { type: "GROUP_CREATED", after: { name: group.name } },
    });
    await tx.groupMember.create({
      data: {
        groupId: group.id,
        userId: user.id,
        name: ownerName,
        role: "OWNER",
        colorIndex: 0,
        joinedAt: new Date(),
      },
    });
    for (const [i, name] of input.memberNames.entries()) {
      const member = await tx.groupMember.create({
        data: { groupId: group.id, name, colorIndex: i + 1 },
      });
      await logActivity(tx, {
        groupId: group.id,
        actorId: user.id,
        entityId: member.id,
        diff: { type: "MEMBER_ADDED", after: { memberId: member.id, name } },
      });
    }
    return { id: group.id };
  });
}

/** Rename, change icon/currency, or toggle Simplify debts. Any member may. */
export async function updateGroup(userId: string, input: UpdateGroupInput) {
  await requireMembership(input.groupId, userId);
  return db.$transaction(async (tx) => {
    const current = await tx.group.findUniqueOrThrow({
      where: { id: input.groupId },
      select: { name: true, icon: true, currency: true, simplifyDebts: true },
    });
    const changes = (
      ["name", "icon", "currency", "simplifyDebts"] as const
    ).filter((key) => input[key] !== undefined && input[key] !== current[key]);
    if (changes.length === 0) return;

    if (changes.includes("currency")) {
      const { expenses, payments } = await loadLedger(input.groupId, tx);
      if (expenses.length > 0 || payments.length > 0) {
        throw conflict(
          "The currency can't change once the group has expenses or payments.",
        );
      }
    }

    const before = Object.fromEntries(changes.map((k) => [k, current[k]]));
    const after = Object.fromEntries(changes.map((k) => [k, input[k]]));
    await tx.group.update({ where: { id: input.groupId }, data: after });
    await logActivity(tx, {
      groupId: input.groupId,
      actorId: userId,
      diff: { type: "GROUP_UPDATED", before, after },
    });
  });
}

/** Delete a group and everything in it. Owner only; can't be undone. */
export async function deleteGroup(userId: string, groupId: string) {
  const me = await requireMembership(groupId, userId);
  if (me.role !== "OWNER") {
    throw forbidden("Only the person who created the group can delete it.");
  }
  // Money first: shares and payments point at members, and Postgres checks
  // those references after each cascade step, so the group can't go first.
  await db.$transaction([
    db.expenseShare.deleteMany({ where: { expense: { groupId } } }),
    db.expense.deleteMany({ where: { groupId } }),
    db.payment.deleteMany({ where: { groupId } }),
    db.group.delete({ where: { id: groupId } }),
    publish({ type: "changed", groupId, actorUserId: userId }),
  ]);
}

/** Leave a group. Not while you owe or are owed money there. */
export async function leaveGroup(userId: string, groupId: string) {
  const me = await requireMembership(groupId, userId);
  await db.$transaction(async (tx) => {
    if ((await balanceOf(groupId, me.id, tx)) !== 0) {
      throw conflict("Settle up before leaving: your balance isn't zero.");
    }
    const others = await tx.groupMember.count({
      where: {
        groupId,
        removedAt: null,
        userId: { not: null },
        NOT: { id: me.id },
      },
    });
    if (me.role === "OWNER" && others > 0) {
      // Hand ownership to the longest-standing member who has an account.
      const heir = await tx.groupMember.findFirstOrThrow({
        where: {
          groupId,
          removedAt: null,
          userId: { not: null },
          NOT: { id: me.id },
        },
        orderBy: { joinedAt: "asc" },
      });
      await tx.groupMember.update({
        where: { id: heir.id },
        data: { role: "OWNER" },
      });
    }
    await tx.groupMember.update({
      where: { id: me.id },
      data: { removedAt: new Date(), role: "MEMBER" },
    });
    await logActivity(tx, {
      groupId,
      actorId: userId,
      entityId: me.id,
      diff: {
        type: "MEMBER_REMOVED",
        before: { memberId: me.id, name: me.name },
      },
    });
  });
}

/** What to call a user inside a group when they join or create one. */
export function displayNameFor(user: Pick<CurrentUser, "name" | "email">) {
  return (user.name?.trim() || user.email?.split("@")[0] || "Someone").slice(
    0,
    40,
  );
}

/**
 * Totals for the Home summary card, in the currency most of your groups
 * use. Balances in other currencies are converted at today's rate, which
 * makes the totals approximate; any that can't be (no rate) are left out.
 */
export async function summarise(groups: GroupSummary[]) {
  const counts = new Map<string, number>();
  for (const g of groups)
    counts.set(g.currency, (counts.get(g.currency) ?? 0) + 1);
  const currency = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "PHP";

  const today = isoDate(new Date());
  const others = [
    ...new Set(
      groups
        .filter((g) => g.myBalance !== 0 && g.currency !== currency)
        .map((g) => g.currency),
    ),
  ];
  const rates = new Map(
    await Promise.all(
      others.map(async (code) => {
        const rate = await getRate(code, currency, today).catch(() => null);
        return [code, rate] as const;
      }),
    ),
  );

  let owed = 0;
  let owe = 0;
  let leftOut = 0;
  for (const g of groups) {
    const rate = g.currency === currency ? "1" : rates.get(g.currency);
    const amount =
      g.myBalance === 0 || !rate
        ? null
        : convertMinor(Math.abs(g.myBalance), g.currency, currency, rate);
    if (amount === null) {
      if (g.myBalance !== 0) leftOut += 1;
    } else if (g.myBalance > 0) owed += amount;
    else owe += amount;
  }
  return {
    currency,
    owed,
    owe,
    net: owed - owe,
    approximate: others.length > 0,
    leftOut,
  };
}
