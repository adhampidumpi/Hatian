import "server-only";
import type { ActivityType, Prisma } from "@/generated/prisma/client";
import type { ActivityDiff } from "@/lib/activity";
import type { ActivityFilter, ActivityQuery } from "@/lib/validation/activity";
import { db } from "../db";
import { requireMembership } from "./access";

const typesFor: Record<ActivityFilter, ActivityType[] | undefined> = {
  ALL: undefined,
  EXPENSES: ["EXPENSE_CREATED", "EXPENSE_DELETED", "EXPENSE_RESTORED"],
  PAYMENTS: ["PAYMENT_RECORDED", "PAYMENT_DELETED", "PAYMENT_RESTORED"],
  EDITS: ["EXPENSE_UPDATED", "GROUP_UPDATED"],
};

export type ActivityMember = {
  name: string;
  colorIndex: number;
  isMe: boolean;
};

/**
 * The activity feed for one group or all of yours, newest first, with what
 * the client needs to word each item: member names (by member id), your
 * member id per group, group names, and the actor as the group knows them.
 */
export async function listActivity(userId: string, query: ActivityQuery) {
  if (query.groupId) await requireMembership(query.groupId, userId);
  const myGroups = await db.groupMember.findMany({
    where: {
      userId,
      removedAt: null,
      ...(query.groupId && { groupId: query.groupId }),
    },
    select: { id: true, groupId: true },
  });
  const groupIds = myGroups.map((m) => m.groupId);

  const where: Prisma.ActivityWhereInput = {
    groupId: { in: groupIds },
    ...(typesFor[query.filter] && { type: { in: typesFor[query.filter] } }),
  };
  const rows = await db.activity.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    select: {
      id: true,
      groupId: true,
      actorId: true,
      type: true,
      entityId: true,
      diff: true,
      createdAt: true,
      actor: { select: { name: true, email: true } },
    },
  });
  const page = rows.slice(0, query.limit);
  const nextCursor = rows.length > query.limit ? page.at(-1)!.id : null;

  const shownGroups = [...new Set(page.map((r) => r.groupId))];
  const [members, groups] = await Promise.all([
    db.groupMember.findMany({
      where: { groupId: { in: shownGroups } },
      select: {
        id: true,
        groupId: true,
        name: true,
        colorIndex: true,
        userId: true,
      },
    }),
    db.group.findMany({
      where: { id: { in: shownGroups } },
      select: { id: true, name: true, currency: true },
    }),
  ]);

  const memberMap: Record<string, ActivityMember> = {};
  for (const m of members) {
    memberMap[m.id] = {
      name: m.name,
      colorIndex: m.colorIndex,
      isMe: m.userId === userId,
    };
  }
  const actorMember = (groupId: string, actorId: string) =>
    members.find((m) => m.groupId === groupId && m.userId === actorId);

  return {
    items: page.map((row) => {
      const member = actorMember(row.groupId, row.actorId);
      return {
        id: row.id,
        groupId: row.groupId,
        createdAt: row.createdAt,
        entityId: row.entityId,
        actor: {
          memberId: member?.id ?? null,
          name:
            member?.name ??
            row.actor.name ??
            row.actor.email?.split("@")[0] ??
            "Someone",
          colorIndex: member?.colorIndex ?? 0,
          isMe: row.actorId === userId,
        },
        // Type and snapshot together, as the typed union in lib/activity.
        change: { type: row.type, ...(row.diff as object) } as ActivityDiff,
      };
    }),
    nextCursor,
    members: memberMap,
    myMemberIds: Object.fromEntries(myGroups.map((m) => [m.groupId, m.id])),
    groups: Object.fromEntries(groups.map((g) => [g.id, g])),
  };
}

export type ActivityPage = Awaited<ReturnType<typeof listActivity>>;
export type ActivityItem = ActivityPage["items"][number];
