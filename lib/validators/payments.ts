import { z } from "zod";

export const declareManualPaymentSchema = z.object({
  pack: z.enum(["single", "pack3"]),
  reference: z
    .string()
    .trim()
    .min(4, "Référence de transaction trop courte.")
    .max(100, "Référence de transaction trop longue."),
  payerPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{8,15}$/, "Numéro de téléphone invalide."),
});

export type DeclareManualPaymentInput = z.infer<typeof declareManualPaymentSchema>;
