import type { PractitionerKind } from "@/lib/practitioners";

/**
 * Liste unique des spécialités proposées aux thérapeutes, partagée entre le
 * formulaire d'inscription, l'édition de profil et la validation serveur.
 *
 * Stockage : `TherapistProfile.specialties` est une chaîne séparée par des
 * virgules, sans espace (ex. "Anxiété et stress,Traumatisme (PTSD)").
 */
export const SPECIALTIES = [
  "Anxiété et stress",
  "Dépression",
  "Traumatisme (PTSD)",
  "Relations et couple",
  "Deuil et perte",
  "Troubles alimentaires",
  "Addictions",
  "Développement personnel",
  "Enfants et adolescents",
] as const;

/** Accompagnement non clinique : pas de dépression, de traumatisme ni d'addiction. */
export const COACH_SPECIALTIES = [
  "Développement personnel",
  "Confiance en soi",
  "Gestion du stress",
  "Carrière et orientation",
  "Relations et communication",
  "Objectifs et organisation",
  "Parentalité",
] as const;

export function specialtiesFor(kind: PractitionerKind): readonly string[] {
  return kind === "coach" ? COACH_SPECIALTIES : SPECIALTIES;
}

export const MIN_SPECIALTIES = 1;
export const MAX_SPECIALTIES = 5;

/**
 * Découpe une valeur stockée ou soumise en liste propre : séparateurs "," ou
 * ", " acceptés, espaces retirés, entrées vides et doublons supprimés.
 */
export function splitSpecialties(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  const parts = Array.isArray(raw) ? raw.flatMap((r) => r.split(",")) : raw.split(",");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const value = part.trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

export type SpecialtiesResult =
  | { ok: true; list: string[]; value: string }
  | { ok: false; error: string };

/**
 * Valide une sélection soumise par le client (jamais fiable) : chaque valeur
 * doit appartenir à la liste du métier (ou à `extraAllowed`, ex. les anciennes
 * valeurs déjà enregistrées sur le profil), entre MIN et MAX éléments.
 * Renvoie la chaîne normalisée à stocker (jointe par "," sans espace).
 */
export function normalizeSpecialties(
  raw: string | string[] | null | undefined,
  options: { extraAllowed?: readonly string[]; kind?: PractitionerKind } = {}
): SpecialtiesResult {
  const list = splitSpecialties(raw);
  const allowed = new Set<string>([...specialtiesFor(options.kind ?? "psychologist"), ...(options.extraAllowed ?? [])]);

  const unknown = list.filter((s) => !allowed.has(s));
  if (unknown.length > 0) {
    return { ok: false, error: `Spécialité non reconnue : ${unknown[0]}` };
  }
  if (list.length < MIN_SPECIALTIES) {
    return { ok: false, error: "Choisissez au moins une spécialité." };
  }
  if (list.length > MAX_SPECIALTIES) {
    return { ok: false, error: `Choisissez au maximum ${MAX_SPECIALTIES} spécialités.` };
  }
  return { ok: true, list, value: list.join(",") };
}
