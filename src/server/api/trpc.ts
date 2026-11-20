/**
 * tRPC setup: request context, error mapping and the procedures every router
 * builds on. Routers stay thin: validate input with the shared zod schemas,
 * then call a service in src/server/services.
 */
import "server-only";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { AppError } from "../services/errors";
import { getSessionUser } from "../session";

export async function createTRPCContext() {
  return { user: await getSessionUser() };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Field errors for forms when input validation fails.
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/** Turn service errors into tRPC errors with the same, user-safe message. */
const mapAppErrors = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok && result.error.cause instanceof AppError) {
    throw new TRPCError({
      code: result.error.cause.code,
      message: result.error.cause.message,
      cause: result.error.cause,
    });
  }
  return result;
});

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;

export const publicProcedure = t.procedure.use(mapAppErrors);

/** Requires a signed-in user; `ctx.user` is non-null inside. */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { user: ctx.user } });
});
