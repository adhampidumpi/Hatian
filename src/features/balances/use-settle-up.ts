"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/react";

/** Balances plus simplified and one-per-pair suggestions. */
export function useSettleUp(groupId: string) {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.groups.settleUp.queryOptions({ groupId })).data;
}

export type SettleUp = ReturnType<typeof useSettleUp>;
export type Transfer = SettleUp["simplified"][number];
