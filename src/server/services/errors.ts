/**
 * Errors thrown by services. They describe what went wrong in domain terms;
 * the API layer (src/server/api/trpc.ts) maps them to HTTP/tRPC codes, and
 * server components can catch them too. Messages are safe to show users.
 */
export type AppErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "SERVICE_UNAVAILABLE";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "That") =>
  new AppError("NOT_FOUND", `${what} doesn't exist or you don't have access.`);

export const badRequest = (message: string) =>
  new AppError("BAD_REQUEST", message);

export const conflict = (message: string) => new AppError("CONFLICT", message);

export const forbidden = (message: string) =>
  new AppError("FORBIDDEN", message);

/** Something we depend on (the exchange-rate API) didn't answer. */
export const unavailable = (message: string) =>
  new AppError("SERVICE_UNAVAILABLE", message);
