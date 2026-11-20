"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/trpc/react";
import { useRefreshData } from "@/trpc/use-refresh";

/**
 * The group's "Simplify debts" setting. Anyone in the group can change it;
 * it only changes who pays whom, never what anyone owes overall.
 */
export function SimplifySwitch({
  groupId,
  checked,
  id = "simplify-debts",
  label = "Simplify",
}: {
  groupId: string;
  checked: boolean;
  id?: string;
  label?: string;
}) {
  const trpc = useTRPC();
  const refresh = useRefreshData();
  const update = useMutation(
    trpc.groups.update.mutationOptions({
      onSuccess: refresh,
      onError: (error) => toast.error(error.message),
    }),
  );
  const value = update.isPending
    ? (update.variables?.simplifyDebts ?? checked)
    : checked;

  return (
    <label htmlFor={id} className="flex min-h-11 items-center gap-3">
      <span className="text-[14px] font-semibold">{label}</span>
      <Switch
        id={id}
        checked={value}
        disabled={update.isPending}
        onCheckedChange={(simplifyDebts) =>
          update.mutate({ groupId, simplifyDebts })
        }
      />
    </label>
  );
}
