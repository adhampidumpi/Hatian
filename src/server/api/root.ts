import "server-only";
import { activityRouter } from "./routers/activity";
import { demoRouter } from "./routers/demo";
import { expensesRouter } from "./routers/expenses";
import { groupsRouter } from "./routers/groups";
import { invitesRouter } from "./routers/invites";
import { liveRouter } from "./routers/live";
import { paymentsRouter } from "./routers/payments";
import { ratesRouter } from "./routers/rates";
import { createCallerFactory, router } from "./trpc";

/** All API routes. Add each feature's router here. */
export const appRouter = router({
  groups: groupsRouter,
  expenses: expensesRouter,
  invites: invitesRouter,
  payments: paymentsRouter,
  activity: activityRouter,
  live: liveRouter,
  demo: demoRouter,
  rates: ratesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
