"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Money } from "@/components/money";
import { categories } from "@/lib/categories";
import { formatShortDay } from "@/lib/dates";
import { myEffect, signedEffect } from "@/lib/expenses";
import { sum } from "@/lib/money/split";
import { cn } from "@/lib/utils";
import { memberLabel, type Group } from "@/features/groups/use-group";
import type { Expense } from "./use-expenses";

const modeLabel = {
  EQUAL: "Equally",
  SHARES: "Shares",
  PERCENT: "Percent",
  EXACT: "Exact",
} as const;

const filterClass =
  "h-[42px] rounded-[11px] border border-line-strong bg-card px-3.5 text-[14px] font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** Desktop layout: searchable, filterable table with totals. */
export function ExpenseTable({
  group,
  expenses,
}: {
  group: Group;
  expenses: Expense[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [memberId, setMemberId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const members = useMemo(
    () => new Map(group.members.map((m) => [m.id, m])),
    [group.members],
  );

  const shown = expenses.filter((e) => {
    if (query && !e.description.toLowerCase().includes(query.toLowerCase()))
      return false;
    if (
      memberId &&
      e.paidById !== memberId &&
      !e.shares.some((s) => s.memberId === memberId)
    )
      return false;
    if (categoryId && (e.categoryId ?? "other") !== categoryId) return false;
    return true;
  });
  const myTotal = sum(
    shown.map((e) => signedEffect(myEffect(e, group.me.memberId))),
  );
  const open = (id: string) =>
    router.push(`/groups/${group.id}/expenses/${id}`);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2.5">
        <div className="flex h-[42px] min-w-0 flex-[1_1_260px] items-center gap-2 rounded-[11px] border border-line-strong bg-card px-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink">
          <Search size={18} className="text-ink-3" aria-hidden />
          <label htmlFor="expense-search" className="sr-only">
            Search expenses
          </label>
          <input
            id="expense-search"
            type="search"
            placeholder="Search expenses"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
        </div>
        <label className="sr-only" htmlFor="expense-member">
          Filter by person
        </label>
        <select
          id="expense-member"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className={filterClass}
        >
          <option value="">Everyone</option>
          {group.members
            .filter((m) => !m.removed)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {memberLabel(m)}
              </option>
            ))}
        </select>
        <label className="sr-only" htmlFor="expense-category">
          Filter by category
        </label>
        <select
          id="expense-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={filterClass}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[640px] border-collapse text-[14px]">
          <thead>
            <tr className="text-left text-[12px] tracking-[0.04em] text-ink-2 uppercase">
              {["Date", "Expense", "Paid by", "Split"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="border-b border-line px-4 py-3 font-semibold"
                >
                  {h}
                </th>
              ))}
              <th
                scope="col"
                className="border-b border-line px-4 py-3 text-right font-semibold"
              >
                Total
              </th>
              <th
                scope="col"
                className="border-b border-line px-4 py-3 text-right font-semibold"
              >
                You
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => {
              const payer = members.get(e.paidById);
              const mine = signedEffect(myEffect(e, group.me.memberId));
              return (
                <tr
                  key={e.id}
                  onClick={() => open(e.id)}
                  className="cursor-pointer border-b border-line-soft hover:bg-paper"
                >
                  <td className="px-4 py-3.5 whitespace-nowrap text-ink-3">
                    {formatShortDay(e.date)}
                  </td>
                  <td className="px-4 py-3.5 font-semibold">
                    {/* The real link, for keyboard and screen readers. */}
                    <Link
                      href={`/groups/${group.id}/expenses/${e.id}`}
                      onClick={(ev) => ev.stopPropagation()}
                      className="hover:underline"
                    >
                      {e.description}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    {payer ? memberLabel(payer) : "Someone"}
                  </td>
                  <td className="px-4 py-3.5 text-ink-3">
                    {modeLabel[e.splitMode]} · {e.shares.length}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Money amount={e.amount} currency={group.currency} />
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3.5 text-right",
                      mine > 0
                        ? "text-owed"
                        : mine < 0
                          ? "text-owe"
                          : "text-ink-3",
                    )}
                  >
                    {mine === 0 ? (
                      "—"
                    ) : (
                      <Money amount={mine} currency={group.currency} signed />
                    )}
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-3">
                  No expenses match.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-line">
              <th
                scope="row"
                colSpan={4}
                className="px-4 py-3.5 text-left font-semibold"
              >
                {shown.length} {shown.length === 1 ? "expense" : "expenses"}
              </th>
              <td className="px-4 py-3.5 text-right font-semibold">
                <Money
                  amount={sum(shown.map((e) => e.amount))}
                  currency={group.currency}
                />
              </td>
              <td
                className={cn(
                  "px-4 py-3.5 text-right font-semibold",
                  myTotal > 0 ? "text-owed" : myTotal < 0 ? "text-owe" : "",
                )}
              >
                <Money amount={myTotal} currency={group.currency} signed />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
