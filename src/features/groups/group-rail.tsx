import { Money } from "@/components/money";
import { sum } from "@/lib/money/split";
import { GroupBalance } from "./group-balance";
import type { Group } from "./use-group";

/** Desktop side rail: your balance and share, then extra sections. */
export function GroupRail({
  group,
  myShare,
  children,
}: {
  group: Group;
  /** Sum of the signed-in member's shares across live expenses. */
  myShare: number;
  children?: React.ReactNode;
}) {
  return (
    <aside
      aria-label="Balances and activity"
      className="flex min-w-0 flex-col gap-4"
    >
      <section className="rounded-2xl border border-line bg-card p-[18px]">
        <GroupBalance group={group} size="lg" />
        {group.expenseCount > 0 && (
          <p className="mt-1.5 text-[13px] text-ink-3">
            Your share of the spending:{" "}
            <Money amount={myShare} currency={group.currency} />
          </p>
        )}
      </section>
      {children}
    </aside>
  );
}

export function myShareOf(
  expenses: { shares: { memberId: string; amount: number }[] }[],
  memberId: string,
) {
  return sum(
    expenses.flatMap((e) =>
      e.shares.filter((s) => s.memberId === memberId).map((s) => s.amount),
    ),
  );
}
