import { prisma } from "@/lib/prisma";

export function formatInvoiceNumber(invoiceNumber: number, paidAt: Date): string {
  return `FA-${paidAt.getFullYear()}-${String(invoiceNumber).padStart(6, "0")}`;
}

/**
 * Seul chemin vers un paiement encaissé. Le passage de "pending" à "completed"
 * sert de verrou : un double clic ou un IPN rejoué ne crédite pas deux fois.
 * Le numéro de facture est pris dans la même transaction, donc un échec ne
 * laisse pas de trou dans la numérotation.
 *
 * Renvoie false si le paiement n'était plus en attente.
 */
export async function completePendingPayment(payment: {
  id: number;
  patientId: number;
  sessionsCount: number;
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: "pending" },
      data: { status: "completed", paidAt: new Date(), sessionsRemaining: payment.sessionsCount },
    });
    if (count === 0) return false;

    const counter = await tx.invoiceCounter.update({
      where: { id: 1 },
      data: { lastNumber: { increment: 1 } },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { invoiceNumber: counter.lastNumber },
    });
    await tx.patientProfile.updateMany({
      where: { userId: payment.patientId },
      data: { sessionCredits: { increment: payment.sessionsCount } },
    });
    return true;
  });
}
