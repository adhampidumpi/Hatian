import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorSkeleton } from "@/features/expenses/editor-skeleton";
import { NewExpenseScreen } from "@/features/expenses/expense-screens";
import { requireUser } from "@/server/session";
import { fetchOrNotFound, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Add expense" };

export default function NewExpensePage({
  params,
}: PageProps<"/groups/[groupId]/expenses/new">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Screen params={params} />
    </Suspense>
  );
}

async function Screen({
  params,
}: {
  params: PageProps<"/groups/[groupId]/expenses/new">["params"];
}) {
  const { groupId } = await params;
  await requireUser();
  await fetchOrNotFound(trpc.groups.get.queryOptions({ groupId }));
  return (
    <HydrateClient>
      <NewExpenseScreen groupId={groupId} />
    </HydrateClient>
  );
}
