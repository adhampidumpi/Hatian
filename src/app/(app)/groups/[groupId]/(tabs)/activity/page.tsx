import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivityFeed, FeedSkeleton } from "@/features/activity/activity-feed";

export const metadata: Metadata = { title: "Activity" };

export default function GroupActivityPage({
  params,
}: PageProps<"/groups/[groupId]/activity">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Feed params={params} />
    </Suspense>
  );
}

async function Feed({
  params,
}: {
  params: PageProps<"/groups/[groupId]/activity">["params"];
}) {
  const { groupId } = await params;
  return <ActivityFeed groupId={groupId} />;
}
