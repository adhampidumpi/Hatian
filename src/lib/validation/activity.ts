import { z } from "zod";

export const ACTIVITY_FILTERS = [
  "ALL",
  "EXPENSES",
  "PAYMENTS",
  "EDITS",
] as const;
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

export const activityFilterLabels: Record<ActivityFilter, string> = {
  ALL: "All",
  EXPENSES: "Expenses",
  PAYMENTS: "Payments",
  EDITS: "Edits",
};

export const activityQuerySchema = z.object({
  /** One group, or every group you're in. */
  groupId: z.string().min(1).optional(),
  filter: z.enum(ACTIVITY_FILTERS).default("ALL"),
  limit: z.number().int().min(1).max(50).default(30),
  /** Id of the last item already shown (infinite scroll). */
  cursor: z.string().min(1).nullish(),
});
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
