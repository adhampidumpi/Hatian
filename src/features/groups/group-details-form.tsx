"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUPPORTED_CURRENCIES } from "@/lib/money/currency";
import {
  GROUP_ICONS,
  groupNameSchema,
  type GroupIconName,
} from "@/lib/validation/groups";
import { useTRPC } from "@/trpc/react";
import { useRefreshData } from "@/trpc/use-refresh";
import { IconPicker } from "./icon-picker";
import type { Group } from "./use-group";

const detailsSchema = z.object({
  name: groupNameSchema,
  icon: z.enum(GROUP_ICONS),
  currency: z.enum(SUPPORTED_CURRENCIES),
});
type Details = z.infer<typeof detailsSchema>;

/** Name, icon and currency. Currency locks once money has been logged. */
export function GroupDetailsForm({ group }: { group: Group }) {
  const trpc = useTRPC();
  const refresh = useRefreshData();
  const form = useForm<Details>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      name: group.name,
      icon: group.icon as GroupIconName,
      currency: group.currency as Details["currency"],
    },
  });
  const errors = form.formState.errors;

  const update = useMutation(
    trpc.groups.update.mutationOptions({
      onSuccess: async (_, values) => {
        form.reset({
          name: values.name ?? group.name,
          icon: (values.icon ?? group.icon) as GroupIconName,
          currency: (values.currency ?? group.currency) as Details["currency"],
        });
        await refresh();
        toast.success("Group updated");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <form
      noValidate
      aria-labelledby="details-heading"
      onSubmit={form.handleSubmit((values) =>
        update.mutate({ groupId: group.id, ...values }),
      )}
      className="flex flex-col gap-5"
    >
      <h2 id="details-heading" className="text-[17px] font-semibold">
        Details
      </h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-name">Name</Label>
        <Input
          id="settings-name"
          autoComplete="off"
          defaultValue={group.name}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "settings-name-error" : undefined}
          {...form.register("name")}
        />
        <FieldError id="settings-name-error" message={errors.name?.message} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Icon</span>
        <Controller
          control={form.control}
          name="icon"
          render={({ field }) => (
            <IconPicker value={field.value} onChange={field.onChange} />
          )}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-currency">Currency</Label>
        <select
          id="settings-currency"
          defaultValue={group.currency}
          disabled={group.hasMoney}
          aria-describedby="settings-currency-note"
          className="h-11 rounded-lg border border-input bg-card px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:bg-line-soft disabled:text-ink-3"
          {...form.register("currency")}
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <p id="settings-currency-note" className="text-[13px] text-ink-3">
          {group.hasMoney
            ? "Locked: the group already has expenses or payments."
            : "Can't be changed after the first expense."}
        </p>
      </div>
      <Button
        type="submit"
        className="self-start"
        disabled={!form.formState.isDirty || update.isPending}
      >
        {update.isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
