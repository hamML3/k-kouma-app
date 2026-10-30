export type TherapyType = "individuelle" | "couple" | "enfant";

export type PricingEntry = {
  label: string;
  single: number;
  pack4: number;
  /** Prix barré affiché à côté du prix promo du pack (facultatif). */
  pack4Was?: number;
};

/**
 * Source unique de vérité pour les tarifs — utilisée à la fois pour
 * l'affichage (landing page) et pour calculer le montant réel d'un paiement
 * côté serveur (ne jamais faire confiance à un montant envoyé par le client).
 */
export const SESSION_PRICING: Record<TherapyType, PricingEntry> = {
  individuelle: { label: "Individuelle", single: 10000, pack4: 38000, pack4Was: 40000 },
  couple: { label: "Couple", single: 16000, pack4: 60000, pack4Was: 64000 },
  enfant: { label: "Adolescent / Enfant", single: 8500, pack4: 32000, pack4Was: 34000 },
};

export const CURRENCY = "XOF";

export function sessionsCountFor(pack: "single" | "pack4"): number {
  return pack === "pack4" ? 4 : 1;
}

export function amountFor(therapyType: TherapyType, pack: "single" | "pack4"): number {
  const entry = SESSION_PRICING[therapyType];
  return pack === "pack4" ? entry.pack4 : entry.single;
}
