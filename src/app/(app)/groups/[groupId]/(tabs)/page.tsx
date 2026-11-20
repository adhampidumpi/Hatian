import { Suspense } from "react";
import { RailSettleUp } from "@/features/balances/rail-settle-up";
import { GroupExpenses } from "@/features/expenses/group-expenses";
import { requireUser } from "@/server/session";
import { fetchOrNotFound, HydrateClient, prefetch, trpc } from "@/trpc/server";

export default function GroupExpensesPage({
  params,
}: PageProps<"/groups/[groupId]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Expenses params={params} />
    </Suspense>
  );
}

async function Expenses({
  params,
}: {
  params: PageProps<"/groups/[groupId]">["params"];
}) {
  const { groupId } = await params;
  await requireUser();
  prefetch(trpc.expenses.list.queryOptions({ groupId }));
  prefetch(trpc.groups.settleUp.queryOptions({ groupId }));
  await fetchOrNotFound(trpc.groups.get.queryOptions({ groupId }));
  return (
    <HydrateClient>
      <GroupExpenses
        groupId={groupId}
        railExtras={<RailSettleUp groupId={groupId} />}
      />
    </HydrateClient>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-line-soft" />
      ))}
    </div>
  );
}
