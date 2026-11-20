import { groupIdSchema } from "@/lib/validation/groups";
import { friendAddsExpense } from "../../services/demo";
import { protectedProcedure, router } from "../trpc";

export const demoRouter = router({
  /** "Watch Bea add an expense" (demo accounts only). */
  friendAddsExpense: protectedProcedure
    .input(groupIdSchema)
    .mutation(({ ctx, input }) => friendAddsExpense(ctx.user, input.groupId)),
});
