"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/react";
import { useRefreshData } from "@/trpc/use-refresh";

/**
 * Shown to demo accounts on group pages: the demo is private and
 * temporary, and a friend can add an expense so live updates can be seen
 * in one window ("Bea is adding an expense…", then the expense).
 */
export function DemoBar({
  groupId,
  friendName,
}: {
  groupId: string;
  friendName: string | null;
}) {
  const trpc = useTRPC();
  const refresh = useRefreshData();
  const watch = useMutation(
    trpc.demo.friendAddsExpense.mutationOptions({
      // The live connection shows it; refresh too in case it's down.
      onSuccess: () => void refresh(),
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-line-soft px-3.5 py-2.5 text-[13px] text-ink-2">
      <p>
        Your private demo: only you see it, and it&apos;s deleted after a day.
      </p>
      {friendName && (
        <Button
          size="sm"
          variant="outline"
          disabled={watch.isPending}
          onClick={() => watch.mutate({ groupId })}
        >
          Watch {friendName} add an expense
        </Button>
      )}
    </div>
  );
}
