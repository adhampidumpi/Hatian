import "server-only";
import { expensesRouter } from "./routers/expenses";
import { groupsRouter } from "./routers/groups";
import { invitesRouter } from "./routers/invites";
import { paymentsRouter } from "./routers/payments";
import { createCallerFactory, router } from "./trpc";

/** All API routes. Add each feature's router here. */
export const appRouter = router({
  groups: groupsRouter,
  expenses: expensesRouter,
  invites: invitesRouter,
  payments: paymentsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
