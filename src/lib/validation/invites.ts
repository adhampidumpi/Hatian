import { z } from "zod";

export const inviteTokenSchema = z.object({
  token: z.string().min(16).max(64),
});

export const joinGroupSchema = inviteTokenSchema.extend({
  /** Placeholder member to claim ("I'm Dan"); omit to join as someone new. */
  claimMemberId: z.string().min(1).optional(),
});
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;

/**
 * Where to go after signing in. Only same-site paths, so a crafted link
 * can't bounce someone to another website.
 */
export function safeCallbackPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return undefined;
  return value;
}
