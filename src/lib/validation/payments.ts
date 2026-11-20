import { z } from "zod";
import { isValidMinor } from "../money/currency";
import { isoDateSchema } from "./expenses";
import { groupIdSchema } from "./groups";

export const PAYMENT_METHODS = ["CASH", "GCASH", "MAYA", "BANK"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number] | "OTHER";

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  GCASH: "GCash",
  MAYA: "Maya",
  BANK: "Bank",
  OTHER: "Other",
};

export const recordPaymentSchema = groupIdSchema
  .extend({
    fromId: z.string().min(1),
    toId: z.string().min(1),
    amount: z
      .number()
      .int()
      .refine((n) => isValidMinor(n) && n > 0, "Enter an amount."),
    method: z.enum([...PAYMENT_METHODS, "OTHER"]),
    reference: z.string().trim().max(120).optional(),
    date: isoDateSchema,
  })
  .refine((p) => p.fromId !== p.toId, {
    message: "Someone can't pay themselves.",
    path: ["toId"],
  });
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const paymentRefSchema = groupIdSchema.extend({
  paymentId: z.string().min(1),
});
