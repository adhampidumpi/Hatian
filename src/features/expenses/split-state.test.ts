import { describe, expect, it } from "vitest";
import {
  evaluateSplit,
  formatPercent,
  initialSplit,
  parsePercent,
  type SplitState,
} from "./split-state";

const members = [
  { id: "you", label: "You" },
  { id: "ana", label: "Ana" },
  { id: "bea", label: "Bea" },
  { id: "carlo", label: "Carlo" },
  { id: "dan", label: "Dan" },
];
const ids = members.map((m) => m.id);
const base = () => initialSplit(ids, "PHP");
const run = (state: SplitState, amount: number | null) =>
  evaluateSplit(state, amount, "PHP", members);

describe("equal split", () => {
  it("splits among the people ticked, with the design's status line", () => {
    const state = base();
    state.included.carlo = false;
    state.included.dan = false;
    const view = run(state, 100_000);
    expect(view.valid).toBe(true);
    expect(view.status).toBe("₱1,000.00 split 3 ways");
    expect(view.summary).toBe("3 of 5 people");
    expect(view.amounts).toEqual({
      you: 33_334,
      ana: 33_333,
      bea: 33_333,
      carlo: null,
      dan: null,
    });
  });

  it("explains who gets the extra centavo", () => {
    const state = base();
    state.included.carlo = false;
    state.included.dan = false;
    expect(run(state, 100_000).roundNote).toBe(
      "Can't split evenly to the centavo, so 1 extra centavo goes to you. Everyone else pays the rounded-down amount.",
    );
  });

  it("asks for an amount first", () => {
    expect(run(base(), null)).toMatchObject({
      valid: false,
      status: "Enter an amount",
    });
  });

  it("needs at least one person", () => {
    const state = base();
    for (const id of ids) state.included[id] = false;
    expect(run(state, 1_000).status).toBe("Pick at least one person");
  });
});

describe("shares", () => {
  it("shows shares and the price per share", () => {
    const state = { ...base(), mode: "SHARES" as const };
    state.shares.you = 2;
    expect(run(state, 600_000).status).toBe("6 shares · ₱1,000.00 per share");
    expect(run(state, 600_000).amounts.you).toBe(200_000);
  });
});

describe("percent", () => {
  it("starts evenly and adds up", () => {
    const view = run({ ...base(), mode: "PERCENT" }, 100_000);
    expect(view.status).toBe("Adds up to 100%");
  });

  it("says how much is left or too much", () => {
    const state = { ...base(), mode: "PERCENT" as const };
    state.percent.dan = 0;
    expect(run(state, 100_000).status).toBe("20% left to assign");
    state.percent.dan = 2500;
    expect(run(state, 100_000).status).toBe("5% too much");
  });
});

describe("exact", () => {
  it("reports what's left, matching the spec's example", () => {
    const state = { ...base(), mode: "EXACT" as const };
    state.exact.you = "250";
    state.exact.ana = "130";
    expect(run(state, 50_000)).toMatchObject({
      valid: false,
      status: "₱120.00 left to assign",
      summary: "₱380.00 of ₱500.00",
    });
  });

  it("is valid when the amounts add up, with no rounding note", () => {
    const state = { ...base(), mode: "EXACT" as const };
    state.exact.you = "300";
    state.exact.ana = "200.00";
    const view = run(state, 50_000);
    expect(view.status).toBe("Adds up to ₱500.00");
    expect(view.roundNote).toBeNull();
  });

  it("flags an amount that isn't a number", () => {
    const state = { ...base(), mode: "EXACT" as const };
    state.exact.bea = "12,5";
    expect(run(state, 50_000).status).toBe("Check the amount for Bea");
  });
});

describe("editing an existing expense", () => {
  it("restores the mode and inputs it was saved with", () => {
    const state = initialSplit(ids, "PHP", {
      mode: "EXACT",
      shares: [
        { memberId: "you", weight: 30_000, amount: 30_000 },
        { memberId: "ana", weight: 20_000, amount: 20_000 },
      ],
    });
    expect(state.mode).toBe("EXACT");
    expect(state.exact).toMatchObject({
      you: "300.00",
      ana: "200.00",
      bea: "",
    });
  });
});

describe("percent text", () => {
  it("round-trips basis points", () => {
    expect(formatPercent(3334)).toBe("33.34%");
    expect(formatPercent(2000)).toBe("20%");
    expect(parsePercent("33.34")).toBe(3334);
    expect(parsePercent("20%")).toBe(2000);
    expect(parsePercent("101")).toBeNull();
    expect(parsePercent("abc")).toBeNull();
  });
});
