"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/react";
import { useRefreshData } from "@/trpc/use-refresh";
import { MemberAvatar } from "@/features/groups/member-avatar";

type Placeholder = { id: string; name: string; colorIndex: number };

/**
 * "Which one is you?" Pick a placeholder to take over their expenses, or
 * join as someone new.
 */
export function JoinChoices({
  token,
  groupName,
  placeholders,
}: {
  token: string;
  groupName: string;
  placeholders: Placeholder[];
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const refresh = useRefreshData();
  const [choice, setChoice] = useState<string | null>(
    placeholders.length > 0 ? null : "new",
  );
  const join = useMutation(
    trpc.invites.join.mutationOptions({
      onSuccess: async ({ groupId }) => {
        await refresh();
        router.replace(`/groups/${groupId}`);
        toast.success(`You joined ${groupName}`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!choice) return;
        join.mutate({
          token,
          claimMemberId: choice === "new" ? undefined : choice,
        });
      }}
    >
      {placeholders.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[15px] font-semibold">
            Which one is you?
          </legend>
          {[...placeholders, null].map((p) => {
            const value = p?.id ?? "new";
            const selected = choice === value;
            return (
              <label
                key={value}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
                  selected ? "border-ink" : "border-line",
                )}
              >
                <input
                  type="radio"
                  name="who"
                  value={value}
                  checked={selected}
                  onChange={() => setChoice(value)}
                  className="sr-only"
                />
                {p ? (
                  <MemberAvatar member={p} />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-8 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-2"
                  >
                    +
                  </span>
                )}
                <span className="flex-1 text-[15px] font-medium">
                  {p ? `I'm ${p.name}` : "I'm not on this list"}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "size-5 rounded-full border-2",
                    selected ? "border-[6px] border-ink" : "border-line-strong",
                  )}
                />
              </label>
            );
          })}
        </fieldset>
      )}
      <Button type="submit" size="xl" disabled={!choice || join.isPending}>
        {join.isPending ? "Joining…" : `Join ${groupName}`}
      </Button>
    </form>
  );
}
