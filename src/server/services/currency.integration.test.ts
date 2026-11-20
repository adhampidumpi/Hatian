import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { isoDate } from "@/lib/activity";
import { cleanUp, makeGroup, makeUser } from "@/test/factories";
import { db } from "../db";
import { AppError } from "./errors";
import { createExpense, getExpense, updateExpense } from "./expenses";
import { summarise, type GroupSummary } from "./groups";
import { getRate } from "./rates";

// Rates for days in 2001 are seeded here, so nothing calls the real API.
const created: string[] = [];
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockRejectedValue(new Error("offline"));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
afterAll(async () => {
  await cleanUp(created);
  await db.currencyRate.deleteMany({
    where: { OR: [{ date: { lt: new Date("2002-01-01") } }, { base: "ZAR" }] },
  });
});

async function seedRate(
  base: string,
  quote: string,
  date: string,
  rate: string,
) {
  const key = { base, quote, date: new Date(`${date}T00:00:00Z`) };
  await db.currencyRate.upsert({
    where: { base_quote_date: key },
    create: { ...key, rate },
    update: { rate, fetchedAt: new Date() },
  });
}

function answer(rates: Record<string, number>) {
  return new Response(JSON.stringify({ rates }), {
    headers: { "content-type": "application/json" },
  });
}

async function trio() {
  const owner = await makeUser("Maria");
  created.push(owner.id);
  const { groupId, member } = await makeGroup(owner, ["Ana", "Bea"]);
  const ids = [member.Maria!, member.Ana!, member.Bea!];
  return { owner, groupId, ids };
}

function usdDinner(groupId: string, ids: string[], extra = {}) {
  return {
    groupId,
    description: "Dinner",
    categoryId: "food",
    date: "2001-01-05",
    amount: 10_000, // $100.00
    currency: "USD",
    paidById: ids[0]!,
    splitMode: "EQUAL" as const,
    weights: ids.map((memberId) => ({ memberId, weight: 1 })),
    ...extra,
  };
}

describe("expenses paid in another currency", () => {
  it("converts to the group currency and keeps the original", async () => {
    await seedRate("USD", "PHP", "2001-01-05", "63.813");
    const { owner, groupId, ids } = await trio();
    const { id } = await createExpense(owner.id, usdDinner(groupId, ids));

    const saved = await getExpense(owner.id, groupId, id);
    expect(saved).toMatchObject({
      amount: 638_130,
      currency: "PHP",
      originalAmount: 10_000,
      originalCurrency: "USD",
      rate: "63.813",
    });
    const shares = saved.shares.map((s) => s.amount);
    expect(shares.reduce((a, b) => a + b)).toBe(638_130);
  });

  it("checks an exact split in the currency it was paid in", async () => {
    await seedRate("USD", "PHP", "2001-01-05", "63.813");
    const { owner, groupId, ids } = await trio();
    const weights = [6_000, 4_000, 0].map((weight, i) => ({
      memberId: ids[i]!,
      weight,
    }));
    const { id } = await createExpense(
      owner.id,
      usdDinner(groupId, ids, { splitMode: "EXACT", weights }),
    );
    const saved = await getExpense(owner.id, groupId, id);
    expect(saved.shares.map((s) => [s.weight, s.amount])).toEqual([
      [6_000, 382_878],
      [4_000, 255_252],
    ]);

    const wrong = weights.map((w) => ({ ...w, weight: 1_000 }));
    await expect(
      createExpense(
        owner.id,
        usdDinner(groupId, ids, { splitMode: "EXACT", weights: wrong }),
      ),
    ).rejects.toThrow("The amounts must add up to the total.");
  });

  it("keeps its rate on edit until the currency or date changes", async () => {
    await seedRate("USD", "PHP", "2001-01-05", "63.813");
    await seedRate("USD", "PHP", "2001-01-04", "60");
    const { owner, groupId, ids } = await trio();
    const { id } = await createExpense(owner.id, usdDinner(groupId, ids));

    await seedRate("USD", "PHP", "2001-01-05", "70"); // cache changes later
    const edit = { ...usdDinner(groupId, ids), expenseId: id };
    await updateExpense(owner.id, { ...edit, description: "Late dinner" });
    expect((await getExpense(owner.id, groupId, id)).rate).toBe("63.813");

    await updateExpense(owner.id, { ...edit, date: "2001-01-04" });
    expect(await getExpense(owner.id, groupId, id)).toMatchObject({
      rate: "60",
      amount: 600_000,
    });

    await updateExpense(owner.id, {
      ...edit,
      currency: "PHP",
      amount: 50_000,
    });
    expect(await getExpense(owner.id, groupId, id)).toMatchObject({
      amount: 50_000,
      originalAmount: null,
      originalCurrency: null,
      rate: null,
    });
  });

  it("says so when no rate can be had", async () => {
    const { owner, groupId, ids } = await trio();
    const attempt = createExpense(
      owner.id,
      usdDinner(groupId, ids, { date: "2001-02-01" }),
    );
    await expect(attempt).rejects.toBeInstanceOf(AppError);
    await expect(attempt).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });
});

describe("getRate", () => {
  it("fetches a past day once, then serves it from the cache", async () => {
    fetchMock.mockResolvedValue(answer({ PHP: 63.5 }));
    expect(await getRate("USD", "PHP", "2001-03-01")).toBe("63.5");
    expect(await getRate("USD", "PHP", "2001-03-01")).toBe("63.5");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      "https://api.frankfurter.dev/v1/2001-03-01?base=USD&symbols=PHP",
    );
  });

  it("rechecks today's rate after an hour, falling back to the old one", async () => {
    const today = isoDate(new Date());
    const key = { base: "ZAR", quote: "PHP", date: new Date(today) };
    await db.currencyRate.create({
      data: {
        ...key,
        rate: "3.1",
        fetchedAt: new Date(Date.now() - 2 * 3600_000),
      },
    });
    expect(await getRate("ZAR", "PHP", today)).toBe("3.1"); // API down
    fetchMock.mockResolvedValue(answer({ PHP: 3.2 }));
    expect(await getRate("ZAR", "PHP", today)).toBe("3.2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("Home totals", () => {
  const group = (currency: string, myBalance: number): GroupSummary => ({
    id: currency + myBalance,
    name: "",
    icon: "users",
    currency,
    memberCount: 2,
    myBalance,
    settled: false,
    lastActivityAt: new Date(),
  });

  it("converts groups in other currencies at today's rate", async () => {
    const today = isoDate(new Date());
    await seedRate("ZAR", "PHP", today, "3.25");
    const totals = await summarise([
      group("PHP", 100_000),
      group("PHP", -5_000),
      group("ZAR", 10_000),
    ]);
    expect(totals).toMatchObject({
      currency: "PHP",
      owed: 132_500,
      owe: 5_000,
      approximate: true,
      leftOut: 0,
    });
  });

  it("leaves out groups it can't convert, and says how many", async () => {
    const totals = await summarise([group("PHP", 100_000), group("ISK", -500)]);
    expect(totals).toMatchObject({ owed: 100_000, owe: 0, leftOut: 1 });
  });
});
