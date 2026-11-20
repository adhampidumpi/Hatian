"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useMemo, useState } from "react";
import type { LiveEvent } from "@/lib/live";
import { useTRPC } from "@/trpc/react";

type Presence = Extract<LiveEvent, { type: "presence" }>;

type LiveState = {
  /** The server is listening: changes from here on arrive live. */
  connected: boolean;
  /** Who is doing something in a group right now (never yourself). */
  presenceIn: (groupId?: string) => Presence[];
};

const LiveContext = createContext<LiveState>({
  connected: false,
  presenceIn: () => [],
});

export const useLive = () => use(LiveContext);

/**
 * One live connection for every signed-in page. "changed" events refresh
 * queries and server-rendered parts (sidebar, Home); presence events feed
 * the "Bea is adding an expense…" line.
 */
export function LiveProvider({ children }: { children: React.ReactNode }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [presence, setPresence] = useState<Record<string, Presence>>({});
  const [changes, setChanges] = useState(0);
  // A restart only means "we may have missed something" after a failure;
  // React's dev double-mount also restarts, and must not trigger a refresh.
  const [connection, setConnection] = useState({
    ready: false,
    lost: false,
    recoveries: 0,
  });

  const subscription = useSubscription(
    trpc.live.events.subscriptionOptions(undefined, {
      onError: () => setConnection((c) => ({ ...c, ready: false, lost: true })),
      onData: (event) => {
        if (event.type === "ready") {
          setConnection((c) => ({
            ready: true,
            lost: false,
            recoveries: c.lost ? c.recoveries + 1 : c.recoveries,
          }));
          return;
        }
        if (event.type === "changed") {
          setChanges((n) => n + 1);
          return;
        }
        setPresence((current) => {
          const key = `${event.groupId}:${event.memberId}`;
          const next = { ...current };
          if (event.activity === null) delete next[key];
          else next[key] = event;
          return next;
        });
      },
    }),
  );
  const connected = subscription.status === "pending" && connection.ready;

  // Refresh on each change, and once after recovering from a lost connection
  // (to catch anything missed). Bursts (an expense plus its activity row)
  // become one refresh.
  const refreshKey = changes + connection.recoveries;
  useEffect(() => {
    if (refreshKey === 0) return;
    const timer = setTimeout(() => {
      void queryClient.invalidateQueries();
      router.refresh();
    }, 250);
    return () => clearTimeout(timer);
  }, [refreshKey, queryClient, router]);

  // Forget presence that stopped being renewed (closed tab, lost signal).
  useEffect(() => {
    const timer = setInterval(() => {
      setPresence((current) => {
        const now = Date.now();
        const alive = Object.entries(current).filter(([, p]) => p.until > now);
        return alive.length === Object.keys(current).length
          ? current
          : Object.fromEntries(alive);
      });
    }, 2_000);
    return () => clearInterval(timer);
  }, []);

  const value = useMemo<LiveState>(
    () => ({
      connected,
      presenceIn: (groupId) =>
        Object.values(presence).filter(
          (p) => groupId === undefined || p.groupId === groupId,
        ),
    }),
    [connected, presence],
  );

  return <LiveContext value={value}>{children}</LiveContext>;
}
