import { describe, expect, it } from "vitest";
import { addExpenseHref, isEditorRoute } from "./nav-items";

describe("addExpenseHref", () => {
  it("targets the group you're in", () => {
    expect(addExpenseHref("/groups/abc")).toBe("/groups/abc/expenses/new");
    expect(addExpenseHref("/groups/abc/balances")).toBe(
      "/groups/abc/expenses/new",
    );
  });

  it("asks for a group elsewhere", () => {
    expect(addExpenseHref("/")).toBe("/expenses/new");
    expect(addExpenseHref("/groups")).toBe("/expenses/new");
    expect(addExpenseHref(null)).toBe("/expenses/new");
  });
});

describe("isEditorRoute", () => {
  it("matches the add and edit expense screens only", () => {
    expect(isEditorRoute("/groups/abc/expenses/new")).toBe(true);
    expect(isEditorRoute("/groups/abc/expenses/xyz")).toBe(true);
    expect(isEditorRoute("/groups/abc")).toBe(false);
    expect(isEditorRoute("/groups/abc/settings")).toBe(false);
    expect(isEditorRoute("/expenses/new")).toBe(false);
  });
});
