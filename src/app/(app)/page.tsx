import { Suspense } from "react";
import { RecentActivity } from "@/features/activity/recent-activity";
import { CreateGroupDialog } from "@/features/groups/create-group-dialog";
import { GroupList, GroupListSkeleton } from "@/features/groups/group-list";
import { Money } from "@/components/money";
import { MobileHeader, PageBody } from "@/components/shell/page-header";
import { cn } from "@/lib/utils";
import { getGroupSummaries, summarise } from "@/server/services/groups";
import { requireUser } from "@/server/session";

export default function HomePage() {
  return (
    <>
      <MobileHeader />
      <PageBody>
        <h1 className="sr-only lg:not-sr-only lg:text-[34px] lg:font-bold lg:tracking-[-0.025em]">
          Home
        </h1>
        <Suspense fallback={<HomeSkeleton />}>
          <HomeContent />
        </Suspense>
      </PageBody>
    </>
  );
}

async function HomeContent() {
  const user = await requireUser();
  const groups = await getGroupSummaries(user.id);
  const { owed, owe, net, currency, approximate, leftOut } =
    await summarise(groups);
  const about = approximate ? "≈ " : "";

  return (
    <>
      <section
        aria-label="Overall balance"
        className="rounded-[20px] border border-line bg-card p-5"
      >
        <p className="text-[14px] text-ink-2">
          {net > 0
            ? "Overall, you're owed"
            : net < 0
              ? "Overall, you owe"
              : "Overall, you're settled up"}
        </p>
        <p
          className={cn(
            "mt-1.5 amount-lg text-[36px] font-medium",
            net > 0 ? "text-owed" : net < 0 ? "text-owe" : "text-ink",
          )}
        >
          {about}
          <Money amount={Math.abs(net)} currency={currency} />
        </p>
        <div className="mt-[18px] grid grid-cols-2 gap-3 border-t border-dashed border-line-strong pt-4">
          <div>
            <p className="text-[13px] text-ink-3">You&apos;re owed</p>
            <p className="mt-0.5 amount text-[17px] font-medium text-owed">
              {about}
              <Money amount={owed} currency={currency} />
            </p>
          </div>
          <div>
            <p className="text-[13px] text-ink-3">You owe</p>
            <p className="mt-0.5 amount text-[17px] font-medium text-owe">
              {about}
              <Money amount={owe} currency={currency} />
            </p>
          </div>
        </div>
        {(approximate || leftOut > 0) && (
          <p className="mt-3 text-[13px] text-ink-3">
            {leftOut > 0
              ? `Leaves out ${leftOut === 1 ? "a group" : `${leftOut} groups`} in other currencies: exchange rates are unavailable right now.`
              : `Groups in other currencies are converted to ${currency} at today's rate.`}
          </p>
        )}
      </section>

      <section aria-labelledby="groups-heading">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 id="groups-heading" className="text-[17px] font-semibold">
            Groups
          </h2>
          <CreateGroupDialog>
            <button
              type="button"
              className="min-h-11 text-[14px] font-medium underline-offset-4 hover:underline"
            >
              New group
            </button>
          </CreateGroupDialog>
        </div>
        {groups.length > 0 ? (
          <GroupList groups={groups} />
        ) : (
          <p className="rounded-2xl border border-dashed border-line-strong p-5 text-[15px] text-ink-2">
            You&apos;re not in any groups yet. Create one, or open an invite
            link from a friend.
          </p>
        )}
      </section>

      {groups.length > 0 && <RecentActivity />}
    </>
  );
}

function HomeSkeleton() {
  return (
    <>
      <div className="h-[164px] animate-pulse rounded-[20px] border border-line bg-card" />
      <GroupListSkeleton />
    </>
  );
}
