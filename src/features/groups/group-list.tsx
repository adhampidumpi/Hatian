import { formatDistanceToNowStrict } from "date-fns";
import { Check } from "lucide-react";
import Link from "next/link";
import { BalanceLabel } from "@/components/money";
import { GroupIcon } from "./group-icon";
import { groupTilePalette, settledTile } from "@/lib/palette";
import type { GroupSummary } from "@/server/services/groups";

export function GroupList({
  groups,
  hrefFor = (id) => `/groups/${id}`,
}: {
  groups: GroupSummary[];
  /** Where each row goes; the group page unless told otherwise. */
  hrefFor?: (groupId: string) => string;
}) {
  return (
    <ul className="flex flex-col">
      {groups.map((group, index) => {
        const tile = group.settled
          ? settledTile
          : groupTilePalette[index % groupTilePalette.length]!;
        return (
          <li key={group.id} className="border-b border-line last:border-b-0">
            <Link
              href={hrefFor(group.id)}
              className="flex items-center gap-3.5 py-3"
            >
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: tile.bg, color: tile.fg }}
              >
                <GroupIcon name={group.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-ink">
                  {group.name}
                </span>
                <span className="mt-0.5 block text-[13px] text-ink-3">
                  {group.memberCount}{" "}
                  {group.memberCount === 1 ? "person" : "people"} · updated{" "}
                  {formatDistanceToNowStrict(group.lastActivityAt, {
                    addSuffix: true,
                  })}
                </span>
              </span>
              {group.settled ? (
                <span className="inline-flex items-center gap-1 text-[13px] text-ink-3">
                  <Check size={16} strokeWidth={2} aria-hidden />
                  settled up
                </span>
              ) : (
                <BalanceLabel
                  amount={group.myBalance}
                  currency={group.currency}
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function GroupListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul aria-hidden className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          className="flex items-center gap-3.5 border-b border-line py-3 last:border-b-0"
        >
          <span className="size-11 animate-pulse rounded-xl bg-line-soft" />
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="h-4 w-32 animate-pulse rounded bg-line-soft" />
            <span className="h-3 w-44 animate-pulse rounded bg-line-soft" />
          </span>
        </li>
      ))}
    </ul>
  );
}
