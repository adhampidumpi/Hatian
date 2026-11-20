import "server-only";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  createTRPCOptionsProxy,
  type TRPCQueryOptions,
} from "@trpc/tanstack-react-query";
import { cache } from "react";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { makeQueryClient } from "./query-client";

/** One QueryClient per request, shared by every server component in it. */
export const getQueryClient = cache(makeQueryClient);

/**
 * Server-side tRPC: `prefetch(trpc.groups.get.queryOptions({ groupId }))` in
 * a server component starts the query, and <HydrateClient> hands the result
 * (or the still-pending promise) to client components using `useTRPC()`.
 * Reads the session, so use it inside a <Suspense> boundary.
 */
export const trpc = createTRPCOptionsProxy({
  ctx: createTRPCContext,
  router: appRouter,
  queryClient: getQueryClient,
});

export function HydrateClient({ children }: { children: React.ReactNode }) {
  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      {children}
    </HydrationBoundary>
  );
}

/** Start a query on the server without awaiting it (it streams to the client). */
export function prefetch<T extends ReturnType<TRPCQueryOptions<AnyQueryDef>>>(
  queryOptions: T,
) {
  void getQueryClient().prefetchQuery(queryOptions);
}

// The resolver shape TRPCQueryOptions expects, for any procedure.
type AnyQueryDef = {
  input: unknown;
  output: unknown;
  transformer: boolean;
  errorShape: unknown;
  featureFlags: { keyPrefix: false };
};
