"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useGroup } from "@/features/groups/use-group";
import { useTRPC } from "@/trpc/react";
import { ExpenseEditor } from "./expense-editor";

export function NewExpenseScreen({ groupId }: { groupId: string }) {
  return <ExpenseEditor group={useGroup(groupId)} />;
}

export function EditExpenseScreen({
  groupId,
  expenseId,
}: {
  groupId: string;
  expenseId: string;
}) {
  const trpc = useTRPC();
  const group = useGroup(groupId);
  const { data: expense } = useSuspenseQuery(
    trpc.expenses.get.queryOptions({ groupId, expenseId }),
  );
  return <ExpenseEditor key={expense.id} group={group} expense={expense} />;
}
