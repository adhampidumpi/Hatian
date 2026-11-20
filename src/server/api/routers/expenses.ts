import {
  expenseInputSchema,
  expenseRefSchema,
  updateExpenseSchema,
} from "@/lib/validation/expenses";
import { groupIdSchema } from "@/lib/validation/groups";
import {
  createExpense,
  deleteExpense,
  getExpense,
  listExpenses,
  restoreExpense,
  updateExpense,
} from "../../services/expenses";
import { protectedProcedure, router } from "../trpc";

export const expensesRouter = router({
  list: protectedProcedure
    .input(groupIdSchema)
    .query(({ ctx, input }) => listExpenses(ctx.user.id, input.groupId)),

  get: protectedProcedure
    .input(expenseRefSchema)
    .query(({ ctx, input }) =>
      getExpense(ctx.user.id, input.groupId, input.expenseId),
    ),

  create: protectedProcedure
    .input(expenseInputSchema)
    .mutation(({ ctx, input }) => createExpense(ctx.user.id, input)),

  update: protectedProcedure
    .input(updateExpenseSchema)
    .mutation(({ ctx, input }) => updateExpense(ctx.user.id, input)),

  delete: protectedProcedure
    .input(expenseRefSchema)
    .mutation(({ ctx, input }) =>
      deleteExpense(ctx.user.id, input.groupId, input.expenseId),
    ),

  restore: protectedProcedure
    .input(expenseRefSchema)
    .mutation(({ ctx, input }) =>
      restoreExpense(ctx.user.id, input.groupId, input.expenseId),
    ),
});
