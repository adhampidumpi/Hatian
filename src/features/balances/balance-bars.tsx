import { Money } from "@/components/money";
import type { Group } from "@/features/groups/use-group";
import { memberLabel } from "@/features/groups/use-group";
import { cn } from "@/lib/utils";

/**
 * "Who's up, who's down": a diverging bar per person around a centre axis,
 * owing to the left, owed to the right, each with its words and amount.
 */
export function BalanceBars({
  group,
  balances,
}: {
  group: Group;
  balances: Record<string, number>;
}) {
  const rows = group.members
    .filter((m) => !m.removed)
    .map((m) => ({ member: m, value: balances[m.id] ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));

  return (
    <section
      aria-labelledby="who-heading"
      className="rounded-[18px] border border-line bg-card p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="who-heading" className="text-[15px] font-semibold">
          Who&apos;s up, who&apos;s down
        </h2>
        <span className="text-[12px] text-ink-3">
          Total spent{" "}
          <Money amount={group.totalSpent} currency={group.currency} />
        </span>
      </div>
      <ul className="mt-2.5 flex flex-col gap-3">
        {rows.map(({ member, value }) => {
          const you = member.isMe;
          const verb =
            value > 0
              ? you
                ? "get back"
                : "gets back"
              : value < 0
                ? you
                  ? "owe"
                  : "owes"
                : "settled up";
          const width = `${(Math.abs(value) / max) * 100}%`;
          return (
            <li key={member.id}>
              <div className="flex items-baseline justify-between text-[14px]">
                <span className="font-semibold">{memberLabel(member)}</span>
                <span
                  className={cn(
                    value > 0
                      ? "text-owed"
                      : value < 0
                        ? "text-owe"
                        : "text-ink-3",
                  )}
                >
                  {verb}
                  {value !== 0 && (
                    <>
                      {" "}
                      <Money
                        amount={Math.abs(value)}
                        currency={group.currency}
                        className="font-medium"
                      />
                    </>
                  )}
                </span>
              </div>
              <div aria-hidden className="mt-1.5 grid h-2.5 grid-cols-2">
                <div className="flex justify-end border-r border-[#B9B3A6]">
                  {value < 0 && (
                    <span
                      className="block h-2.5 rounded-l-[5px] bg-owe-bar"
                      style={{ width }}
                    />
                  )}
                </div>
                <div className="flex">
                  {value > 0 && (
                    <span
                      className="block h-2.5 rounded-r-[5px] bg-owed"
                      style={{ width }}
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
