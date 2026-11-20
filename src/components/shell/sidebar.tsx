import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { CreateGroupDialog } from "@/features/groups/create-group-dialog";
import { formatCompact, formatMoney } from "@/lib/money/format";
import { cn } from "@/lib/utils";
import { getGroupSummaries } from "@/server/services/groups";
import { requireUser } from "@/server/session";
import { AddExpenseShortcut } from "./add-expense-shortcut";
import { AddExpenseLink, SidebarGroupLink, SidebarNav } from "./sidebar-nav";

/** Navigation at `lg`+: Add expense (N), nav, and groups with balances. */
export function Sidebar() {
  return (
    <aside
      aria-label="Sidebar"
      className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-5 overflow-y-auto border-r border-line px-4 py-6 lg:flex"
    >
      <Link href="/" className="px-2" aria-label="Hatian home">
        <Logo />
      </Link>

      <AddExpenseLink />
      <AddExpenseShortcut />

      <SidebarNav />

      <section aria-labelledby="sidebar-groups">
        <div className="flex items-center justify-between px-2.5 pb-1.5">
          <h2
            id="sidebar-groups"
            className="text-[12px] font-semibold tracking-[0.05em] text-ink-2 uppercase"
          >
            Groups
          </h2>
          {/* 44px target; negative margin keeps the header row compact. */}
          <CreateGroupDialog>
            <button
              type="button"
              aria-label="New group"
              className="-my-1.5 -mr-1.5 flex size-11 items-center justify-center rounded-lg text-ink-2 hover:bg-line-soft"
            >
              <Plus size={18} strokeWidth={2} aria-hidden />
            </button>
          </CreateGroupDialog>
        </div>
        <Suspense fallback={<GroupListSkeleton />}>
          <SidebarGroups />
        </Suspense>
      </section>
    </aside>
  );
}

async function SidebarGroups() {
  const user = await requireUser();
  const groups = await getGroupSummaries(user.id);
  if (groups.length === 0) {
    return <p className="px-2.5 text-[13px] text-ink-3">No groups yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {groups.map((group) => (
        <li key={group.id}>
          <SidebarGroupLink href={`/groups/${group.id}`}>
            <span
              className={cn(
                "truncate text-[15px] font-medium",
                group.settled || group.myBalance === 0
                  ? "text-ink-2"
                  : "text-ink",
              )}
            >
              {group.name}
            </span>
            <CompactBalance
              amount={group.myBalance}
              currency={group.currency}
            />
          </SidebarGroupLink>
        </li>
      ))}
    </ul>
  );
}

/** "+13,753" / "−2,450" with a screen-reader label; "settled" at zero. */
function CompactBalance({
  amount,
  currency,
}: {
  amount: number;
  currency: string;
}) {
  if (amount === 0) {
    return <span className="text-[12px] text-ink-3">settled</span>;
  }
  const owed = amount > 0;
  return (
    <span className={cn("amount text-[13px]", owed ? "text-owed" : "text-owe")}>
      <span aria-hidden>{formatCompact(amount, currency)}</span>
      {/* Exact amount for screen readers; the visible one is rounded. */}
      <span className="sr-only">
        {owed ? "you're owed " : "you owe "}
        {formatMoney(Math.abs(amount), currency)}
      </span>
    </span>
  );
}

function GroupListSkeleton() {
  return (
    <ul className="flex flex-col gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex h-11 items-center px-2.5">
          <span className="h-3.5 w-28 animate-pulse rounded bg-line-soft" />
        </li>
      ))}
    </ul>
  );
}
