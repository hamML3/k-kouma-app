import { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

/**
 * Réclame le crédit de séance le plus ancien (FIFO) pour ce patient et
 * renvoie l'id du paiement qui l'a financé — utilisé ensuite pour calculer
 * le gain du thérapeute au prorata du prix réel payé (ex: pack de 3 à
 * 28 000 → 9 333/séance) plutôt que du tarif catalogue. `null` si aucun
 * paiement n'a de crédit disponible : ne devrait arriver que pour des
 * crédits achetés avant ce système (voir prisma/backfill-session-funding.ts).
 *
 * À appeler à l'intérieur de la même transaction sérialisable que le
 * débit de `PatientProfile.sessionCredits`, qui reste le verrou principal.
 */
export async function claimOldestFundingPayment(tx: TxClient, patientId: number): Promise<number | null> {
  const payment = await tx.payment.findFirst({
    where: { patientId, status: "completed", sessionsRemaining: { gt: 0 } },
    orderBy: { paidAt: "asc" },
    select: { id: true },
  });
  if (!payment) return null;

  const claimed = await tx.payment.updateMany({
    where: { id: payment.id, sessionsRemaining: { gt: 0 } },
    data: { sessionsRemaining: { decrement: 1 } },
  });
  return claimed.count > 0 ? payment.id : null;
}

/** Restitue un crédit précédemment réclamé (annulation d'un rendez-vous). */
export async function releaseFundingPayment(tx: TxClient, paymentId: number | null | undefined): Promise<void> {
  if (!paymentId) return;
  await tx.payment.updateMany({
    where: { id: paymentId },
    data: { sessionsRemaining: { increment: 1 } },
  });
}
