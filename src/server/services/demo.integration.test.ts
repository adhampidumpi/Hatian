import { afterAll, describe, expect, it } from "vitest";
import { cleanUp, makeGroup, makeUser } from "@/test/factories";
import { db } from "../db";
import {
  demoFriend,
  friendAddsExpense,
  removeExpiredDemos,
  startDemo,
} from "./demo";
import { getGroupSummaries } from "./groups";
import { ensureInvite, joinGroup } from "./invites";
import { listExpenses } from "./expenses";

/** A user as the session sees them (CurrentUser). */
const asUser = (id: string) =>
  db.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      demoExpiresAt: true,
    },
  });

const visitors: string[] = [];
const realUsers: string[] = [];

/** Everyone in a visitor's copy: the visitor and their sample friends. */
async function castOf(visitorId: string) {
  const users = await db.user.findMany({
    where: {
      memberships: { some: { group: { createdById: visitorId } } },
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

afterAll(async () => {
  const everyone = (await Promise.all(visitors.map(castOf))).flat();
  await db.user.updateMany({
    where: { id: { in: everyone } },
    data: { demoExpiresAt: new Date(0) },
  });
  await removeExpiredDemos();
  await cleanUp(realUsers);
});

async function demo() {
  const visitor = await startDemo();
  if (!visitor) throw new Error("demo refused");
  visitors.push(visitor.id);
  return asUser(visitor.id);
}

// Each demo builds a whole sample world, and a friend takes 2.5s to "type".
describe("Try the demo", { timeout: 20_000 }, () => {
  it("gives each visitor a private copy of the sample world", async () => {
    const first = await demo();
    const second = await demo();

    const groups = await getGroupSummaries(first.id);
    expect(groups.map((g) => g.name).sort()).toEqual([
      "Baguio 2025",
      "Condo 4B",
      "Office lunch club",
      "Siargao Trip",
    ]);
    const siargao = groups.find((g) => g.name === "Siargao Trip")!;
    expect(siargao.myBalance).toBe(1_375_300);

    // Nobody is shared between the two copies, friends included.
    const a = await castOf(first.id);
    const b = await castOf(second.id);
    expect(a).toHaveLength(7);
    expect(a.filter((id) => b.includes(id))).toEqual([]);
    expect(first.demoExpiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("removes copies once they expire", async () => {
    const visitor = await demo();
    const cast = await castOf(visitor.id);
    await db.user.updateMany({
      where: { id: { in: cast } },
      data: { demoExpiresAt: new Date(Date.now() - 1000) },
    });
    await removeExpiredDemos();
    expect(await db.user.count({ where: { id: { in: cast } } })).toBe(0);
    expect(await db.group.count({ where: { createdById: visitor.id } })).toBe(
      0,
    );
  });

  it("keeps demo accounts out of real groups", async () => {
    const owner = await makeUser("Real owner");
    realUsers.push(owner.id);
    const { groupId } = await makeGroup(owner, []);
    const { token } = await ensureInvite(owner.id, groupId);
    const visitor = await demo();
    await expect(joinGroup(visitor, { token })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("lets a sample friend add an expense, for demo accounts only", async () => {
    const visitor = await demo();
    const siargao = (await getGroupSummaries(visitor.id)).find(
      (g) => g.name === "Siargao Trip",
    )!;
    expect((await demoFriend(siargao.id, visitor.id))?.name).toBe("Bea");

    const before = await listExpenses(visitor.id, siargao.id);
    const { description } = await friendAddsExpense(visitor, siargao.id);
    const after = await listExpenses(visitor.id, siargao.id);
    expect(after).toHaveLength(before.length + 1);
    expect(after[0]!.description).toBe(description);

    const owner = await makeUser("Real owner");
    realUsers.push(owner.id);
    const { groupId } = await makeGroup(owner, ["Ana"]);
    await expect(
      friendAddsExpense(await asUser(owner.id), groupId),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
