"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/react";

/** The group as the signed-in member sees it (prefetched on the server). */
export function useGroup(groupId: string) {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.groups.get.queryOptions({ groupId })).data;
}

export type Group = ReturnType<typeof useGroup>;
export type Member = Group["members"][number];

/** "You" for the signed-in member, otherwise their name. */
export function memberLabel(member: { name: string; isMe: boolean }) {
  return member.isMe ? "You" : member.name;
}
