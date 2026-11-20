import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageBody, PageTitle } from "@/components/shell/page-layout";
import { Button } from "@/components/ui/button";
import { CreateGroupDialog } from "@/features/groups/create-group-dialog";
import { GroupList, GroupListSkeleton } from "@/features/groups/group-list";
import { getGroupSummaries } from "@/server/services/groups";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Add expense" };

/** The global "+": pick the group (or go straight there if there's one). */
export default function AddExpensePage() {
  return (
    <PageBody>
      <PageTitle>Add expense</PageTitle>
      <Suspense fallback={<GroupListSkeleton />}>
        <ChooseGroup />
      </Suspense>
    </PageBody>
  );
}

async function ChooseGroup() {
  const user = await requireUser();
  const groups = await getGroupSummaries(user.id);
  if (groups.length === 1) redirect(`/groups/${groups[0]!.id}/expenses/new`);
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line-strong p-6">
        <p className="text-[15px] text-ink-2">
          Expenses live in a group. Start one for your trip, home or team.
        </p>
        <CreateGroupDialog>
          <Button>New group</Button>
        </CreateGroupDialog>
      </div>
    );
  }
  return (
    <section aria-labelledby="choose-group" className="flex flex-col gap-1">
      <h2 id="choose-group" className="text-[15px] text-ink-2">
        Which group is it for?
      </h2>
      <GroupList
        groups={groups}
        hrefFor={(id) => `/groups/${id}/expenses/new`}
      />
    </section>
  );
}
