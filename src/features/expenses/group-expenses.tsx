"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { GroupRail, myShareOf } from "@/features/groups/group-rail";
import { useGroup } from "@/features/groups/use-group";
import { ExpenseList } from "./expense-list";
import { ExpenseTable } from "./expense-table";
import { useExpenses } from "./use-expenses";

/** The Expenses tab: day list on phones; table plus side rail on desktop. */
export function GroupExpenses({
  groupId,
  railExtras,
}: {
  groupId: string;
  railExtras?: React.ReactNode;
}) {
  const group = useGroup(groupId);
  const expenses = useExpenses(groupId);

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line-strong p-6">
        <p className="text-[15px] font-semibold">No expenses yet</p>
        <p className="text-[14px] text-ink-2">
          Add the first one: who paid, how much, and who it was for.
        </p>
        <Link
          href={`/groups/${group.id}/expenses/new`}
          className={buttonVariants()}
        >
          <Plus size={18} aria-hidden /> Add expense
        </Link>
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-7">
      <div className="lg:hidden">
        <ExpenseList group={group} expenses={expenses} />
      </div>
      <div className="hidden lg:block">
        <ExpenseTable group={group} expenses={expenses} />
      </div>
      <div className="hidden lg:block">
        <GroupRail
          group={group}
          myShare={myShareOf(expenses, group.me.memberId)}
        >
          {railExtras}
        </GroupRail>
      </div>
    </div>
  );
}
