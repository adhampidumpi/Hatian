"use client";

import { useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/react";
import { useShareInvite } from "./use-share-invite";

/** Settings section: share the invite link, or cancel it and make a new one. */
export function InviteSettings({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const headingId = useId();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const current = useQuery(trpc.invites.current.queryOptions({ groupId }));
  const { share, isPending } = useShareInvite(groupId, groupName);
  const reset = useMutation(
    trpc.invites.reset.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.invites.current.queryKey({ groupId }),
        });
        toast.success("Old link cancelled. Share the new one.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-[17px] font-semibold">
        Invite link
      </h2>
      <p className="text-[14px] text-ink-2">
        Anyone with the link can join {groupName}. Friends you added by name
        pick themselves from the list to keep their expenses.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => void share()}
          disabled={isPending}
        >
          <Share2 size={16} aria-hidden /> Share invite link
        </Button>
        {current.data && (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" disabled={reset.isPending}>
                <Link2 size={16} aria-hidden /> Make a new link
              </Button>
            }
            title="Cancel the current link?"
            description="People who already joined stay in the group, but the old link stops working. You'll get a new one to share."
            confirmLabel="Cancel old link"
            onConfirm={() => reset.mutate({ groupId })}
          />
        )}
      </div>
    </section>
  );
}
