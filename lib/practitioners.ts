export const PRACTITIONER_KINDS = ["psychologist", "coach"] as const;

export type PractitionerKind = (typeof PRACTITIONER_KINDS)[number];

export const PRACTITIONER_TITLES: Record<PractitionerKind, string> = {
  psychologist: "Psychologue clinicien",
  coach: "Coach de vie",
};

/** Libellé court, avec son article : « Votre psychologue », « Votre coach ». */
export const PRACTITIONER_LABELS: Record<PractitionerKind, string> = {
  psychologist: "psychologue",
  coach: "coach",
};

/**
 * Un coach n'est pas un professionnel de santé : un patient qui signale des
 * idées à risque, ou un mineur, doit être suivi par un psychologue. Tant que
 * le patient n'a pas répondu à la question de sécurité du questionnaire
 * (facultatif depuis que le tableau de bord est accessible directement), on
 * ne sait pas : seul un psychologue lui est proposé. Cette règle masque les
 * coachs de la liste et bloque leur choix côté serveur.
 */
export function canChooseCoach(answers: { safety?: string; therapyType?: string } | null | undefined): boolean {
  if (!answers || typeof answers.safety !== "string") return false;
  return answers.safety !== "oui" && answers.safety !== "parfois" && answers.therapyType !== "enfant";
}

/** Vrai si les coachs sont masqués seulement faute de questionnaire (et non à cause d'une réponse). */
export function coachNeedsQuestionnaire(answers: { safety?: string } | null | undefined): boolean {
  return !answers || typeof answers.safety !== "string";
}
