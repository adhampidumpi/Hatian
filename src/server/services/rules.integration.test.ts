import { afterAll, describe, expect, it } from "vitest";
import { cleanUp, makeGroup, makeUser } from "@/test/factories";
import { db } from "../db";
import { AppError } from "./errors";
import {
  createExpense,
  deleteExpense,
  listExpenses,
  restoreExpense,
  updateExpense,
} from "./expenses";
import { deleteGroup, getGroupDetail, leaveGroup, updateGroup } from "./groups";
import { ensureInvite, joinGroup, previewInvite } from "./invites";
import { getSettleUp } from "./ledger";
import { removeMember } from "./members";
import { recordPayment } from "./payments";

const created: string[] = [];
async function user(name?: string) {
  const u = await makeUser(name);
  created.push(u.id);
  return u;
}
afterAll(() => cleanUp(created));

const code = (promise: Promise<unknown>) =>
  promise.then(
    () => "ok",
    (e) => (e instanceof AppError ? e.code : String(e)),
  );

function expense(
  groupId: string,
  paidById: string,
  weights: Record<string, number>,
  extra: Partial<Parameters<typeof createExpense>[1]> = {},
) {
  return {
    groupId,
    description: "Dinner",
    categoryId: "food",
    date: "2026-11-14",
    amount: 100_000,
    paidById,
    splitMode: "EQUAL" as const,
    weights: Object.entries(weights).map(([memberId, weight]) => ({
      memberId,
      weight,
    })),
    ...extra,
  };
}

describe("access", () => {
  it("hides a group from people who aren't in it", async () => {
    const owner = await user();
    const stranger = await user();
    const { groupId } = await makeGroup(owner, ["Ana"]);
    expect(await code(getGroupDetail(groupId, stranger.id))).toBe("NOT_FOUND");
    expect(await code(listExpenses(stranger.id, groupId))).toBe("NOT_FOUND");
  });
});

describe("expenses", () => {
  it("computes shares on the server so they always add up", async () => {
    const owner = await user("Maria");
    const { groupId, member } = await makeGroup(owner, ["Ana", "Bea"]);
    const me = member.Maria!;
    await createExpense(
      owner.id,
      expense(groupId, me, { [me]: 1, [member.Ana!]: 1, [member.Bea!]: 1 }),
    );
    const [saved] = await listExpenses(owner.id, groupId);
    expect(saved!.shares.map((s) => s.amount).sort()).toEqual([
      33_333, 33_333, 33_334,
    ]);
  });

  it("rejects an exact split that doesn't add up", async () => {
    const owner = await user("Maria");
    const { groupId, member } = await makeGroup(owner, ["Ana"]);
    const me = member.Maria!;
    const result = await code(
      createExpense(
        owner.id,
        expense(
          groupId,
          me,
          { [me]: 30_000, [member.Ana!]: 20_000 },
          {
            splitMode: "EXACT",
          },
        ),
      ),
    );
    expect(result).toBe("BAD_REQUEST");
  });

  it("rejects people from another group", async () => {
    const owner = await user("Maria");
    const { groupId, member } = await makeGroup(owner, ["Ana"]);
    const other = await makeGroup(owner, ["Zed"]);
    const result = await code(
      createExpense(
        owner.id,
        expense(groupId, member.Maria!, { [other.member.Zed!]: 1 }),
      ),
    );
    expect(result).toBe("BAD_REQUEST");
  });

  it("logs edits with before and after, and deletes can be undone", async () => {
    const owner = await user("Maria");
    const { groupId, member } = await makeGroup(owner, ["Ana"]);
    const me = member.Maria!;
    const input = expense(groupId, me, { [me]: 1, [member.Ana!]: 1 });
    const { id } = await createExpense(owner.id, input);
    await updateExpense(owner.id, { ...input, expenseId: id, amount: 120_000 });
    await deleteExpense(owner.id, groupId, id);
    expect(await listExpenses(owner.id, groupId)).toHaveLength(0);
    await restoreExpense(owner.id, groupId, id);
    expect((await listExpenses(owner.id, groupId))[0]?.amount).toBe(120_000);

    const log = await db.activity.findMany({
      where: { entityId: id },
      orderBy: { createdAt: "asc" },
      select: { type: true, diff: true },
    });
    expect(log.map((a) => a.type)).toEqual([
      "EXPENSE_CREATED",
      "EXPENSE_UPDATED",
      "EXPENSE_DELETED",
      "EXPENSE_RESTORED",
    ]);
    expect(log[1]!.diff).toMatchObject({
      before: { amount: 100_000 },
      after: { amount: 120_000 },
    });
  });
});

