import "server-only";
import { randomUUID } from "node:crypto";
import { isoDate } from "@/lib/activity";
import { PRESENCE_TTL_MS } from "@/lib/live";
import { db } from "../db";
import { createSampleWorld, sampleAccounts } from "../demo/sample-world";
import { publish } from "../realtime/bus";
import type { CurrentUser } from "../session";
import { requireMembership } from "./access";
import { badRequest, forbidden } from "./errors";
import { createExpense } from "./expenses";

/** How long a demo lasts before it's deleted. */
export const DEMO_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** At most this many demo users at once (7 per demo), so a script can't fill the database. */
const MAX_DEMO_USERS = 2_100;

/**
 * "Try the demo": a private copy of the sample world for one visitor, with
 * their own Ana, Bea and Carlo, so nobody sees or changes anyone else's.
 * Expired copies are removed whenever a new one starts. Null when too many
 * demos are running.
 */
export async function startDemo() {
  await removeExpiredDemos().catch((error) => {
    console.error("Couldn't remove expired demos", error);
  });
  const running = await db.user.count({
    where: { demoExpiresAt: { not: null } },
  });
  if (running >= MAX_DEMO_USERS) return null;

  const demoExpiresAt = new Date(Date.now() + DEMO_LIFETIME_MS);
  const cast = Object.fromEntries(
    sampleAccounts.map((p) => [p.id, `demo_${randomUUID()}`]),
  );
  await db.$transaction(
    async (tx) => {
      await tx.user.createMany({
        data: sampleAccounts.map((p) => ({
          id: cast[p.id]!,
          name: p.name,
          demoExpiresAt,
        })),
      });
      await createSampleWorld(tx, cast);
    },
    { timeout: 30_000 },
  );
  return db.user.findUniqueOrThrow({
    where: { id: cast.you! },
    select: { id: true, name: true, email: true, image: true },
  });
}

/**
 * Delete demos past their expiry: their groups (which take members,
 * invites and activity with them), then the demo people. Demo users can't
 * join anyone else's group, so nothing outside the copy points at them.
 */
export async function removeExpiredDemos() {
  const expired = await db.user.findMany({
    where: { demoExpiresAt: { lt: new Date() } },
    select: { id: true },
  });
  if (expired.length === 0) return;
  const userIds = expired.map((u) => u.id);
  const groups = await db.group.findMany({
    where: { createdById: { in: userIds } },
    select: { id: true },
  });
  const groupId = { in: groups.map((g) => g.id) };
  await db.$transaction([
    db.expenseShare.deleteMany({ where: { expense: { groupId } } }),
    db.expense.deleteMany({ where: { groupId } }),
    db.payment.deleteMany({ where: { groupId } }),
    db.group.deleteMany({ where: { id: groupId } }),
    db.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
}

/** A sample friend in the group to act for (Bea when she's there). */
export async function demoFriend(groupId: string, userId: string) {
  const friends = await db.groupMember.findMany({
    where: {
      groupId,
      removedAt: null,
      userId: { not: userId },
      user: { demoExpiresAt: { not: null } },
    },
    orderBy: { colorIndex: "asc" },
    select: { id: true, name: true, colorIndex: true, userId: true },
  });
  return friends.find((f) => f.name === "Bea") ?? friends[0] ?? null;
}

const friendExpenses = [
  { description: "Halo-halo for everyone", categoryId: "food", amount: 45_000 },
  { description: "Habal-habal rides", categoryId: "transport", amount: 60_000 },
  { description: "Surfboard rental", categoryId: "activities", amount: 80_000 },
  { description: "Island hopping snacks", categoryId: "food", amount: 32_000 },
];

/**
 * Demo only: a sample friend adds an expense the way a real one would, so a
 * visitor can watch live updates in one window. "Bea is adding an
 * expense…" shows first, then the expense lands for everyone.
 */
export async function friendAddsExpense(user: CurrentUser, groupId: string) {
  if (!user.demoExpiresAt) throw forbidden("That's only for the demo.");
  const me = await requireMembership(groupId, user.id);
  const friend = await demoFriend(groupId, user.id);
  if (!friend) throw badRequest("Nobody else here can add an expense.");

  const presence = (activity: "adding-expense" | null) =>
    publish({
      type: "presence",
      groupId,
      actorUserId: friend.userId!,
      memberId: friend.id,
      name: friend.name,
      colorIndex: friend.colorIndex,
      groupName: me.group.name,
      activity,
      until: Date.now() + PRESENCE_TTL_MS,
    });

  await presence("adding-expense");
  await new Promise((resolve) => setTimeout(resolve, 2_500));
  const everyone = await db.groupMember.findMany({
    where: { groupId, removedAt: null },
    select: { id: true },
  });
  const pick =
    friendExpenses[Math.floor(Math.random() * friendExpenses.length)]!;
  await createExpense(friend.userId!, {
    groupId,
    ...pick,
    date: isoDate(new Date()),
    paidById: friend.id,
    splitMode: "EQUAL",
    weights: everyone.map((m) => ({ memberId: m.id, weight: 1 })),
  });
  await presence(null);
  return { name: friend.name, description: pick.description };
}
