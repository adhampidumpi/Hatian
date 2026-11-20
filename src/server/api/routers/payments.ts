import {
  paymentRefSchema,
  recordPaymentSchema,
} from "@/lib/validation/payments";
import {
  deletePayment,
  recordPayment,
  restorePayment,
} from "../../services/payments";
import { protectedProcedure, router } from "../trpc";

export const paymentsRouter = router({
  record: protectedProcedure
    .input(recordPaymentSchema)
    .mutation(({ ctx, input }) => recordPayment(ctx.user.id, input)),

  delete: protectedProcedure
    .input(paymentRefSchema)
    .mutation(({ ctx, input }) =>
      deletePayment(ctx.user.id, input.groupId, input.paymentId),
    ),

  restore: protectedProcedure
    .input(paymentRefSchema)
    .mutation(({ ctx, input }) =>
      restorePayment(ctx.user.id, input.groupId, input.paymentId),
    ),
});
