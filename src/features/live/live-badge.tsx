"use client";

import { useLive } from "./live-provider";

/** The design's "Live" pill, shown while the live connection is open. */
export function LiveBadge() {
  const { connected } = useLive();
  if (!connected) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-owed-bg px-2.5 py-1 text-[12px] font-semibold text-[#0B4E39] dark:text-owed">
      <span
        aria-hidden
        className="size-[7px] rounded-full bg-owed shadow-[0_0_0_3px_rgb(11_107_76/0.2)]"
      />
      Live
    </span>
  );
}
