import "server-only";
import { MAX_MEMBERS } from "@/lib/validation/groups";
import { db } from "../db";
import { requireMembership } from "./access";
import { logActivity } from "./activity-log";
import { badRequest, conflict, forbidden, notFound } from "./errors";
import { balanceOf } from "./ledger";

async function assertNameFree(
  groupId: string,
  name: string,
  exceptId?: string,
) {
  const clash = await db.groupMember.findFirst({
    where: {
      groupId,
      removedAt: null,
      name: { equals: name, mode: "insensitive" },
      ...(exceptId && { NOT: { id: exceptId } }),
    },
    select: { id: true },
  });
  if (clash) throw conflict(`There's already someone called ${name}.`);
}

/** Add a friend by name (a placeholder they can claim later). */
export async function addMember(userId: string, groupId: string, name: string) {
  await requireMembership(groupId, userId);
  await assertNameFree(groupId, name);
  return db.$transaction(async (tx) => {
    const count = await tx.groupMember.count({
      where: { groupId, removedAt: null },
    });
    if (count >= MAX_MEMBERS) {
      throw badRequest(`A group can have up to ${MAX_MEMBERS} people.`);
    }
    const last = await tx.groupMember.findFirst({
      where: { groupId },
      orderBy: { colorIndex: "desc" },
      select: { colorIndex: true },
    });
    const member = await tx.groupMember.create({
      data: { groupId, name, colorIndex: (last?.colorIndex ?? -1) + 1 },
    });
    await logActivity(tx, {
      groupId,
      actorId: userId,
      entityId: member.id,
      diff: { type: "MEMBER_ADDED", after: { memberId: member.id, name } },
    });
    return { id: member.id };
  });
}

/** Rename a placeholder, or yourself. Other people with accounts name themselves. */
export async function renameMember(
  userId: string,
  groupId: string,
  memberId: string,
  name: string,
) {
  const me = await requireMembership(groupId, userId);
  const target = await db.groupMember.findFirst({
    where: { id: memberId, groupId, removedAt: null },
    select: { id: true, userId: true },
  });
  if (!target) throw notFound("That person");
  if (target.userId && target.id !== me.id) {
    throw forbidden("People with an account choose their own name.");
  }
  await assertNameFree(groupId, name, memberId);
  await db.groupMember.update({ where: { id: memberId }, data: { name } });
}

/**
 * Remove someone from the group. Only while their balance is zero, so no
 * debt disappears. Placeholders can be removed by anyone; people with an
 * account only by the owner (or themselves, via leave).
 */
export async function removeMember(
  userId: string,
  groupId: string,
  memberId: string,
) {
  const me = await requireMembership(groupId, userId);
  const target = await db.groupMember.findFirst({
    where: { id: memberId, groupId, removedAt: null },
    select: { id: true, name: true, userId: true },
  });
  if (!target) throw notFound("That person");
  if (target.id === me.id) throw badRequest("Use Leave group instead.");
  if (target.userId && me.role !== "OWNER") {
    throw forbidden("Only the group owner can remove people with an account.");
  }
  await db.$transaction(async (tx) => {
    if ((await balanceOf(groupId, memberId, tx)) !== 0) {
      throw conflict(
        `${target.name} still owes or is owed money here. Settle up first.`,
      );
    }
    await tx.groupMember.update({
      where: { id: memberId },
      data: { removedAt: new Date() },
    });
    await logActivity(tx, {
      groupId,
      actorId: userId,
      entityId: memberId,
      diff: {
        type: "MEMBER_REMOVED",
        before: { memberId, name: target.name },
      },
    });
  });
}
