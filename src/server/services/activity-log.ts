import "server-only";
import { diffJson, type ActivityDiff } from "@/lib/activity";
import type { Prisma } from "@/generated/prisma/client";
import { publish } from "../realtime/bus";

/**
 * Record an activity row and tell the group's open browsers something
 * changed. Always called inside the same transaction as the change, so the
 * log can't drift from the data and nobody hears about a change that rolled
 * back (NOTIFY is delivered on commit).
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
  await publish(
    { type: "changed", groupId: opts.groupId, actorUserId: opts.actorId },
    tx,
  );
}
