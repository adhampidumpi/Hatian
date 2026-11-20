"use client";

import { useId } from "react";
import { DangerZone } from "./danger-zone";
import { GroupDetailsForm } from "./group-details-form";
import { MembersSettings } from "./members-settings";
import { SimplifySwitch } from "./simplify-switch";
import { useGroup } from "./use-group";

/** Everything on /groups/[groupId]/settings, top to bottom. */
export function GroupSettings({
  groupId,
  invite,
}: {
  groupId: string;
  /** The invite link section (rendered by the invites feature). */
  invite?: React.ReactNode;
}) {
  const headingId = useId();
  const group = useGroup(groupId);
  return (
    <div className="flex flex-col gap-8">
      <GroupDetailsForm group={group} />

      <section aria-labelledby={headingId} className="flex flex-col gap-1">
        <h2 id={headingId} className="text-[17px] font-semibold">
          Settling up
        </h2>
        <SimplifySwitch
          groupId={group.id}
          checked={group.simplifyDebts}
          id="settings-simplify"
          label="Simplify debts"
        />
        <p className="text-[13px] text-ink-3">
          Suggests the fewest payments. It changes who pays whom, never how much
          anyone ends up paying overall.
        </p>
      </section>

      <MembersSettings group={group} />
      {invite}
      <DangerZone group={group} />
    </div>
  );
}
