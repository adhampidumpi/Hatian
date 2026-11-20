import type { Metadata } from "next";
import { Suspense } from "react";
import { GroupBalances } from "@/features/balances/group-balances";
import { requireUser } from "@/server/session";
import { fetchOrNotFound, HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Balances" };

export default function GroupBalancesPage({
  params,
}: PageProps<"/groups/[groupId]/balances">) {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden
          className="h-72 max-w-2xl animate-pulse rounded-[18px] bg-line-soft"
        />
      }
    >
      <Balances params={params} />
    </Suspense>
  );
}

async function Balances({
  params,
}: {
  params: PageProps<"/groups/[groupId]/balances">["params"];
}) {
  const { groupId } = await params;
  await requireUser();
  prefetch(trpc.groups.settleUp.queryOptions({ groupId }));
  await fetchOrNotFound(trpc.groups.get.queryOptions({ groupId }));
  return (
    <HydrateClient>
      <GroupBalances groupId={groupId} />
    </HydrateClient>
  );
}
