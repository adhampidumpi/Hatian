import { on } from "node:events";
import { z } from "zod";
import { PRESENCE_TTL_MS, type LiveEvent } from "@/lib/live";
import { db } from "../../db";
import { ensureListening, liveEvents, publish } from "../../realtime/bus";
import { requireMembership } from "../../services/access";
import { protectedProcedure, router } from "../trpc";

async function myGroupIds(userId: string) {
  const rows = await db.groupMember.findMany({
    where: { userId, removedAt: null },
    select: { groupId: true },
  });
  return new Set(rows.map((r) => r.groupId));
}

export const liveRouter = router({
  /**
   * Everything happening in the groups you're in, as server-sent events.
   * Events carry ids, not data: the client refetches through the normal
   * (authorised) queries. Your own presence is left out.
   */
  events: protectedProcedure.subscription(async function* ({ ctx, signal }) {
    await ensureListening();
    let groups = await myGroupIds(ctx.user.id);
    for await (const [event] of on(liveEvents, "event", { signal })) {
      const e = event as LiveEvent;
      // Your own changes may have added or left groups.
      if (e.actorUserId === ctx.user.id) groups = await myGroupIds(ctx.user.id);
      if (!groups.has(e.groupId)) continue;
      if (e.type === "presence" && e.actorUserId === ctx.user.id) continue;
      yield e;
    }
  }),

  /** "I'm adding an expense" (renewed while the form is open), or stopped. */
  presence: protectedProcedure
    .input(
      z.object({
        groupId: z.string().min(1),
        activity: z.enum(["adding-expense", "editing-expense"]).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const me = await requireMembership(input.groupId, ctx.user.id);
      await publish({
        type: "presence",
        groupId: input.groupId,
        actorUserId: ctx.user.id,
        memberId: me.id,
        name: me.name,
        colorIndex: me.colorIndex,
        groupName: me.group.name,
        activity: input.activity,
        until: Date.now() + PRESENCE_TTL_MS,
      });
    }),
});
