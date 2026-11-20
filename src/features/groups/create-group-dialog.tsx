"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FieldError } from "@/components/field-error";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUPPORTED_CURRENCIES } from "@/lib/money/currency";
import {
  createGroupSchema,
  memberNameSchema,
  type CreateGroupInput,
} from "@/lib/validation/groups";
import { useTRPC } from "@/trpc/react";
import { useRefreshData } from "@/trpc/use-refresh";
import { IconPicker } from "./icon-picker";

/**
 * "New group": name, icon, currency and friends to add by name. Wraps any
 * trigger element (a button or a link-styled button) passed as children.
 */
export function CreateGroupDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>{children}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="max-h-[92dvh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>New group</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Add friends by name now. They can join later with the invite link.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {open && <CreateGroupForm onDone={() => setOpen(false)} />}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function CreateGroupForm({ onDone }: { onDone: () => void }) {
  const trpc = useTRPC();
  const router = useRouter();
  const refresh = useRefreshData();
  const [friend, setFriend] = useState("");
  const [friendError, setFriendError] = useState<string>();

  const form = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      icon: "users",
      currency: "PHP",
      memberNames: [],
    },
  });
  const names = useWatch({ control: form.control, name: "memberNames" });
  const errors = form.formState.errors;

  const create = useMutation(
    trpc.groups.create.mutationOptions({
      onSuccess: async ({ id }) => {
        onDone();
        await refresh();
        router.push(`/groups/${id}`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function addFriend() {
    const parsed = memberNameSchema.safeParse(friend);
    if (!parsed.success) {
      setFriendError(parsed.error.issues[0]?.message);
      return;
    }
    const name = parsed.data;
    if (names.some((n) => n.toLowerCase() === name.toLowerCase())) {
      setFriendError(`${name} is already on the list.`);
      return;
    }
    form.setValue("memberNames", [...names, name], { shouldValidate: true });
    setFriend("");
    setFriendError(undefined);
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => create.mutate(values))}
      className="flex flex-col gap-5 px-4 pb-6 lg:px-0 lg:pb-0"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group-name">Name</Label>
        <Input
          id="group-name"
          placeholder="Siargao Trip, Condo 4B…"
          autoComplete="off"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "group-name-error" : undefined}
          {...form.register("name")}
        />
        <FieldError id="group-name-error" message={errors.name?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium" id="group-icon-label">
          Icon
        </span>
        <Controller
          control={form.control}
          name="icon"
          render={({ field }) => (
            <IconPicker value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group-currency">Currency</Label>
        <select
          id="group-currency"
          className="h-11 rounded-lg border border-input bg-card px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          {...form.register("currency")}
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <p className="text-[13px] text-ink-3">
          Can&apos;t be changed after the first expense.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Who&apos;s in?</legend>
        <p className="text-[13px] text-ink-3">
          You&apos;re in already. Add anyone else by name.
        </p>
        <div className="flex gap-2">
          <Label htmlFor="friend-name" className="sr-only">
            Friend&apos;s name
          </Label>
          <Input
            id="friend-name"
            placeholder="e.g. Ana"
            autoComplete="off"
            value={friend}
            onChange={(e) => setFriend(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFriend();
              }
            }}
            aria-invalid={friendError ? true : undefined}
            aria-describedby={friendError ? "friend-name-error" : undefined}
          />
          <Button type="button" variant="outline" onClick={addFriend}>
            Add
          </Button>
        </div>
        <FieldError id="friend-name-error" message={friendError} />
        <FieldError
          id="member-names-error"
          message={errors.memberNames?.message}
        />
        {names.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="People to add">
            {names.map((name) => (
              <li
                key={name}
                className="flex h-9 items-center gap-1 rounded-full border border-line-strong bg-card pr-1 pl-3 text-[14px] pointer-coarse:h-11 pointer-coarse:pr-0"
              >
                {name}
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  onClick={() =>
                    form.setValue(
                      "memberNames",
                      names.filter((n) => n !== name),
                    )
                  }
                  className="flex size-7 items-center justify-center rounded-full text-ink-2 hover:bg-line-soft pointer-coarse:size-11"
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <Button type="submit" size="xl" disabled={create.isPending}>
        {create.isPending ? "Creating…" : "Create group"}
      </Button>
    </form>
  );
}
