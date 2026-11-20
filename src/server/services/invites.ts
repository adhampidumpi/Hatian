import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { JoinGroupInput } from "@/lib/validation/invites";
import { db } from "../db";
import type { CurrentUser } from "../session";
import { requireMembership } from "./access";
import { logActivity } from "./activity-log";
import { conflict, notFound } from "./errors";
import { displayNameFor } from "./groups";

/** 144 random bits: unguessable, unlike Prisma's default cuid ids. */
function newToken() {
  return randomBytes(18).toString("base64url");
}

const activeInvite = (groupId: string) => ({
  groupId,
  revokedAt: null,
  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
});

/** The group's current invite token, if one has been made. */
export async function currentInvite(userId: string, groupId: string) {
  await requireMembership(groupId, userId);
  const invite = await db.groupInvite.findFirst({
    where: activeInvite(groupId),
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return invite ? { token: invite.id } : null;
}

/** The current invite token, creating one the first time it's needed. */
export async function ensureInvite(userId: string, groupId: string) {
  const existing = await currentInvite(userId, groupId);
  if (existing) return existing;
  const invite = await db.groupInvite.create({
    data: { id: newToken(), groupId, createdById: userId },
  });
  return { token: invite.id };
}

/** Cancel the current link (anyone who has it can no longer join). */
export async function resetInvite(userId: string, groupId: string) {
  await requireMembership(groupId, userId);
  return db.$transaction(async (tx) => {
    await tx.groupInvite.updateMany({
      where: activeInvite(groupId),
      data: { revokedAt: new Date() },
    });
    const invite = await tx.groupInvite.create({
      data: { id: newToken(), groupId, createdById: userId },
    });
    return { token: invite.id };
  });
}

async function findActiveInvite(token: string) {
  const invite = await db.groupInvite.findFirst({
    where: { id: token, revokedAt: null },
    select: {
      expiresAt: true,
      group: { select: { id: true, name: true, icon: true } },
    },
  });
  if (!invite || (invite.expiresAt && invite.expiresAt < new Date())) {
    throw notFound("This invite link");
  }
  return invite.group;
}

/**
 * What the invite page shows: the group and the placeholders you could be.
 * Anyone with the link may see this; the token is the secret.
 */
export async function previewInvite(token: string, userId: string | null) {
  const group = await findActiveInvite(token);
  const members = await db.groupMember.findMany({
    where: { groupId: group.id, removedAt: null },
    orderBy: { colorIndex: "asc" },
    select: { id: true, name: true, colorIndex: true, userId: true },
  });
  return {
    group,
    memberCount: members.length,
    joinedNames: members.filter((m) => m.userId).map((m) => m.name),
    placeholders: members
      .filter((m) => !m.userId)
      .map(({ id, name, colorIndex }) => ({ id, name, colorIndex })),
    alreadyMember: userId !== null && members.some((m) => m.userId === userId),
  };
}

/**
 * Join through an invite: claim a placeholder ("I'm Dan", keeping Dan's
 * history), rejoin if you left before, or join as someone new.
 */
export async function joinGroup(user: CurrentUser, input: JoinGroupInput) {
  const group = await findActiveInvite(input.token);

  return db.$transaction(async (tx) => {
    const existing = await tx.groupMember.findFirst({
      where: { groupId: group.id, userId: user.id },
      select: { id: true, name: true, removedAt: true },
    });
    if (existing && !existing.removedAt) return { groupId: group.id };

    if (existing) {
      await tx.groupMember.update({
        where: { id: existing.id },
        data: { removedAt: null, joinedAt: new Date() },
      });
      await logActivity(tx, {
        groupId: group.id,
        actorId: user.id,
        entityId: existing.id,
        diff: {
          type: "MEMBER_JOINED",
          after: { memberId: existing.id, name: existing.name, claimed: false },
        },
      });
      return { groupId: group.id };
    }

    if (input.claimMemberId) {
      // Conditional update: two people can't claim the same placeholder.
      const claimed = await tx.groupMember.updateMany({
        where: {
          id: input.claimMemberId,
          groupId: group.id,
          userId: null,
          removedAt: null,
        },
        data: { userId: user.id, joinedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw conflict("Someone already joined as that person. Pick again.");
      }
      const member = await tx.groupMember.findUniqueOrThrow({
        where: { id: input.claimMemberId },
        select: { id: true, name: true },
      });
      await logActivity(tx, {
        groupId: group.id,
        actorId: user.id,
        entityId: member.id,
        diff: {
          type: "MEMBER_JOINED",
          after: { memberId: member.id, name: member.name, claimed: true },
        },
      });
      return { groupId: group.id };
    }

    const last = await tx.groupMember.findFirst({
      where: { groupId: group.id },
      orderBy: { colorIndex: "desc" },
      select: { colorIndex: true },
    });
    const name = await uniqueName(tx, group.id, displayNameFor(user));
    const member = await tx.groupMember.create({
      data: {
        groupId: group.id,
        userId: user.id,
        name,
        colorIndex: (last?.colorIndex ?? -1) + 1,
        joinedAt: new Date(),
      },
    });
    await logActivity(tx, {
      groupId: group.id,
      actorId: user.id,
      entityId: member.id,
      diff: {
        type: "MEMBER_JOINED",
        after: { memberId: member.id, name, claimed: false },
      },
    });
    return { groupId: group.id };
  });
}

/** "Ana", or "Ana 2" if the group already has an Ana. */
async function uniqueName(
  tx: Prisma.TransactionClient,
  groupId: string,
  base: string,
) {
  const taken = new Set(
    (
      await tx.groupMember.findMany({
        where: { groupId, removedAt: null },
        select: { name: true },
      })
    ).map((m) => m.name.toLowerCase()),
  );
  let name = base;
  for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${base} ${i}`;
  return name;
}
