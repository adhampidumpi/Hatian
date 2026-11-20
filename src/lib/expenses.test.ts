import { describe, expect, it } from "vitest";
import { formatDateRange, formatDay } from "./dates";
import { groupByDay, myEffect } from "./expenses";

const surf = {
  date: "2026-11-14",
  amount: 1_250_000,
  paidById: "ana",
  shares: ["you", "ana", "bea", "carlo", "dan"].map((memberId) => ({
    memberId,
    amount: 250_000,
  })),
};
const dinner = {
  date: "2026-11-14",
  amount: 486_000,
  paidById: "you",
  shares: ["you", "ana", "bea", "carlo", "dan"].map((memberId) => ({
    memberId,
    amount: 97_200,
  })),
};
const groceries = {
  date: "2026-11-12",
  amount: 234_000,
  paidById: "bea",
  shares: ["you", "ana", "bea", "carlo"].map((memberId) => ({
    memberId,
    amount: 58_500,
  })),
};

describe("myEffect", () => {
  it("you borrowed your share when someone else paid", () => {
    expect(myEffect(surf, "you")).toEqual({
      kind: "borrowed",
      amount: 250_000,
    });
  });

  it("you lent the others' shares when you paid", () => {
    expect(myEffect(dinner, "you")).toEqual({ kind: "lent", amount: 388_800 });
  });

  it("not involved when you neither paid nor share", () => {
    expect(myEffect(groceries, "dan")).toEqual({ kind: "none" });
  });

  it("not involved when you paid only for yourself", () => {
    const solo = {
      ...groceries,
      paidById: "bea",
      shares: [{ memberId: "bea", amount: 234_000 }],
    };
    expect(myEffect(solo, "bea")).toEqual({ kind: "none" });
  });
});

describe("groupByDay", () => {
  it("groups consecutive expenses by date with day totals", () => {
    const days = groupByDay([surf, dinner, groceries]);
    expect(days.map((d) => [d.date, d.total, d.expenses.length])).toEqual([
      ["2026-11-14", 1_736_000, 2],
      ["2026-11-12", 234_000, 1],
    ]);
  });
});

describe("dates", () => {
  const now = new Date(2026, 10, 20);

  it("formats day headers like the design", () => {
    expect(formatDay("2026-11-14", now)).toBe("Sat, Nov 14");
    expect(formatDay("2025-02-15", now)).toBe("Sat, Feb 15, 2025");
  });

  it("formats a group's date range", () => {
    expect(formatDateRange("2026-11-12", "2026-11-15")).toBe("Nov 12 – 15");
    expect(formatDateRange("2026-10-30", "2026-11-02")).toBe("Oct 30 – Nov 2");
    expect(formatDateRange("2025-12-30", "2026-01-02")).toBe(
      "Dec 30, 2025 – Jan 2, 2026",
    );
    expect(formatDateRange("2026-11-14", "2026-11-14")).toBe("Nov 14");
  });
});
