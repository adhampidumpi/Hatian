import "server-only";
import {
  dehydrate,
  HydrationBoundary,
  type FetchQueryOptions,
  type QueryKey,
} from "@tanstack/react-query";
import { TRPCError } from "@trpc/server";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { notFound } from "next/navigation";
import { cache } from "react";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { AppError } from "@/server/services/errors";
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

/**
 * Fetch a query on the server and keep it in the cache for <HydrateClient>.
 * A NOT_FOUND from the API becomes Next's 404 page.
 */
export async function fetchOrNotFound<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
>(
  queryOptions: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): Promise<TData> {
  try {
    return await getQueryClient().fetchQuery(queryOptions);
  } catch (error) {
    // Only the app's own "not found" (a missing or inaccessible record);
    // tRPC also uses NOT_FOUND for an unknown procedure, which is a bug.
    if (error instanceof TRPCError && error.cause instanceof AppError) {
      if (error.cause.code === "NOT_FOUND") notFound();
    }
    throw error;
  }
}

/** Start a query on the server without awaiting it (it streams to the client). */
export function prefetch<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
>(queryOptions: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
  void getQueryClient().prefetchQuery(queryOptions);
}
