import "server-only";
import { z } from "zod";

// An empty value in a .env file means "not set".
const optional = z
  .string()
  .optional()
  .transform((value) => value || undefined);

const schema = z
  .object({
    /** The app's connection (Neon: the pooled URL). */
    DATABASE_URL: z.string().min(1, "is required"),
    /** A direct connection, for LISTEN and migrations, when DATABASE_URL is pooled. */
    DATABASE_URL_UNPOOLED: optional,
    AUTH_SECRET: z.string().min(1, "is required"),
    AUTH_GOOGLE_ID: optional,
    AUTH_GOOGLE_SECRET: optional,
    AUTH_RESEND_KEY: optional,
    AUTH_EMAIL_FROM: optional,
    AUTH_DEMO_ENABLED: optional.pipe(z.enum(["true", "false"]).optional()),
  })
  .refine((e) => !e.AUTH_GOOGLE_ID === !e.AUTH_GOOGLE_SECRET, {
    path: ["AUTH_GOOGLE_SECRET"],
    message: "set both AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET, or neither",
  });

function load() {
  const parsed = schema.safeParse(process.env);
  if (parsed.success) return parsed.data;
  const problems = parsed.error.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid settings (see .env.example):\n${problems}`);
}

/**
 * Server settings, checked when the server first loads them (and during
 * `next build`), so a missing one fails the deploy instead of a page later.
 */
export const env = load();
