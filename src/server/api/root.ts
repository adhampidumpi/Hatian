import "server-only";
import { groupsRouter } from "./routers/groups";
import { createCallerFactory, router } from "./trpc";

/** All API routes. Add each feature's router here. */
export const appRouter = router({
  groups: groupsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
