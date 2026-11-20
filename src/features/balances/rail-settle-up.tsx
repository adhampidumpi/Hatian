"use client";

import { useGroup } from "@/features/groups/use-group";
import { SuggestedPayments } from "./suggested-payments";
import { useSettleUp } from "./use-settle-up";

/** Suggested payments in the desktop side rail. */
export function RailSettleUp({ groupId }: { groupId: string }) {
  const group = useGroup(groupId);
  const settleUp = useSettleUp(groupId);
  if (group.expenseCount === 0) return null;
  return <SuggestedPayments group={group} settleUp={settleUp} compact />;
}
