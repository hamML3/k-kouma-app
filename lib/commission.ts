/**
 * Commission K-Kouma sur les paiements à la séance. Le thérapeute n'a plus
 * de tarif propre : le patient paie toujours le prix catalogue
 * (lib/pricing.ts), et K-Kouma reverse le reste au thérapeute après
 * prélèvement d'un pourcentage — réglable globalement ou par thérapeute.
 */

export function effectiveCommissionPercent(
  therapistCommissionPercent: number | null | undefined,
  defaultCommissionPercent: number
): number {
  return therapistCommissionPercent ?? defaultCommissionPercent;
}

/** Part reversée au thérapeute sur un montant donné, pour un pourcentage de commission donné. */
export function therapistShare(amount: number, commissionPercent: number): number {
  return Math.round(amount * (1 - commissionPercent / 100) * 100) / 100;
}

/**
 * Un thérapeute doit (re)valider les conditions de commission dès que le
 * pourcentage qui s'applique à lui diffère du dernier qu'il a accepté — y
 * compris la toute première fois (aucune acceptation enregistrée).
 */
export function needsCommissionAcceptance(
  effectivePercent: number,
  acceptedPercent: number | null | undefined
): boolean {
  return acceptedPercent == null || Number(acceptedPercent) !== effectivePercent;
}
