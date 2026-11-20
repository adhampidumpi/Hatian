import { Money } from "@/components/money";
import type { MyEffect } from "@/lib/expenses";
import { cn } from "@/lib/utils";

/** "you borrowed ₱2,500.00" / "you lent ₱3,888.00" / "not involved". */
export function ExpenseEffect({
  effect,
  currency,
  className,
}: {
  effect: MyEffect;
  currency: string;
  className?: string;
}) {
  if (effect.kind === "none") {
    return (
      <span className={cn("text-[12px] text-ink-3", className)}>
        not involved
      </span>
    );
  }
  const lent = effect.kind === "lent";
  return (
    <span
      className={cn(
        "flex flex-col items-end",
        lent ? "text-owed" : "text-owe",
        className,
      )}
    >
      <span className="text-[12px]">{lent ? "you lent" : "you borrowed"}</span>
      <Money
        amount={effect.amount}
        currency={currency}
        className="text-[14px] font-medium"
      />
    </span>
  );
}
