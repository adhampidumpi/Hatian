import { activityQuerySchema } from "@/lib/validation/activity";
import { listActivity } from "../../services/activity";
import { protectedProcedure, router } from "../trpc";

export const activityRouter = router({
  list: protectedProcedure
    .input(activityQuerySchema)
    .query(({ ctx, input }) => listActivity(ctx.user.id, input)),
});
