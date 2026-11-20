"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/react";
import { inviteUrl, shareOrCopy } from "./share";

/** Share (or copy) the group's invite link, creating it on first use. */
export function useShareInvite(groupId: string, groupName: string) {
  const trpc = useTRPC();
  const ensure = useMutation(
    trpc.invites.ensure.mutationOptions({
      onError: (error) => toast.error(error.message),
    }),
  );
  return {
    share: async () => {
      const { token } = await ensure.mutateAsync({ groupId });
      await shareOrCopy({
        text: `Join ${groupName} on Hatian to split expenses:`,
        url: inviteUrl(token),
        copiedMessage: "Invite link copied",
      });
    },
    isPending: ensure.isPending,
  };
}
