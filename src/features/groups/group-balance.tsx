import { Money } from "@/components/money";
import { cn } from "@/lib/utils";
import type { Group } from "./use-group";

/** "You're owed in this group ₱13,753.00", sized for the header or the rail. */
export function GroupBalance({
  group,
  size = "md",
}: {
  group: Group;
  size?: "md" | "lg";
}) {
  const balance = group.balances[group.me.memberId] ?? 0;
  if (group.expenseCount === 0) {
    return <p className="text-[14px] text-ink-2">No expenses yet.</p>;
  }
  return (
    <div>
      <p className="text-[14px] text-ink-2">
        {balance > 0
          ? "You're owed in this group"
          : balance < 0
            ? "You owe in this group"
            : "You're settled up in this group"}
      </p>
      <Money
        amount={Math.abs(balance)}
        currency={group.currency}
        className={cn(
          "mt-0.5 block amount-lg font-medium",
          size === "lg" ? "text-[30px]" : "text-[28px]",
          balance > 0 ? "text-owed" : balance < 0 ? "text-owe" : "text-ink",
        )}
      />
    </div>
  );
}
