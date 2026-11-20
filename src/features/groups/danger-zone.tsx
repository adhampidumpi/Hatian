"use client";

import { useId } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/react";
import { useRefreshData } from "@/trpc/use-refresh";
import type { Group } from "./use-group";

/** Leave the group, or (owner) delete it. Both go back to Home. */
export function DangerZone({ group }: { group: Group }) {
  const headingId = useId();
  const trpc = useTRPC();
  const router = useRouter();
  const refresh = useRefreshData();
  const goHome = async (message: string) => {
    router.push("/");
    await refresh();
    toast.success(message);
  };

  const leave = useMutation(
    trpc.groups.leave.mutationOptions({
      onSuccess: () => goHome(`You left ${group.name}`),
      onError: (error) => toast.error(error.message),
    }),
  );
  const remove = useMutation(
    trpc.groups.delete.mutationOptions({
      onSuccess: () => goHome(`${group.name} deleted`),
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 border-t border-dashed border-line-strong pt-6"
    >
      <h2 id={headingId} className="text-[17px] font-semibold">
        Leave or delete
      </h2>
      <div className="flex flex-wrap gap-2">
        <ConfirmDialog
          trigger={
            <Button variant="outline" disabled={leave.isPending}>
              Leave group
            </Button>
          }
          title={`Leave ${group.name}?`}
          description="You can only leave when you don't owe or aren't owed anything. You can rejoin with an invite link."
          confirmLabel="Leave"
          onConfirm={() => leave.mutate({ groupId: group.id })}
        />
        {group.me.role === "OWNER" && (
          <ConfirmDialog
            trigger={
              <Button
                variant="outline"
                className="border-owe/40 text-owe hover:bg-owe/5"
                disabled={remove.isPending}
              >
                Delete group
              </Button>
            }
            title={`Delete ${group.name}?`}
            description="This deletes every expense, payment and activity in the group for everyone. It can't be undone."
            confirmLabel="Delete for everyone"
            destructive
            onConfirm={() => remove.mutate({ groupId: group.id })}
          />
        )}
      </div>
    </section>
  );
}
