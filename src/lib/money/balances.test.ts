import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  siargaoExpected,
  siargaoExpenses,
  siargaoMembers,
} from "@/server/demo/sample-data";
import {
  computeBalances,
  computePairwiseDebts,
  simplifyDebts,
  suggestPayments,
  type Balances,
  type LedgerExpense,
  type LedgerPayment,
  type Transfer,
} from "./balances";
import { allocateShares, sum } from "./split";

const memberIds = siargaoMembers.map((m) => m.id);

const siargao: LedgerExpense[] = siargaoExpenses.map((e) => {
  const r = allocateShares(
    e.amount,
    "PHP",
    e.mode,
    memberIds.map((id) => ({
      memberId: id,
      weight: e.participants.includes(id) ? 1 : 0,
    })),
  );
  if (!r.ok) throw new Error("bad fixture");
  return { paidById: e.paidById, amount: e.amount, shares: r.shares };
});

/** Apply transfers as payments and return the resulting balances. */
function settle(balances: Balances, transfers: Transfer[]): Balances {
  const after = { ...balances };
  for (const t of transfers) {
    after[t.from] = (after[t.from] ?? 0) + t.amount;
    after[t.to] = (after[t.to] ?? 0) - t.amount;
  }
  return after;
}

describe("Siargao Trip sample", () => {
  it("totals ₱44,950.00", () => {
    expect(sum(siargao.map((e) => e.amount))).toBe(siargaoExpected.total);
  });

  it("gives the expected net balances", () => {
    expect(computeBalances(siargao, [])).toEqual(siargaoExpected.balances);
  });

  it("simplifies to 4 payments", () => {
    expect(suggestPayments(siargao, [], { simplify: true })).toEqual(
      siargaoExpected.simplified,
    );
  });

  it("has 10 pairwise payments without simplification", () => {
    expect(suggestPayments(siargao, [], { simplify: false })).toEqual(
      siargaoExpected.pairwise,
    );
  });

  it("both suggestion lists settle everyone to zero", () => {
    const balances = computeBalances(siargao, []);
    for (const transfers of [
      siargaoExpected.simplified,
      siargaoExpected.pairwise,
    ]) {
      expect(
        Object.values(settle(balances, transfers)).every((v) => v === 0),
      ).toBe(true);
    }
  });

  it("keeps the other suggestions when one is paid (stable ordering)", () => {
    const first = siargaoExpected.simplified[0]!;
    const payment = {
      fromId: first.from,
      toId: first.to,
      amount: first.amount,
    };
    expect(suggestPayments(siargao, [payment], { simplify: true })).toEqual(
      siargaoExpected.simplified.slice(1),
    );
  });

  it("handles a partial payment", () => {
    const payment = { fromId: "dan", toId: "you", amount: 200_000 };
    const balances = computeBalances(siargao, [payment]);
    expect(balances.dan).toBe(-527_200);
    expect(balances.you).toBe(1_175_300);
  });
});

describe("computeBalances", () => {
  it("includes members with no activity as 0", () => {
    expect(computeBalances([], [], ["a", "b"])).toEqual({ a: 0, b: 0 });
  });

  it("treats a payment as reducing the payer's debt", () => {
    const expenses = [
      {
        paidById: "a",
        amount: 1_000,
        shares: [
          { memberId: "a", amount: 500 },
          { memberId: "b", amount: 500 },
        ],
      },
    ];
    const payments: LedgerPayment[] = [{ fromId: "b", toId: "a", amount: 500 }];
    expect(computeBalances(expenses, payments)).toEqual({ a: 0, b: 0 });
  });
});

describe("computePairwiseDebts", () => {
  it("nets debts within a pair", () => {
    const expenses = [
      {
        paidById: "a",
        amount: 1_000,
        shares: [{ memberId: "b", amount: 1_000 }],
      },
      { paidById: "b", amount: 300, shares: [{ memberId: "a", amount: 300 }] },
    ];
    expect(computePairwiseDebts(expenses, [])).toEqual([
      { from: "b", to: "a", amount: 700 },
    ]);
  });

  it("ignores the payer's own share", () => {
    const expenses = [
      {
        paidById: "a",
        amount: 1_000,
        shares: [{ memberId: "a", amount: 1_000 }],
      },
    ];
    expect(computePairwiseDebts(expenses, [])).toEqual([]);
  });
});

describe("simplifyDebts properties", () => {
  // Arbitrary balances that sum to zero.
  const zeroSumBalances = fc
    .array(fc.integer({ min: -1_000_000, max: 1_000_000 }), {
      minLength: 1,
      maxLength: 12,
    })
    .map((values) => {
      const balances: Balances = {};
      values.forEach(
        (v, i) => (balances[`u${String(i).padStart(2, "0")}`] = v),
      );
      balances.zz = -sum(values);
      return balances;
    });

  it("clears every balance to zero", () => {
    fc.assert(
      fc.property(zeroSumBalances, (balances) => {
        const after = settle(balances, simplifyDebts(balances));
        return Object.values(after).every((v) => v === 0);
      }),
    );
  });

  it("uses at most n − 1 positive, integer payments", () => {
    fc.assert(
      fc.property(zeroSumBalances, (balances) => {
        const transfers = simplifyDebts(balances);
        const nonZero = Object.values(balances).filter((v) => v !== 0).length;
        return (
          transfers.length <= Math.max(0, nonZero - 1) &&
          transfers.every(
            (t) =>
              t.amount > 0 && Number.isInteger(t.amount) && t.from !== t.to,
          )
        );
      }),
    );
  });

  it("never changes anyone's net (pairwise and simplified agree)", () => {
    const expense = fc.record({
      paidById: fc.constantFrom("a", "b", "c", "d"),
      shares: fc.uniqueArray(
        fc.record({
          memberId: fc.constantFrom("a", "b", "c", "d"),
          amount: fc.integer({ min: 1, max: 100_000 }),
        }),
        { selector: (s) => s.memberId, minLength: 1 },
      ),
    });
    fc.assert(
      fc.property(fc.array(expense, { maxLength: 15 }), (raw) => {
        const expenses = raw.map((e) => ({
          ...e,
          amount: sum(e.shares.map((s) => s.amount)),
        }));
        const balances = computeBalances(expenses, []);
        const viaPairwise = settle(
          balances,
          computePairwiseDebts(expenses, []),
        );
        const viaSimplified = settle(balances, simplifyDebts(balances));
        return (
          Object.values(viaPairwise).every((v) => v === 0) &&
          Object.values(viaSimplified).every((v) => v === 0)
        );
      }),
    );
  });
});
