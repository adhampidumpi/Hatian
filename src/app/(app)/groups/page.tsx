import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateGroupDialog } from "@/features/groups/create-group-dialog";
import { GroupList, GroupListSkeleton } from "@/features/groups/group-list";
import { PageBody, PageTitle } from "@/components/shell/page-header";
import { getGroupSummaries } from "@/server/services/groups";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Groups" };

export default function GroupsPage() {
  return (
    <PageBody>
      <div className="flex items-center justify-between gap-4">
        <PageTitle>Groups</PageTitle>
        <CreateGroupDialog>
          <Button>
            <Plus size={18} aria-hidden /> New group
          </Button>
        </CreateGroupDialog>
      </div>
      <Suspense fallback={<GroupListSkeleton rows={4} />}>
        <Groups />
      </Suspense>
    </PageBody>
  );
}

async function Groups() {
  const user = await requireUser();
  const groups = await getGroupSummaries(user.id);
  return <GroupList groups={groups} />;
}
