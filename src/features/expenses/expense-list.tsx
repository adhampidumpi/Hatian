"use client";

import Link from "next/link";
import { useId } from "react";
import { Money } from "@/components/money";
import { formatDay } from "@/lib/dates";
import { groupByDay, myEffect } from "@/lib/expenses";
import { memberLabel, type Group } from "@/features/groups/use-group";
import { CategoryTile } from "./category-icon";
import { ExpenseEffect } from "./expense-effect";
import type { Expense } from "./use-expenses";

/** Phone layout: expenses grouped by day with day totals. */
export function ExpenseList({
  group,
  expenses,
}: {
  group: Group;
  expenses: Expense[];
}) {
  const members = new Map(group.members.map((m) => [m.id, m]));
  const baseId = useId();
  return (
    <div>
      {groupByDay(expenses).map((day) => (
        <section key={day.date} aria-labelledby={`${baseId}-${day.date}`}>
          <div className="flex items-baseline justify-between pt-4 pb-1">
            <h2
              id={`${baseId}-${day.date}`}
              className="text-[13px] font-semibold tracking-[0.04em] text-ink-2 uppercase"
            >
              {formatDay(day.date)}
            </h2>
            <Money
              amount={day.total}
              currency={group.currency}
              className="text-[12px] text-ink-3"
            />
          </div>
          <ul>
            {day.expenses.map((expense) => {
              const payer = members.get(expense.paidById);
              return (
                <li
                  key={expense.id}
                  className="border-b border-line last:border-b-0"
                >
                  <Link
                    href={`/groups/${group.id}/expenses/${expense.id}`}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <CategoryTile categoryId={expense.categoryId} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">
                        {expense.description}
                      </span>
                      <span className="mt-px block text-[13px] text-ink-3">
                        {payer ? memberLabel(payer) : "Someone"} paid{" "}
                        <Money
                          amount={expense.amount}
                          currency={group.currency}
                        />
                      </span>
                    </span>
                    <ExpenseEffect
                      effect={myEffect(expense, group.me.memberId)}
                      currency={group.currency}
                      className="text-right"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
