import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import { formatDecimal } from "./money/format";

describe("toCsv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(toCsv([["Villa, 2 nights", 'The "good" one', "a\nb"]])).toBe(
      '"Villa, 2 nights","The ""good"" one","a\nb"\r\n',
    );
  });

  it("neutralises spreadsheet formulas", () => {
    expect(toCsv([["=HYPERLINK(1)", "+1", "-2", "@x"]])).toBe(
      "'=HYPERLINK(1),'+1,'-2,'@x\r\n",
    );
  });

  it("leaves numbers alone", () => {
    expect(toCsv([[-12.5, 3]])).toBe("-12.5,3\r\n");
  });
});

describe("formatDecimal", () => {
  it("writes minor units as exact decimals", () => {
    expect(formatDecimal(1_250_000, "PHP")).toBe("12500.00");
    expect(formatDecimal(5, "PHP")).toBe("0.05");
    expect(formatDecimal(-97_200, "PHP")).toBe("-972.00");
    expect(formatDecimal(1_500, "JPY")).toBe("1500");
  });
});
