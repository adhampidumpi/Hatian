import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody, SubPageHeader } from "@/components/shell/page-header";
import { GroupSettings } from "@/features/groups/group-settings";
import { InviteSettings } from "@/features/invites/invite-settings";
import { requireUser } from "@/server/session";
import { fetchOrNotFound, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Group settings" };

export default function GroupSettingsPage({
  params,
}: PageProps<"/groups/[groupId]/settings">) {
  return (
    <PageBody>
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings params={params} />
      </Suspense>
    </PageBody>
  );
}

async function Settings({
  params,
}: {
  params: PageProps<"/groups/[groupId]/settings">["params"];
}) {
  const { groupId } = await params;
  await requireUser();
  const group = await fetchOrNotFound(
    trpc.groups.get.queryOptions({ groupId }),
  );
  return (
    <HydrateClient>
      <SubPageHeader
        backHref={`/groups/${groupId}`}
        backLabel={`Back to ${group.name}`}
        title="Group settings"
        subtitle={group.name}
      />
      <GroupSettings
        groupId={groupId}
        invite={<InviteSettings groupId={groupId} groupName={group.name} />}
      />
    </HydrateClient>
  );
}

function SettingsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div className="h-11 w-56 animate-pulse rounded bg-line-soft" />
      <div className="h-64 animate-pulse rounded-2xl bg-line-soft" />
      <div className="h-48 animate-pulse rounded-2xl bg-line-soft" />
    </div>
  );
}
