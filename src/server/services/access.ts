import "server-only";
import { db } from "../db";
import { notFound } from "./errors";

/**
 * Authorisation for everything group-scoped: the signed-in user's active
 * membership in the group, or a NOT_FOUND (never FORBIDDEN, so ids of other
 * people's groups don't leak). Every service that reads or changes a group
 * calls this first.
 */
export async function requireMembership(groupId: string, userId: string) {
  const member = await db.groupMember.findFirst({
    where: { groupId, userId, removedAt: null },
    select: {
      id: true,
      groupId: true,
      name: true,
      role: true,
      colorIndex: true,
      group: { select: { currency: true, name: true } },
    },
  });
  if (!member) throw notFound("That group");
  return member;
}

export type Membership = Awaited<ReturnType<typeof requireMembership>>;
