import {
  addMemberSchema,
  createGroupSchema,
  groupIdSchema,
  memberRefSchema,
  renameMemberSchema,
  updateGroupSchema,
} from "@/lib/validation/groups";
import {
  createGroup,
  deleteGroup,
  getGroupDetail,
  getGroupSummaries,
  leaveGroup,
  updateGroup,
} from "../../services/groups";
import { addMember, removeMember, renameMember } from "../../services/members";
import { protectedProcedure, router } from "../trpc";

export const groupsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getGroupSummaries(ctx.user.id)),

  get: protectedProcedure
    .input(groupIdSchema)
    .query(({ ctx, input }) => getGroupDetail(input.groupId, ctx.user.id)),

  create: protectedProcedure
    .input(createGroupSchema)
    .mutation(({ ctx, input }) => createGroup(ctx.user, input)),

  update: protectedProcedure
    .input(updateGroupSchema)
    .mutation(({ ctx, input }) => updateGroup(ctx.user.id, input)),

  delete: protectedProcedure
    .input(groupIdSchema)
    .mutation(({ ctx, input }) => deleteGroup(ctx.user.id, input.groupId)),

  leave: protectedProcedure
    .input(groupIdSchema)
    .mutation(({ ctx, input }) => leaveGroup(ctx.user.id, input.groupId)),

  addMember: protectedProcedure
    .input(addMemberSchema)
    .mutation(({ ctx, input }) =>
      addMember(ctx.user.id, input.groupId, input.name),
    ),

  renameMember: protectedProcedure
    .input(renameMemberSchema)
    .mutation(({ ctx, input }) =>
      renameMember(ctx.user.id, input.groupId, input.memberId, input.name),
    ),

  removeMember: protectedProcedure
    .input(memberRefSchema)
    .mutation(({ ctx, input }) =>
      removeMember(ctx.user.id, input.groupId, input.memberId),
    ),
});
