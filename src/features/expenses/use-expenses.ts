"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/react";

/** The group's live expenses, newest first (prefetched on the server). */
export function useExpenses(groupId: string) {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.expenses.list.queryOptions({ groupId })).data;
}

export type Expense = ReturnType<typeof useExpenses>[number];
