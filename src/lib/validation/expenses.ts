import { z } from "zod";
import { categories } from "../categories";
import { isValidMinor } from "../money/currency";
import { groupIdSchema } from "./groups";

const categoryIds = categories.map((c) => c.id) as [string, ...string[]];

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Pick a date.");

/**
 * What the expense form sends. Shares are NOT sent: the server recomputes
 * them from the amount, mode and weights with the same allocateShares the
 * form previews with, so they always add up.
 */
export const expenseInputSchema = groupIdSchema.extend({
  description: z
    .string()
    .trim()
    .min(1, "Add a description.")
    .max(100, "Keep it under 100 characters."),
  categoryId: z.enum(categoryIds),
  date: isoDateSchema,
  amount: z.number().int().refine(isValidMinor, "Enter an amount."),
  paidById: z.string().min(1),
  splitMode: z.enum(["EQUAL", "SHARES", "PERCENT", "EXACT"]),
  weights: z
    .array(
      z.object({
        memberId: z.string().min(1),
        weight: z.number().int().refine(isValidMinor),
      }),
    )
    .min(1)
    .max(50)
    .refine(
      (ws) => new Set(ws.map((w) => w.memberId)).size === ws.length,
      "Each person can appear once.",
    ),
  note: z.string().trim().max(500).optional(),
});
export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export const expenseRefSchema = groupIdSchema.extend({
  expenseId: z.string().min(1),
});

export const updateExpenseSchema = expenseInputSchema.extend({
  expenseId: z.string().min(1),
});
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
