import { groupIdSchema } from "@/lib/validation/groups";
import { listExpenses } from "../../services/expenses";
import { protectedProcedure, router } from "../trpc";

export const expensesRouter = router({
  list: protectedProcedure
    .input(groupIdSchema)
    .query(({ ctx, input }) => listExpenses(ctx.user.id, input.groupId)),
});
