import type { Metadata } from "next";
import { PageBody, PageTitle } from "@/components/shell/page-header";
import { ActivityFeed } from "@/features/activity/activity-feed";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <PageBody>
      <PageTitle>Activity</PageTitle>
      <ActivityFeed />
    </PageBody>
  );
}
