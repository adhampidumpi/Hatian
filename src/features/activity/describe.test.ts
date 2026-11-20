import { describe, expect, it } from "vitest";
import type { ExpenseSnapshot } from "@/lib/activity";
import { describeActivity } from "./describe";

const ctx = {
  members: {
    m_you: { name: "Maria Santos", isMe: true },
    m_ana: { name: "Ana", isMe: false },
    m_bea: { name: "Bea", isMe: false },
    m_carlo: { name: "Carlo", isMe: false },
    m_dan: { name: "Dan", isMe: false },
  },
  myMemberId: "m_you",
  currency: "PHP",
};

const groceries: ExpenseSnapshot = {
  description: "Groceries",
  amount: 214_000,
  currency: "PHP",
  date: "2026-11-12",
  categoryId: "groceries",
  paidById: "m_bea",
  splitMode: "EQUAL",
  shares: {
    m_you: 42_800,
    m_ana: 42_800,
    m_bea: 42_800,
    m_carlo: 42_800,
    m_dan: 42_800,
  },
  note: null,
};

describe("describeActivity", () => {
  it("words a new expense from your side", () => {
    const surf: ExpenseSnapshot = {
      ...groceries,
      description: "Surf lessons",
      amount: 1_250_000,
      paidById: "m_ana",
      shares: {
        m_you: 250_000,
        m_ana: 250_000,
        m_bea: 250_000,
        m_carlo: 250_000,
        m_dan: 250_000,
      },
    };
    expect(
      describeActivity({ type: "EXPENSE_CREATED", after: surf }, "m_ana", ctx),
    ).toEqual({
      text: "added “Surf lessons”",
      amount: 1_250_000,
      effect: { kind: "borrowed", amount: 250_000 },
    });
  });

  it("lists what an edit changed, like the design", () => {
    const after: ExpenseSnapshot = {
      ...groceries,
      amount: 234_000,
      shares: { m_you: 58_500, m_ana: 58_500, m_bea: 58_500, m_carlo: 58_500 },
    };
    const d = describeActivity(
      { type: "EXPENSE_UPDATED", before: groceries, after },
      "m_bea",
      ctx,
    );
    expect(d.text).toBe("edited “Groceries”");
    expect(d.details).toBe(
      "Amount ₱2,140.00 → ₱2,340.00 · Dan removed from split",
    );
  });

  it("notices payer, date, category and split changes", () => {
    const after: ExpenseSnapshot = {
      ...groceries,
      paidById: "m_you",
      date: "2026-11-13",
      categoryId: "food",
      splitMode: "SHARES",
    };
    expect(
      describeActivity(
        { type: "EXPENSE_UPDATED", before: groceries, after },
        "m_you",
        ctx,
      ).details,
    ).toBe(
      "Paid by Bea → you · Date Nov 12 → Nov 13 · Category Groceries → Food & drink · Split equally → by shares",
    );
  });

  it("says who paid whom, and who recorded it", () => {
    const payment = {
      fromId: "m_carlo",
      toId: "m_ana",
      amount: 310_700,
      currency: "PHP",
      method: "GCASH",
      date: "2026-11-15",
      reference: "ref 1029",
    };
    expect(
      describeActivity(
        { type: "PAYMENT_RECORDED", after: payment },
        "m_carlo",
        ctx,
      ),
    ).toEqual({
      text: "paid Ana",
      amount: 310_700,
      details: "GCash · ref 1029",
    });
    expect(
      describeActivity(
        { type: "PAYMENT_RECORDED", after: payment },
        "m_you",
        ctx,
      ).text,
    ).toBe("recorded Carlo paying Ana");
    expect(
      describeActivity(
        { type: "PAYMENT_RECORDED", after: { ...payment, toId: "m_you" } },
        "m_carlo",
        ctx,
      ).text,
    ).toBe("paid you");
  });

  it("covers joining, claiming, leaving and removing", () => {
    const dan = { memberId: "m_dan", name: "Dan" };
    expect(
      describeActivity(
        { type: "MEMBER_JOINED", after: { ...dan, claimed: false } },
        "m_dan",
        ctx,
      ).text,
    ).toBe("joined with the invite link");
    expect(
      describeActivity(
        { type: "MEMBER_JOINED", after: { ...dan, claimed: true } },
        "m_dan",
        ctx,
      ).text,
    ).toBe("joined as Dan");
    expect(
      describeActivity({ type: "MEMBER_REMOVED", before: dan }, "m_dan", ctx)
        .text,
    ).toBe("left the group");
    expect(
      describeActivity({ type: "MEMBER_REMOVED", before: dan }, "m_you", ctx)
        .text,
    ).toBe("removed Dan");
  });

  it("describes group setting changes", () => {
    expect(
      describeActivity(
        {
          type: "GROUP_UPDATED",
          before: { simplifyDebts: true },
          after: { simplifyDebts: false },
        },
        "m_ana",
        ctx,
      ).text,
    ).toBe("turned simplified debts off");
  });
});
