import type { IconName } from "@/components/Icon";

/**
 * Association mots-clés → pictogramme, utilisée pour illustrer les
 * spécialités (texte libre) affichées sur les fiches et filtres thérapeutes.
 * Le premier mot-clé trouvé dans le libellé (insensible à la casse/accents) l'emporte.
 */
const SPECIALTY_KEYWORDS: [RegExp, IconName][] = [
  [/enfant|adolescent/i, "child"],
  [/couple|famille/i, "family"],
  [/individuel/i, "user"],
  [/anxi/i, "anxiety"],
  [/depress|dépress/i, "overwhelm"],
  [/trauma/i, "burnout"],
  [/deuil|perte/i, "self-care"],
  [/sommeil/i, "sleep"],
  [/confiance|estime/i, "self-care"],
];

/** Retourne l'icône associée à un libellé de spécialité, ou null si aucune ne correspond. */
export function getSpecialtyIcon(label: string): IconName | null {
  const match = SPECIALTY_KEYWORDS.find(([re]) => re.test(label));
  return match ? match[1] : null;
}
