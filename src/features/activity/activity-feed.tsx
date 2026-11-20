"use client";

import { isToday, isYesterday } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDay, todayIso } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_FILTERS,
  activityFilterLabels,
  type ActivityFilter,
} from "@/lib/validation/activity";
import { ActivityItem } from "./activity-item";
import { useActivity, type ActivityEntry } from "./use-activity";

/** Full feed with filters, grouped into Today / Yesterday / dates. */
export function ActivityFeed({ groupId }: { groupId?: string }) {
  const [filter, setFilter] = useState<ActivityFilter>("ALL");
  const feed = useActivity({ groupId, filter });

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div
        role="group"
        aria-label="Filter activity"
        className="flex flex-wrap gap-2"
      >
        {ACTIVITY_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={f === filter}
            onClick={() => setFilter(f)}
            className={cn(
              "h-9 rounded-full border px-3.5 text-[14px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink pointer-coarse:h-11",
              f === filter
                ? "border-ink bg-ink text-paper"
                : "border-line-strong bg-card text-ink",
            )}
          >
            {activityFilterLabels[f]}
          </button>
        ))}
      </div>

      {feed.isLoading ? (
        <FeedSkeleton />
      ) : feed.isError ? (
        <p className="text-[15px] text-owe">Couldn&apos;t load activity.</p>
      ) : feed.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong p-6 text-[15px] text-ink-2">
          {filter === "ALL"
            ? "Nothing here yet. Expenses, payments and edits show up as they happen."
            : `No ${activityFilterLabels[filter].toLowerCase()} yet.`}
        </p>
      ) : (
        <>
          {byDay(feed.items).map((day) => (
            <section key={day.key} aria-labelledby={`activity-${day.key}`}>
              <h2
                id={`activity-${day.key}`}
                className="text-[13px] font-semibold tracking-[0.04em] text-ink-2 uppercase"
              >
                {day.label}
              </h2>
              <ol className="mt-1">
                {day.items.map((entry) => (
                  <ActivityItem
                    key={entry.id}
                    entry={entry}
                    data={feed}
                    showGroup={!groupId}
                  />
                ))}
              </ol>
            </section>
          ))}
          {feed.hasMore && (
            <Button
              variant="outline"
              className="self-start"
              onClick={feed.loadMore}
              disabled={feed.loadingMore}
            >
              {feed.loadingMore ? "Loading…" : "Load more"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function byDay(items: ActivityEntry[]) {
  const days: { key: string; label: string; items: ActivityEntry[] }[] = [];
  for (const item of items) {
    const key = todayIso(item.createdAt);
    const last = days.at(-1);
    if (last?.key === key) {
      last.items.push(item);
      continue;
    }
    const label = isToday(item.createdAt)
      ? "Today"
      : isYesterday(item.createdAt)
        ? "Yesterday"
        : formatDay(key);
    days.push({ key, label, items: [item] });
  }
  return days;
}

export function FeedSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3">
          <span className="size-8 animate-pulse rounded-full bg-line-soft" />
          <span className="h-10 flex-1 animate-pulse rounded bg-line-soft" />
        </div>
      ))}
    </div>
  );
}
