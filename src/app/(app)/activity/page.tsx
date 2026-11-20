import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { PageBody, PageTitle } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <PageBody>
      <PageTitle>Activity</PageTitle>
      <ComingSoon phase={2}>
        Every expense, payment and edit across your groups, with live updates in
        phase 3.
      </ComingSoon>
    </PageBody>
  );
}
