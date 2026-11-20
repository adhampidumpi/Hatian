import "server-only";
import { categoryNames } from "@/lib/categories";
import { toCsv } from "@/lib/csv";
import { formatDecimal } from "@/lib/money/format";
import { db } from "../db";
import { listExpenses } from "./expenses";

/**
 * The group's expenses as CSV: one row per expense, one column per person
 * with their share, so the file can be checked in any spreadsheet.
 */
export async function exportGroupCsv(userId: string, groupId: string) {
  const expenses = await listExpenses(userId, groupId);
  const group = await db.group.findUniqueOrThrow({
    where: { id: groupId },
    select: {
      name: true,
      currency: true,
      members: {
        orderBy: { colorIndex: "asc" },
        select: { id: true, name: true },
      },
    },
  });
  const nameOf = new Map(group.members.map((m) => [m.id, m.name]));
  const money = (amount: number) => formatDecimal(amount, group.currency);

  const header = [
    "Date",
    "Description",
    "Category",
    "Paid by",
    `Amount (${group.currency})`,
    "Paid in",
    "Exchange rate",
    "Split",
    ...group.members.map((m) => `${m.name}'s share`),
  ];
  const rows = [...expenses].reverse().map((e) => {
    const share = new Map(e.shares.map((s) => [s.memberId, s.amount]));
    return [
      e.date,
      e.description,
      categoryNames[e.categoryId ?? "other"] ?? "Other",
      nameOf.get(e.paidById) ?? "",
      money(e.amount),
      e.originalCurrency && e.originalAmount !== null
        ? `${formatDecimal(e.originalAmount, e.originalCurrency)} ${e.originalCurrency}`
        : "",
      e.rate ?? "",
      e.splitMode.toLowerCase(),
      ...group.members.map((m) => money(share.get(m.id) ?? 0)),
    ];
  });

  const filename = `${group.name.replace(/[^\w -]+/g, "").trim() || "group"}.csv`;
  return { filename, csv: toCsv([header, ...rows]) };
}
