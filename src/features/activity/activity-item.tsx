"use client";

import { format, formatDistanceToNowStrict, isToday } from "date-fns";
import { Money } from "@/components/money";
import { MemberAvatar } from "@/features/groups/member-avatar";
import { cn } from "@/lib/utils";
import { describeActivity } from "./describe";
import type { ActivityEntry, ActivityFeedData } from "./use-activity";

/** One entry: avatar, "Ana added “Surf lessons” ₱12,500.00", effect, meta. */
export function ActivityItem({
  entry,
  data,
  showGroup,
  compact = false,
}: {
  entry: ActivityEntry;
  data: Pick<ActivityFeedData, "members" | "myMemberIds" | "groups">;
  /** Name the group in the meta line (feeds that span groups). */
  showGroup: boolean;
  compact?: boolean;
}) {
  const group = data.groups[entry.groupId];
  const currency = group?.currency ?? "PHP";
  const d = describeActivity(entry.change, entry.actor.memberId, {
    members: data.members,
    myMemberId: data.myMemberIds[entry.groupId],
    currency,
  });
  const when = isToday(entry.createdAt)
    ? formatDistanceToNowStrict(entry.createdAt, { addSuffix: true })
    : format(entry.createdAt, "h:mm a");
  const actor = entry.actor.isMe ? "You" : entry.actor.name;

  if (compact) {
    return (
      <li className="border-b border-line-soft py-2 text-[13px] leading-snug last:border-b-0">
        <strong className="font-semibold">{actor}</strong> {d.text}
        <span className="text-ink-3"> · {when}</span>
      </li>
    );
  }

  return (
    <li className="flex gap-3 border-b border-line-soft py-3 last:border-b-0">
      <MemberAvatar
        member={{ name: entry.actor.name, colorIndex: entry.actor.colorIndex }}
      />
      <div className="min-w-0 flex-1 text-[14px] leading-snug">
        <p>
          <strong className="font-semibold">{actor}</strong> {d.text}
          {d.amount !== undefined && (
            <>
              {" "}
              <Money
                amount={d.amount}
                currency={currency}
                className="text-ink-2"
              />
            </>
          )}
        </p>
        {d.effect && d.effect.kind !== "none" && (
          <p
            className={cn(
              "mt-0.5",
              d.effect.kind === "lent" ? "text-owed" : "text-owe",
            )}
          >
            {d.effect.kind === "lent" ? "You lent" : "You borrowed"}{" "}
            <Money amount={d.effect.amount} currency={currency} />
          </p>
        )}
        {d.details && (
          <p className="mt-0.5 text-[13px] text-ink-2">{d.details}</p>
        )}
        <p className="mt-0.5 text-[12px] text-ink-3">
          {showGroup && group ? `${group.name} · ` : ""}
          {when}
        </p>
      </div>
    </li>
  );
}
