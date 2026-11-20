import Link from "next/link";
import { Suspense } from "react";
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
  const { owed, owe, net, currency } = summarise(groups);

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
        <Money
          amount={Math.abs(net)}
          currency={currency}
          className={cn(
            "mt-1.5 block amount-lg text-[36px] font-medium",
            net > 0 ? "text-owed" : net < 0 ? "text-owe" : "text-ink",
          )}
        />
        <div className="mt-[18px] grid grid-cols-2 gap-3 border-t border-dashed border-line-strong pt-4">
          <div>
            <p className="text-[13px] text-ink-3">You&apos;re owed</p>
            <Money
              amount={owed}
              currency={currency}
              className="mt-0.5 block text-[17px] font-medium text-owed"
            />
          </div>
          <div>
            <p className="text-[13px] text-ink-3">You owe</p>
            <Money
              amount={owe}
              currency={currency}
              className="mt-0.5 block text-[17px] font-medium text-owe"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="groups-heading">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 id="groups-heading" className="text-[17px] font-semibold">
            Groups
          </h2>
          <Link href="/groups" className="py-3 text-[14px] font-medium">
            New group
          </Link>
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
