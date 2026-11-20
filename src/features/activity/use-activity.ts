"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import type { ActivityFilter } from "@/lib/validation/activity";
import { useTRPC } from "@/trpc/react";

/**
 * Activity pages merged into one list. Fetched in the browser: entries show
 * relative times ("2h ago"), which depend on the viewer's clock.
 */
export function useActivity({
  groupId,
  filter = "ALL",
  limit = 30,
}: {
  groupId?: string;
  filter?: ActivityFilter;
  limit?: number;
}) {
  const trpc = useTRPC();
  const query = useInfiniteQuery({
    ...trpc.activity.list.infiniteQueryOptions(
      { groupId, filter, limit },
      { getNextPageParam: (page) => page.nextCursor },
    ),
    placeholderData: keepPreviousData,
  });

  const pages = query.data?.pages ?? [];
  return {
    items: pages.flatMap((p) => p.items),
    members: Object.assign(
      {},
      ...pages.map((p) => p.members),
    ) as (typeof pages)[number]["members"],
    myMemberIds: Object.assign(
      {},
      ...pages.map((p) => p.myMemberIds),
    ) as Record<string, string>,
    groups: Object.assign(
      {},
      ...pages.map((p) => p.groups),
    ) as (typeof pages)[number]["groups"],
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => void query.refetch(),
    hasMore: query.hasNextPage,
    loadMore: () => void query.fetchNextPage(),
    loadingMore: query.isFetchingNextPage,
  };
}

export type ActivityFeedData = ReturnType<typeof useActivity>;
export type ActivityEntry = ActivityFeedData["items"][number];
