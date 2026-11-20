"use client";

import { useId } from "react";
import Link from "next/link";
import { ActivityItem } from "./activity-item";
import { FeedSkeleton } from "./activity-feed";
import { useActivity } from "./use-activity";

/** The latest few entries, for Home and the desktop rail. */
export function RecentActivity({
  groupId,
  limit = 3,
  compact = false,
  title = "Latest activity",
}: {
  groupId?: string;
  limit?: number;
  compact?: boolean;
  title?: string;
}) {
  const headingId = useId();
  const feed = useActivity({ groupId, limit });
  const seeAll = groupId ? `/groups/${groupId}/activity` : "/activity";

  return (
    <section
      aria-labelledby={headingId}
      className={
        compact ? "rounded-[18px] border border-line bg-card p-[18px]" : ""
      }
    >
      <div className="flex items-baseline justify-between">
        <h2
          id={headingId}
          className={
            compact ? "text-[15px] font-semibold" : "text-[17px] font-semibold"
          }
        >
          {title}
        </h2>
        <Link
          href={seeAll}
          className="py-2 text-[14px] font-medium hover:underline"
        >
          See all
        </Link>
      </div>
      {feed.isLoading ? (
        <FeedSkeleton rows={2} />
      ) : feed.items.length === 0 ? (
        <p className="text-[14px] text-ink-3">Nothing yet.</p>
      ) : (
        <ol
          className={
            compact
              ? "mt-1"
              : "mt-1 rounded-2xl border border-line bg-card px-3.5"
          }
        >
          {feed.items.slice(0, limit).map((entry) => (
            <ActivityItem
              key={entry.id}
              entry={entry}
              data={feed}
              showGroup={!groupId}
              compact={compact}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
