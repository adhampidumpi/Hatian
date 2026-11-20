"use client";

import { useMutation } from "@tanstack/react-query";
import { Pencil, UserMinus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FieldError } from "@/components/field-error";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { memberNameSchema } from "@/lib/validation/groups";
import { useTRPC } from "@/trpc/react";
import { useRefreshData } from "@/trpc/use-refresh";
import { MemberAvatar } from "./member-avatar";
import type { Group, Member } from "./use-group";

/** Members list with add, rename and remove. The server enforces the rules. */
export function MembersSettings({ group }: { group: Group }) {
  const trpc = useTRPC();
  const refresh = useRefreshData();
  const [renaming, setRenaming] = useState<Member | null>(null);
  const active = group.members.filter((m) => !m.removed);
  const isOwner = group.me.role === "OWNER";

  const remove = useMutation(
    trpc.groups.removeMember.mutationOptions({
      onSuccess: async (_, { memberId }) => {
        await refresh();
        const name = active.find((m) => m.id === memberId)?.name;
        toast.success(`${name ?? "They"} removed from the group`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <section aria-labelledby="members-heading" className="flex flex-col gap-3">
      <h2 id="members-heading" className="text-[17px] font-semibold">
        People <span className="text-ink-3">· {active.length}</span>
      </h2>
      <ul className="flex flex-col rounded-2xl border border-line bg-card px-4">
        {active.map((member) => {
          const canRename = !member.joined || member.isMe;
          const canRemove = !member.isMe && (!member.joined || isOwner);
          return (
            <li
              key={member.id}
              className="flex min-h-14 items-center gap-3 border-b border-line-soft py-2 last:border-b-0"
            >
              <MemberAvatar member={member} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">
                  {member.name}
                  {member.isMe && <span className="text-ink-3"> (you)</span>}
                </span>
                <span className="block text-[13px] text-ink-3">
                  {member.role === "OWNER"
                    ? "Owner"
                    : member.joined
                      ? "Joined"
                      : "Not joined yet"}
                </span>
              </span>
              {canRename && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Rename ${member.name}`}
                  onClick={() => setRenaming(member)}
                >
                  <Pencil size={18} aria-hidden />
                </Button>
              )}
              {canRemove && (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${member.name}`}
                      disabled={remove.isPending}
                    >
                      <UserMinus size={18} aria-hidden />
                    </Button>
                  }
                  title={`Remove ${member.name}?`}
                  description="Only possible while they don't owe or aren't owed anything here. Their past expenses stay in the history."
                  confirmLabel="Remove"
                  destructive
                  onConfirm={() =>
                    remove.mutate({ groupId: group.id, memberId: member.id })
                  }
                />
              )}
            </li>
          );
        })}
      </ul>
      <AddMemberForm groupId={group.id} />
      <RenameDialog
        groupId={group.id}
        member={renaming}
        onClose={() => setRenaming(null)}
      />
    </section>
  );
}

function AddMemberForm({ groupId }: { groupId: string }) {
  const trpc = useTRPC();
  const refresh = useRefreshData();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const add = useMutation(
    trpc.groups.addMember.mutationOptions({
      onSuccess: async () => {
        setName("");
        await refresh();
      },
      onError: (e) => setError(e.message),
    }),
  );

  return (
    <form
      noValidate
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = memberNameSchema.safeParse(name);
        if (!parsed.success) return setError(parsed.error.issues[0]?.message);
        setError(undefined);
        add.mutate({ groupId, name: parsed.data });
      }}
    >
      <Label htmlFor="add-member">Add someone by name</Label>
      <div className="flex gap-2">
        <Input
          id="add-member"
          placeholder="e.g. Ana"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "add-member-error" : undefined}
        />
        <Button type="submit" variant="outline" disabled={add.isPending}>
          Add
        </Button>
      </div>
      <FieldError id="add-member-error" message={error} />
    </form>
  );
}

function RenameDialog({
  groupId,
  member,
  onClose,
}: {
  groupId: string;
  member: Member | null;
  onClose: () => void;
}) {
  return (
    <ResponsiveDialog
      open={member !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            Rename {member?.isMe ? "yourself" : member?.name}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        {member && (
          <RenameForm
            key={member.id}
            groupId={groupId}
            member={member}
            onDone={onClose}
          />
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function RenameForm({
  groupId,
  member,
  onDone,
}: {
  groupId: string;
  member: Member;
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const refresh = useRefreshData();
  const [name, setName] = useState(member.name);
  const [error, setError] = useState<string>();
  const rename = useMutation(
    trpc.groups.renameMember.mutationOptions({
      onSuccess: async () => {
        onDone();
        await refresh();
      },
      onError: (e) => setError(e.message),
    }),
  );
  return (
    <form
      noValidate
      className="flex flex-col gap-3 px-4 pb-6 lg:px-0 lg:pb-0"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = memberNameSchema.safeParse(name);
        if (!parsed.success) return setError(parsed.error.issues[0]?.message);
        rename.mutate({ groupId, memberId: member.id, name: parsed.data });
      }}
    >
      <Label htmlFor="rename-member">Name</Label>
      <Input
        id="rename-member"
        autoComplete="off"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "rename-member-error" : undefined}
      />
      <FieldError id="rename-member-error" message={error} />
      <Button type="submit" disabled={rename.isPending}>
        Save
      </Button>
    </form>
  );
}
