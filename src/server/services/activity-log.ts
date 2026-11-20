import "server-only";
import { diffJson, type ActivityDiff } from "@/lib/activity";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Record an activity row. Always called inside the same transaction as the
 * change it describes, so the log can't drift from the data.
 */
export async function logActivity(
  tx: Prisma.TransactionClient,
  opts: {
    groupId: string;
    actorId: string;
    entityId?: string | null;
    diff: ActivityDiff;
  },
) {
  await tx.activity.create({
    data: {
      groupId: opts.groupId,
      actorId: opts.actorId,
      type: opts.diff.type,
      entityId: opts.entityId ?? null,
      diff: diffJson(opts.diff),
    },
  });
}
