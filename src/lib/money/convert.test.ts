import { describe, expect, it } from "vitest";
import { getCurrency, MAX_MINOR } from "./currency";
import { convertMinor, convertShares, RATE_CURRENCIES } from "./convert";
import { sum } from "./split";

describe("convertMinor", () => {
  it("converts between two-decimal currencies", () => {
    // $100.00 at 63.813 → ₱6,381.30
    expect(convertMinor(10_000, "USD", "PHP", "63.813")).toBe(638_130);
  });

  it("handles currencies without minor units, both ways", () => {
    // ¥1,000 at 0.39817 → ₱398.17
    expect(convertMinor(1_000, "JPY", "PHP", "0.39817")).toBe(39_817);
    // ₱1,000.00 at 2.5115 → ¥2,511.5, rounded half up
    expect(convertMinor(100_000, "PHP", "JPY", "2.5115")).toBe(2_512);
  });

  it("rounds half up and keeps tiny amounts honest", () => {
    expect(convertMinor(1, "USD", "PHP", "0.5")).toBe(1);
    expect(convertMinor(1, "USD", "PHP", "0.49")).toBe(0);
  });

  it("reads stored rates with trailing zeros", () => {
    expect(convertMinor(10_000, "USD", "PHP", "63.8130000000")).toBe(638_130);
  });

  it("returns null when the result doesn't fit a money column", () => {
    expect(convertMinor(MAX_MINOR, "USD", "PHP", "63.813")).toBeNull();
  });

  it("rejects malformed rates", () => {
    expect(() => convertMinor(100, "USD", "PHP", "1e3")).toThrow();
    expect(() => convertMinor(100, "USD", "PHP", "0")).toThrow();
  });
});

describe("convertShares", () => {
  it("keeps proportions and adds up exactly", () => {
    const shares = [
      { memberId: "a", weight: 1, amount: 3_334 },
      { memberId: "b", weight: 1, amount: 3_333 },
      { memberId: "c", weight: 1, amount: 3_333 },
    ];
    const converted = convertShares(shares, 638_130);
    expect(sum(converted.map((s) => s.amount))).toBe(638_130);
    // 638,130 × 3334/10000 = 212,752.54; × 3333/10000 = 212,688.73 (twice).
    // Two leftover centavos go to the two largest remainders.
    expect(converted.map((s) => s.amount)).toEqual([212_752, 212_689, 212_689]);
    expect(converted.map((s) => s.weight)).toEqual([1, 1, 1]);
  });

  it("never gives anything to someone whose share was zero", () => {
    const shares = [
      { memberId: "a", weight: 1, amount: 1 },
      { memberId: "b", weight: 1, amount: 0 },
      { memberId: "c", weight: 1, amount: 0 },
    ];
    expect(convertShares(shares, 40).map((s) => s.amount)).toEqual([40, 0, 0]);
  });

  it("always adds up, for any amounts", () => {
    for (let run = 0; run < 200; run++) {
      const shares = Array.from({ length: 1 + (run % 7) }, (_, i) => ({
        memberId: String(i),
        weight: 1,
        amount: Math.floor(Math.random() * 100_000),
      }));
      if (sum(shares.map((s) => s.amount)) === 0) continue;
      const total = Math.floor(Math.random() * 10_000_000);
      expect(sum(convertShares(shares, total).map((s) => s.amount))).toBe(
        total,
      );
    }
  });
});

it("every rate currency is one the money code can format", () => {
  for (const code of RATE_CURRENCIES)
    expect(() => getCurrency(code)).not.toThrow();
});
