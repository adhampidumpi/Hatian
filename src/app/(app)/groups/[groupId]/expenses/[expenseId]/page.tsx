import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorSkeleton } from "@/features/expenses/editor-skeleton";
import { EditExpenseScreen } from "@/features/expenses/expense-screens";
import { requireUser } from "@/server/session";
import { fetchOrNotFound, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Edit expense" };

export default function EditExpensePage({
  params,
}: PageProps<"/groups/[groupId]/expenses/[expenseId]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Screen params={params} />
    </Suspense>
  );
}

async function Screen({
  params,
}: {
  params: PageProps<"/groups/[groupId]/expenses/[expenseId]">["params"];
}) {
  const { groupId, expenseId } = await params;
  await requireUser();
  await Promise.all([
    fetchOrNotFound(trpc.groups.get.queryOptions({ groupId })),
    fetchOrNotFound(trpc.expenses.get.queryOptions({ groupId, expenseId })),
  ]);
  return (
    <HydrateClient>
      <EditExpenseScreen groupId={groupId} expenseId={expenseId} />
    </HydrateClient>
  );
}
