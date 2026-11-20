import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { allocateShares, sum, type SplitMode } from "./split";

const amounts = (r: ReturnType<typeof allocateShares>) =>
  r.ok ? r.shares.map((s) => s.amount) : r;

describe("allocateShares", () => {
  describe("EQUAL", () => {
    it("splits ₱1,000.00 among 3 as 333.34 / 333.33 / 333.33", () => {
      const r = allocateShares(100_000, "PHP", "EQUAL", [
        { userId: "a", weight: 1 },
        { userId: "b", weight: 1 },
        { userId: "c", weight: 1 },
      ]);
      expect(amounts(r)).toEqual([33_334, 33_333, 33_333]);
      expect(r.ok && r.roundedUp).toEqual(["a"]);
    });

    it("leaves out people with weight 0", () => {
      const r = allocateShares(234_000, "PHP", "EQUAL", [
        { userId: "a", weight: 1 },
        { userId: "b", weight: 0 },
        { userId: "c", weight: 1 },
        { userId: "d", weight: 1 },
        { userId: "e", weight: 1 },
      ]);
      expect(r.ok && r.shares.map((s) => s.userId)).toEqual([
        "a",
        "c",
        "d",
        "e",
      ]);
      expect(amounts(r)).toEqual([58_500, 58_500, 58_500, 58_500]);
      expect(r.ok && r.roundedUp).toEqual([]);
    });

    it("rejects weights other than 0 or 1", () => {
      const r = allocateShares(100, "PHP", "EQUAL", [
        { userId: "a", weight: 2 },
      ]);
      expect(r).toEqual({
        ok: false,
        error: { code: "INVALID_WEIGHT", userId: "a" },
      });
    });

    it("needs at least one participant", () => {
      const r = allocateShares(100, "PHP", "EQUAL", [
        { userId: "a", weight: 0 },
      ]);
      expect(r).toEqual({ ok: false, error: { code: "NO_PARTICIPANTS" } });
    });

    it("handles zero-decimal currencies", () => {
      const r = allocateShares(1_000, "JPY", "EQUAL", [
        { userId: "a", weight: 1 },
        { userId: "b", weight: 1 },
        { userId: "c", weight: 1 },
      ]);
      expect(amounts(r)).toEqual([334, 333, 333]);
    });
  });

  describe("SHARES", () => {
    it("gives a couple with 2 shares twice as much", () => {
      const r = allocateShares(300_000, "PHP", "SHARES", [
        { userId: "couple", weight: 2 },
        { userId: "solo", weight: 1 },
      ]);
      expect(amounts(r)).toEqual([200_000, 100_000]);
    });
  });

  describe("largest remainder", () => {
    it("rounds up the biggest fractional remainder, not the first or largest share", () => {
      // Exact: 4.2, 1.4, 1.4 → floors 4, 1, 1 and 1 unit left over.
      // dinero.js allocate() would give it to the 3-share; Hamilton gives it to b.
      const r = allocateShares(7, "PHP", "SHARES", [
        { userId: "a", weight: 3 },
        { userId: "b", weight: 1 },
        { userId: "c", weight: 1 },
      ]);
      expect(amounts(r)).toEqual([4, 2, 1]);
      expect(r.ok && r.roundedUp).toEqual(["b"]);
    });

    it("never rounds up a share that is already whole (fast-check counterexample)", () => {
      const r = allocateShares(434_944_792, "PHP", "SHARES", [
        { userId: "a", weight: 5 },
        { userId: "b", weight: 1 },
        { userId: "c", weight: 4 },
      ]);
      expect(amounts(r)).toEqual([217_472_396, 43_494_479, 173_977_917]);
    });
  });

  describe("PERCENT", () => {
    it("splits by basis points", () => {
      const r = allocateShares(100_001, "PHP", "PERCENT", [
        { userId: "a", weight: 5_000 },
        { userId: "b", weight: 3_000 },
        { userId: "c", weight: 2_000 },
      ]);
      expect(amounts(r)).toEqual([50_001, 30_000, 20_000]);
    });

    it("reports how much is left when the total isn't 100%", () => {
      const r = allocateShares(100_000, "PHP", "PERCENT", [
        { userId: "a", weight: 5_000 },
        { userId: "b", weight: 2_500 },
      ]);
      expect(r).toEqual({
        ok: false,
        error: { code: "PERCENT_MISMATCH", remaining: 2_500 },
      });
    });
  });

  describe("EXACT", () => {
    it("uses the amounts as given when they add up", () => {
      const r = allocateShares(50_000, "PHP", "EXACT", [
        { userId: "a", weight: 12_000 },
        { userId: "b", weight: 38_000 },
      ]);
      expect(amounts(r)).toEqual([12_000, 38_000]);
    });

    it("reports what's left to assign (₱120.00 left)", () => {
      const r = allocateShares(50_000, "PHP", "EXACT", [
        { userId: "a", weight: 12_000 },
        { userId: "b", weight: 26_000 },
      ]);
      expect(r).toEqual({
        ok: false,
        error: { code: "EXACT_MISMATCH", remaining: 12_000 },
      });
    });

    it("reports over-assignment as negative", () => {
      const r = allocateShares(100, "PHP", "EXACT", [
        { userId: "a", weight: 150 },
      ]);
      expect(r).toEqual({
        ok: false,
        error: { code: "EXACT_MISMATCH", remaining: -50 },
      });
    });
  });

  it.each([0, -100, 1.5, Number.NaN])("rejects amount %s", (amount) => {
    const r = allocateShares(amount, "PHP", "EQUAL", [
      { userId: "a", weight: 1 },
    ]);
    expect(r).toEqual({ ok: false, error: { code: "INVALID_AMOUNT" } });
  });

  it("property: shares always add up to the amount and differ from the exact ratio by < 1 unit", () => {
    const modes: SplitMode[] = ["EQUAL", "SHARES"];
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000_000 }),
        fc.constantFrom(...modes),
        fc.array(fc.integer({ min: 0, max: 10 }), {
          minLength: 1,
          maxLength: 20,
        }),
        (amount, mode, rawWeights) => {
          const weights =
            mode === "EQUAL"
              ? rawWeights.map((w) => (w > 0 ? 1 : 0))
              : rawWeights;
          fc.pre(weights.some((w) => w > 0));
          const inputs = weights.map((weight, i) => ({
            userId: `u${i}`,
            weight,
          }));
          const r = allocateShares(amount, "PHP", mode, inputs);
          if (!r.ok) return false;
          const total = sum(r.shares.map((s) => s.weight));
          return (
            sum(r.shares.map((s) => s.amount)) === amount &&
            r.shares.every(
              (s) =>
                Number.isInteger(s.amount) &&
                Math.abs(s.amount - (amount * s.weight) / total) < 1,
            )
          );
        },
      ),
    );
  });
});
