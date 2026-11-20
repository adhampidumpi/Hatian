import { describe, expect, it } from "vitest";
import { getCurrency, isCurrencyCode, MAX_MINOR } from "./currency";
import { formatCompact, formatMoney, parseAmount } from "./format";

describe("formatMoney", () => {
  it("formats centavos as pesos", () => {
    expect(formatMoney(1_375_300, "PHP")).toBe("₱13,753.00");
  });

  it("shows a sign when asked, with a true minus sign", () => {
    expect(formatMoney(-310_700, "PHP", { signed: true })).toBe("−₱3,107.00");
    expect(formatMoney(339_300, "PHP", { signed: true })).toBe("+₱3,393.00");
    expect(formatMoney(0, "PHP", { signed: true })).toBe("₱0.00");
  });

  it("respects zero-decimal currencies", () => {
    expect(formatMoney(1_500, "JPY", { locale: "en-US" })).toBe("¥1,500");
  });
});

describe("formatCompact", () => {
  it("rounds to whole units with a sign", () => {
    expect(formatCompact(1_375_300, "PHP")).toBe("+13,753");
    expect(formatCompact(-245_000, "PHP")).toBe("−2,450");
  });

  it("rounds rather than truncates", () => {
    expect(formatCompact(135_099, "PHP")).toBe("+1,351");
    expect(formatCompact(-135_049, "PHP")).toBe("−1,350");
  });

  it("keeps decimals under one unit so a balance never reads 0", () => {
    expect(formatCompact(50, "PHP")).toBe("+0.50");
    expect(formatCompact(-1, "PHP")).toBe("−0.01");
  });

  it("shows zero without a sign", () => {
    expect(formatCompact(0, "PHP")).toBe("0");
  });
});

describe("parseAmount", () => {
  it.each([
    ["1250", 125_000],
    ["1,250.5", 125_050],
    ["₱ 1,250.50", 125_050],
    ["PHP 1,234,567", 123_456_700],
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

  it.each(["", ".", "abc", "1.234", "-5", "1.2.3", ",5", "1,2,3", "12,34"])(
    "rejects %s",
    (input) => {
      expect(parseAmount(input, "PHP")).toBeNull();
    },
  );

  it("rejects a decimal comma instead of reading it as thousands", () => {
    expect(parseAmount("1,25", "PHP")).toBeNull();
  });

  it("rejects amounts that don't fit the database column", () => {
    expect(parseAmount("21474836.47", "PHP")).toBe(MAX_MINOR);
    expect(parseAmount("21474836.48", "PHP")).toBeNull();
  });

  it("rejects decimals for zero-decimal currencies", () => {
    expect(parseAmount("100.5", "JPY")).toBeNull();
    expect(parseAmount("100", "JPY")).toBe(100);
  });
});

describe("currencies", () => {
  it("supports ISO codes with decimal minor units", () => {
    expect(isCurrencyCode("PHP")).toBe(true);
    expect(isCurrencyCode("JPY")).toBe(true);
  });

  it("rejects unknown codes and non-decimal currencies (MGA, MRU)", () => {
    expect(isCurrencyCode("XXX")).toBe(false);
    expect(isCurrencyCode("MGA")).toBe(false);
    expect(isCurrencyCode("MRU")).toBe(false);
    expect(() => getCurrency("MGA")).toThrow(/Unsupported currency/);
  });
});
