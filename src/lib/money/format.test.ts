import { describe, expect, it } from "vitest";
import { formatMoney, parseAmount } from "./format";

describe("formatMoney", () => {
  it("formats centavos as pesos", () => {
    expect(formatMoney(1_375_300, "PHP")).toBe("₱13,753.00");
  });

  it("shows a sign when asked", () => {
    expect(formatMoney(-310_700, "PHP", { signed: true })).toBe("-₱3,107.00");
    expect(formatMoney(339_300, "PHP", { signed: true })).toBe("+₱3,393.00");
    expect(formatMoney(0, "PHP", { signed: true })).toBe("₱0.00");
  });

  it("respects zero-decimal currencies", () => {
    expect(formatMoney(1_500, "JPY", { locale: "en-US" })).toBe("¥1,500");
  });
});

describe("parseAmount", () => {
  it.each([
    ["1250", 125_000],
    ["1,250.5", 125_050],
    ["₱ 1,250.50", 125_050],
    [".5", 50],
    ["0.01", 1],
    ["12.", 1_200],
  ])("parses %s", (input, expected) => {
    expect(parseAmount(input, "PHP")).toBe(expected);
  });

  it("avoids float errors (0.1 + 0.2 style inputs)", () => {
    expect(parseAmount("19.99", "PHP")).toBe(1_999);
    expect(parseAmount("1.15", "PHP")).toBe(115);
  });

  it.each(["", ".", "abc", "1.234", "-5", "1.2.3"])("rejects %s", (input) => {
    expect(parseAmount(input, "PHP")).toBeNull();
  });

  it("rejects decimals for zero-decimal currencies", () => {
    expect(parseAmount("100.5", "JPY")).toBeNull();
    expect(parseAmount("100", "JPY")).toBe(100);
  });
});
