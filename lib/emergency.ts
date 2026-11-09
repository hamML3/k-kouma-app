/**
 * Numéros d'urgence du Mali affichés sur le site (questionnaire, contact,
 * FAQ, messagerie). Une seule source : les modifier ici les change partout.
 */
export const EMERGENCY_NUMBERS = [
  { label: "Protection civile (secours)", number: "122" },
  { label: "Police nationale", number: "101" },
  { label: "Gendarmerie nationale", number: "111" },
] as const;

/** « la Protection civile (122), la Police (101) ou la Gendarmerie (111) » */
export const EMERGENCY_TEXT = "la Protection civile (122), la Police nationale (101) ou la Gendarmerie (111)";
