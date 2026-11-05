export type TherapyType = "individuelle" | "couple" | "enfant" | "coaching";

export type PricingEntry = {
  label: string;
  single: number;
  pack3: number;
  /** Prix barré affiché à côté du prix promo du pack (facultatif). */
  pack3Was?: number;
};

/**
 * Source unique de vérité pour les tarifs — utilisée à la fois pour
 * l'affichage (landing page) et pour calculer le montant réel d'un paiement
 * côté serveur (ne jamais faire confiance à un montant envoyé par le client).
 */
export const SESSION_PRICING: Record<TherapyType, PricingEntry> = {
  individuelle: { label: "Individuelle", single: 10000, pack3: 28000, pack3Was: 30000 },
  couple: { label: "Couple", single: 20000, pack3: 57000, pack3Was: 60000 },
  enfant: { label: "Adolescent / Enfant", single: 8500, pack3: 23500, pack3Was: 25500 },
  coaching: { label: "Coaching de vie", single: 10000, pack3: 28000, pack3Was: 30000 },
};

export const CURRENCY = "XOF";

export function sessionsCountFor(pack: "single" | "pack3"): number {
  return pack === "pack3" ? 3 : 1;
}

export function amountFor(therapyType: TherapyType, pack: "single" | "pack3"): number {
  const entry = SESSION_PRICING[therapyType];
  return pack === "pack3" ? entry.pack3 : entry.single;
}

/**
 * Le type de thérapie facturé est toujours celui choisi par le patient à
 * l'onboarding — jamais une valeur reconstruite ailleurs — pour que
 * l'affichage du prix (réservation) et le montant réellement débité
 * (paiement) restent la même source de vérité.
 */
export function resolveTherapyType(answers: { therapyType?: string } | null | undefined): TherapyType {
  return answers?.therapyType === "couple" || answers?.therapyType === "enfant" || answers?.therapyType === "coaching"
    ? answers.therapyType
    : "individuelle";
}
