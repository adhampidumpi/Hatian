import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ComingSoon } from "@/components/coming-soon";
import { BalanceLabel } from "@/components/money";
import { PageBody, PageTitle } from "@/components/shell/page-header";
import { getGroupSummaries } from "@/server/services/groups";
import { requireUser } from "@/server/session";

export default function GroupPage({ params }: PageProps<"/groups/[groupId]">) {
  return (
    <PageBody>
      <Suspense
        fallback={
          <div className="h-10 w-48 animate-pulse rounded bg-line-soft" />
        }
      >
        <GroupHeader params={params} />
      </Suspense>
      <ComingSoon phase={2}>
        Expenses, balances and settle-up for this group.
      </ComingSoon>
    </PageBody>
  );
}

async function GroupHeader({
  params,
}: {
  params: PageProps<"/groups/[groupId]">["params"];
}) {
  const { groupId } = await params;
  const user = await requireUser();
  // Only groups the user belongs to are returned, so this also authorises.
  const group = (await getGroupSummaries(user.id)).find(
    (g) => g.id === groupId,
  );
  if (!group) notFound();
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <PageTitle>{group.name}</PageTitle>
        <p className="mt-1 text-[15px] text-ink-3">
          {group.memberCount} people · {group.currency}
        </p>
      </div>
      <BalanceLabel amount={group.myBalance} currency={group.currency} />
    </div>
  );
}
