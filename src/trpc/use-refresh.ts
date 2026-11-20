"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * After a change, refresh everything that might show it: client queries
 * (group, expenses, balances, activity) and server-rendered parts like the
 * sidebar balances and Home. One money change touches most views, so this
 * deliberately refreshes broadly rather than guessing which keys changed.
 */
export function useRefreshData() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    await queryClient.invalidateQueries();
    router.refresh();
  }, [queryClient, router]);
}
