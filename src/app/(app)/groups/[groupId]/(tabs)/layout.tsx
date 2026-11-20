import { Suspense } from "react";
import { PageBody } from "@/components/shell/page-layout";
import { DemoBar } from "@/features/demo/demo-bar";
import { GroupHeader } from "@/features/groups/group-header";
import { demoFriend } from "@/server/services/demo";
import { requireUser } from "@/server/session";
import { fetchOrNotFound, HydrateClient, trpc } from "@/trpc/server";

/** Header and tabs shared by Expenses, Balances and Activity. */
export default function GroupTabsLayout({
  children,
  params,
}: LayoutProps<"/groups/[groupId]">) {
  return (
    <PageBody wide>
      <Suspense fallback={<HeaderSkeleton />}>
        <Header params={params} />
      </Suspense>
      {children}
    </PageBody>
  );
}

async function Header({
  params,
}: {
  params: LayoutProps<"/groups/[groupId]">["params"];
}) {
  const { groupId } = await params;
  const user = await requireUser();
  await fetchOrNotFound(trpc.groups.get.queryOptions({ groupId }));
  const friend = user.demoExpiresAt ? await demoFriend(groupId, user.id) : null;
  return (
    <HydrateClient>
      <GroupHeader groupId={groupId} />
      {user.demoExpiresAt && (
        <DemoBar groupId={groupId} friendName={friend?.name ?? null} />
      )}
    </HydrateClient>
  );
}

function HeaderSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="h-8 w-56 animate-pulse rounded bg-line-soft" />
      <div className="h-36 animate-pulse rounded-[18px] bg-line-soft lg:hidden" />
      <div className="h-11 animate-pulse border-b border-line" />
    </div>
  );
}
