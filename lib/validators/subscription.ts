import { z } from "zod";

export const createSubscriptionSchema = z.object({
  planId: z.number().int().positive(),
  omTransactionRef: z.string().min(1, "Référence de transaction requise"),
});

export const webhookPaymentSchema = z.object({
  transaction_ref: z.string(),
  status: z.enum(["SUCCESS", "FAILED", "PENDING"]),
  amount: z.number(),
  phone_number: z.string(),
  patient_id: z.number().int().positive(),
  plan_id: z.number().int().positive(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type WebhookPaymentInput = z.infer<typeof webhookPaymentSchema>;
