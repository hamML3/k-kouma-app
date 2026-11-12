import { z } from "zod";

// Les références Orange Money sont recopiées à la main depuis un SMS, où
// elles apparaissent sous la forme « ID:PP261125.123.C34567 ». On retire
// espaces et préfixe « ID: », et on met en majuscules, pour qu'une même
// référence ne puisse pas être enregistrée deux fois sous deux écritures.
export const orangeReferenceSchema = z
  .string()
  .transform((s) => s.replace(/\s+/g, "").toUpperCase().replace(/^ID:/, ""))
  .pipe(
    z
      .string()
      .min(4, "Référence de transaction trop courte.")
      .max(100, "Référence de transaction trop longue.")
      .regex(/^[A-Z0-9.\-_/]+$/, "La référence ne doit contenir que des lettres, des chiffres et des points.")
  );

// "+223 70 00 00 00", "70-00-00-00" ou "70000000" sont tous acceptés.
export const phoneSchema = z
  .string()
  .transform((s) => s.replace(/[\s.\-()]/g, ""))
  .pipe(z.string().regex(/^\+?[0-9]{8,15}$/, "Numéro de téléphone invalide."));

export const declareManualPaymentSchema = z.object({
  pack: z.enum(["single", "pack3"]),
  reference: orangeReferenceSchema,
  payerPhone: phoneSchema,
});

/** Versement à un praticien : référence du transfert et numéro qui l'a reçu. */
export const recordPayoutSchema = z.object({
  reference: orangeReferenceSchema,
  phone: phoneSchema,
});

export type DeclareManualPaymentInput = z.infer<typeof declareManualPaymentSchema>;

export const MANUAL_PAYMENT_REJECTION_REASONS = {
  not_found: "Nous n'avons pas trouvé cette référence sur notre compte marchand. Vérifiez-la dans le SMS d'Orange Money.",
  wrong_amount: "Le montant reçu ne correspond pas à la formule choisie. Contactez-nous pour régulariser.",
  already_used: "Cette transaction a déjà servi à créditer des séances.",
  other: "Nous n'avons pas pu vérifier votre paiement. Contactez-nous pour en savoir plus.",
} as const;

export type ManualPaymentRejectionReason = keyof typeof MANUAL_PAYMENT_REJECTION_REASONS;

export function isRejectionReason(value: unknown): value is ManualPaymentRejectionReason {
  return typeof value === "string" && Object.hasOwn(MANUAL_PAYMENT_REJECTION_REASONS, value);
}
