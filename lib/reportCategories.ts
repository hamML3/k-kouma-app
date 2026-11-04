/**
 * Motifs de signalement — liste courte et fixe, volontairement neutre et
 * factuelle (plateforme de santé mentale : pas de formulation alarmante).
 * Un signalement peut être déposé à tout moment par un patient envers son
 * psychologue, ou par un psychologue envers son patient — voir
 * components/ReportButton.tsx et lib/actions/reports.ts.
 */
export const REPORT_CATEGORIES = [
  "comportement_inapproprie",
  "absence",
  "contenu_offensant",
  "autre",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  comportement_inapproprie: "Comportement inapproprié",
  absence: "Absence à un rendez-vous",
  contenu_offensant: "Contenu offensant ou déplacé",
  autre: "Autre",
};

export function isReportCategory(value: unknown): value is ReportCategory {
  return typeof value === "string" && (REPORT_CATEGORIES as readonly string[]).includes(value);
}
