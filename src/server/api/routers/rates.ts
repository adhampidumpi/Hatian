import { rateInputSchema } from "@/lib/validation/expenses";
import { getRate } from "../../services/rates";
import { protectedProcedure, router } from "../trpc";

export const ratesRouter = router({
  /** The rate the server will convert with, for the expense form's preview. */
  get: protectedProcedure
    .input(rateInputSchema)
    .query(({ input }) => getRate(input.base, input.quote, input.date)),
});
