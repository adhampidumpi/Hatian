"use client";

import { useEffect } from "react";
import { PRESENCE_HEARTBEAT_MS } from "@/lib/live";
import { useTRPCClient } from "@/trpc/react";

/**
 * Tell the group what you're doing while this component is on screen:
 * renewed every few seconds, cleared when you leave. Best effort: a missed
 * message just means the line appears a little late or fades on its own.
 */
export function useBroadcastPresence(
  groupId: string,
  activity: "adding-expense" | "editing-expense",
) {
  const client = useTRPCClient();
  useEffect(() => {
    const send = (value: typeof activity | null) =>
      client.live.presence.mutate({ groupId, activity: value }).catch(() => {});
    void send(activity);
    const timer = setInterval(() => void send(activity), PRESENCE_HEARTBEAT_MS);
    return () => {
      clearInterval(timer);
      void send(null);
    };
  }, [client, groupId, activity]);
}