describe("members and groups", () => {
  it("won't remove someone who still owes money, but will once settled", async () => {
    const owner = await user("Maria");
    const { groupId, member } = await makeGroup(owner, ["Ana"]);
    const me = member.Maria!;
    const ana = member.Ana!;
    await createExpense(owner.id, expense(groupId, me, { [me]: 1, [ana]: 1 }));
    expect(await code(removeMember(owner.id, groupId, ana))).toBe("CONFLICT");

    await recordPayment(owner.id, {
      groupId,
      fromId: ana,
      toId: me,
      amount: 50_000,
      method: "CASH",
      date: "2026-11-15",
    });
    expect(await code(removeMember(owner.id, groupId, ana))).toBe("ok");
  });

  it("won't let you leave with a balance", async () => {
    const owner = await user("Maria");
    const { groupId, member } = await makeGroup(owner, ["Ana"]);
    const me = member.Maria!;
    await createExpense(
      owner.id,
      expense(groupId, me, { [me]: 1, [member.Ana!]: 1 }),
    );
    expect(await code(leaveGroup(owner.id, groupId))).toBe("CONFLICT");
  });

  it("locks the currency once money has been logged", async () => {
    const owner = await user("Maria");
    const { groupId, member } = await makeGroup(owner, ["Ana"]);
    expect(
      await code(updateGroup(owner.id, { groupId, currency: "USD" })),
    ).toBe("ok");
    const me = member.Maria!;
    await createExpense(owner.id, expense(groupId, me, { [me]: 1 }));
    expect(
      await code(updateGroup(owner.id, { groupId, currency: "EUR" })),
    ).toBe("CONFLICT");
  });

  it("deletes a group with expenses and payments (owner only)", async () => {
    const owner = await user("Maria");
    const { groupId, member } = await makeGroup(owner, ["Ana"]);
    const me = member.Maria!;
    const ana = member.Ana!;
    await createExpense(owner.id, expense(groupId, me, { [me]: 1, [ana]: 1 }));
    await recordPayment(owner.id, {
      groupId,
      fromId: ana,
      toId: me,
      amount: 1_000,
      method: "GCASH",
      date: "2026-11-15",
    });
    await deleteGroup(owner.id, groupId);
    expect(await db.group.count({ where: { id: groupId } })).toBe(0);
  });
});

describe("payments and settling up", () => {
  it("only records payments between members of the group", async () => {
    const owner = await user("Maria");
    const { groupId, member } = await makeGroup(owner, ["Ana"]);
    const other = await makeGroup(owner, ["Zed"]);
    const result = await code(
      recordPayment(owner.id, {
        groupId,
        fromId: other.member.Zed!,
        toId: member.Maria!,
        amount: 1_000,
        method: "CASH",
        date: "2026-11-15",
      }),
    );
    expect(result).toBe("BAD_REQUEST");
  });

  it("partial payments reduce the suggestion", async () => {
    const owner = await user("Maria");
    const { groupId, member } = await makeGroup(owner, ["Ana"]);
    const me = member.Maria!;
    const ana = member.Ana!;
    await createExpense(owner.id, expense(groupId, me, { [me]: 1, [ana]: 1 }));
    await recordPayment(owner.id, {
      groupId,
      fromId: ana,
      toId: me,
      amount: 20_000,
      method: "GCASH",
      date: "2026-11-15",
    });
    const { simplified } = await getSettleUp(owner.id, groupId);
    expect(simplified).toEqual([{ from: ana, to: me, amount: 30_000 }]);
  });
});

describe("invites", () => {
  it("lets a new person claim a placeholder, but only once", async () => {
    const owner = await user("Maria");
    const { groupId, member } = await makeGroup(owner, ["Dan"]);
    const me = member.Maria!;
    const dan = member.Dan!;
    await createExpense(owner.id, expense(groupId, me, { [me]: 1, [dan]: 1 }));
    const { token } = await ensureInvite(owner.id, groupId);

    const real = await user("Dan Cruz");
    expect((await previewInvite(token, real.id)).placeholders).toEqual([
      expect.objectContaining({ id: dan, name: "Dan" }),
    ]);
    await joinGroup(real, { token, claimMemberId: dan });
    const detail = await getGroupDetail(groupId, real.id);
    expect(detail.me.memberId).toBe(dan);
    expect(detail.balances[dan]).toBe(-50_000);

    const impostor = await user("Not Dan");
    expect(await code(joinGroup(impostor, { token, claimMemberId: dan }))).toBe(
      "CONFLICT",
    );
  });
});
