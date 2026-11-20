import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { createGroup } from "@/server/services/groups";

/** A fresh user with a unique email, for one test. */
export async function makeUser(name = "Tester") {
  const id = `test_${randomUUID()}`;
  return db.user.create({
    data: { id, name, email: `${id}@example.test` },
    select: { id: true, name: true, email: true, image: true },
  });
}

/** A group owned by `owner` with placeholder friends; returns member ids by name. */
export async function makeGroup(
  owner: Awaited<ReturnType<typeof makeUser>>,
  friends: string[],
  currency: "PHP" | "JPY" = "PHP",
) {
  const { id } = await createGroup(owner, {
    name: "Test group",
    icon: "users",
    currency,
    memberNames: friends,
  });
  const members = await db.groupMember.findMany({
    where: { groupId: id },
    select: { id: true, name: true },
  });
  const member = Object.fromEntries(members.map((m) => [m.name, m.id]));
  return { groupId: id, member };
}

/** Remove everything a test created (groups cascade; then the users). */
export async function cleanUp(userIds: string[]) {
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
  ]);
  await db.user.deleteMany({ where: { id: { in: userIds } } });
}
