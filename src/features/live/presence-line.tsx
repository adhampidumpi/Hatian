"use client";

import { MemberAvatar } from "@/features/groups/member-avatar";
import { useLive } from "./live-provider";

const doing = {
  "adding-expense": "is adding an expense",
  "editing-expense": "is editing an expense",
} as const;

/**
 * "Bea is adding an expense…" in the design's dashed box. Pass a group to
 * show only that group; leave it out to show every group (with its name).
 */
export function PresenceLine({ groupId }: { groupId?: string }) {
  const people = useLive()
    .presenceIn(groupId)
    .filter((p) => p.activity !== null);

  // The live region stays mounted (empty and out of the layout when nobody
  // is active) so screen readers announce people as they appear.
  return (
    <div
      role="status"
      className={people.length ? "flex flex-col gap-1.5" : "sr-only"}
    >
      {people.map((p) => (
        <p
          key={`${p.groupId}:${p.memberId}`}
          className="flex items-center gap-2.5 rounded-[10px] border border-dashed border-rule px-2.5 py-2 text-[13px] text-ink-2"
        >
          <MemberAvatar
            member={{ name: p.name, colorIndex: p.colorIndex }}
            size="sm"
          />
          <span>
            <strong className="font-semibold text-ink">{p.name}</strong>{" "}
            {doing[p.activity!]}
            {groupId ? "" : ` in ${p.groupName}`}…
          </span>
        </p>
      ))}
    </div>
  );
}
