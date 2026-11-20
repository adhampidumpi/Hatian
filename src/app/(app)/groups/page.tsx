import type { Metadata } from "next";
import { Suspense } from "react";
import { ComingSoon } from "@/components/coming-soon";
import { GroupList, GroupListSkeleton } from "@/components/group-list";
import { PageBody, PageTitle } from "@/components/shell/page-header";
import { getGroupSummaries } from "@/server/queries/groups";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Groups" };

export default function GroupsPage() {
  return (
    <PageBody>
      <PageTitle>Groups</PageTitle>
      <Suspense fallback={<GroupListSkeleton rows={4} />}>
        <Groups />
      </Suspense>
      <ComingSoon phase={2}>Creating groups and invite links.</ComingSoon>
    </PageBody>
  );
}

async function Groups() {
  const user = await requireUser();
  const groups = await getGroupSummaries(user.id);
  return <GroupList groups={groups} />;
}
