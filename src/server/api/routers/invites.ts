import { groupIdSchema } from "@/lib/validation/groups";
import { inviteTokenSchema, joinGroupSchema } from "@/lib/validation/invites";
import {
  currentInvite,
  ensureInvite,
  joinGroup,
  previewInvite,
  resetInvite,
} from "../../services/invites";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const invitesRouter = router({
  current: protectedProcedure
    .input(groupIdSchema)
    .query(({ ctx, input }) => currentInvite(ctx.user.id, input.groupId)),

  ensure: protectedProcedure
    .input(groupIdSchema)
    .mutation(({ ctx, input }) => ensureInvite(ctx.user.id, input.groupId)),

  reset: protectedProcedure
    .input(groupIdSchema)
    .mutation(({ ctx, input }) => resetInvite(ctx.user.id, input.groupId)),

  preview: publicProcedure
    .input(inviteTokenSchema)
    .query(({ ctx, input }) =>
      previewInvite(input.token, ctx.user?.id ?? null),
    ),

  join: protectedProcedure
    .input(joinGroupSchema)
    .mutation(({ ctx, input }) => joinGroup(ctx.user, input)),
});
