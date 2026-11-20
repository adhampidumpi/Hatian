import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { PageBody, PageTitle } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Add expense" };

export default function AddExpensePage() {
  return (
    <PageBody>
      <PageTitle>Add expense</PageTitle>
      <ComingSoon phase={2}>
        The split editor: equally, by shares, by percent or exact amounts.
      </ComingSoon>
    </PageBody>
  );
}
