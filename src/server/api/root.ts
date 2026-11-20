import "server-only";
import { groupsRouter } from "./routers/groups";
import { invitesRouter } from "./routers/invites";
import { createCallerFactory, router } from "./trpc";

/** All API routes. Add each feature's router here. */
export const appRouter = router({
  groups: groupsRouter,
  invites: invitesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
