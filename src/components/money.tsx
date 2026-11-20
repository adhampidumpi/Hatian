import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money/format";

/** Any amount on screen: mono, tabular figures. */
export function Money({
  amount,
  currency,
  signed,
  className,
}: {
  amount: number;
  currency: string;
  signed?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("amount", className)}>
      {formatMoney(amount, currency, { signed })}
    </span>
  );
}

/**
 * A balance with its text label, so colour is never the only signal:
 * "you're owed ₱13,753.00" / "you owe ₱2,450.00" / "settled up".
 */
export function BalanceLabel({
  amount,
  currency,
  className,
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  if (amount === 0) {
    return (
      <span className={cn("text-[13px] text-ink-3", className)}>
        settled up
      </span>
    );
  }
  const owed = amount > 0;
  return (
    <span
      className={cn(
        "flex flex-col items-end",
        owed ? "text-owed" : "text-owe",
        className,
      )}
    >
      <span className="text-[12px]">{owed ? "you're owed" : "you owe"}</span>
      <Money
        amount={Math.abs(amount)}
        currency={currency}
        className="text-[15px] font-medium"
      />
    </span>
  );
}
