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

const THERAPY_TYPES: TherapyType[] = ["individuelle", "couple", "enfant", "coaching"];

export function isTherapyType(value: unknown): value is TherapyType {
  return typeof value === "string" && (THERAPY_TYPES as string[]).includes(value);
}

/**
 * Type de séance qui fixe le tarif : celui du questionnaire, sinon celui
 * choisi sur la page Mes séances (PatientProfile.selectedTherapyType), sinon
 * « individuelle ». Toujours lu en base, jamais depuis un formulaire d'achat,
 * pour que le prix affiché et le montant débité restent la même source de
 * vérité.
 */
export function resolveTherapyType(
  answers: { therapyType?: string } | null | undefined,
  selected?: string | null
): TherapyType {
  if (!isTherapyType(answers?.therapyType) && isTherapyType(selected)) return selected;
  return resolveAnswersTherapyType(answers);
}

function resolveAnswersTherapyType(answers: { therapyType?: string } | null | undefined): TherapyType {
  return answers?.therapyType === "couple" || answers?.therapyType === "enfant" || answers?.therapyType === "coaching"
    ? answers.therapyType
    : "individuelle";
}
