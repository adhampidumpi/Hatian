import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    // Expected refusals (validation, not found, conflicts) are answers, not
    // failures; only log real server errors.
    onError: ({ path, error }) => {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`tRPC failed on ${path ?? "<no-path>"}:`, error);
      }
    },
  });
}

export { handler as GET, handler as POST };
