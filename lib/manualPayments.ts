import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { completePendingPayment } from "@/lib/payments";
import { scheduleInvoiceEmail } from "@/lib/invoices";
import { createNotification } from "@/lib/notifications";
import { MANUAL_PAYMENT_REJECTION_REASONS, type ManualPaymentRejectionReason } from "@/lib/validators/payments";

// Validation et refus des paiements Orange Money déclarés à la main, communs
// à /admin/finances et au bot Telegram de l'équipe : mêmes contrôles, même
// journal d'audit, même notification au patient. L'appelant vérifie le droit
// « manage_finances » avant d'appeler.

type Actor = { id: number; email: string };
type Channel = "site" | "telegram";

export type ManualPaymentOutcome =
  | { ok: true; amount: number; sessionsCount: number; reference: string | null }
  | { ok: false; reason: "not_found" | "already_handled" };

/** Valide une déclaration : crédite les séances, émet la facture et l'envoie par e-mail. */
export async function confirmManualPayment(paymentId: number, actor: Actor, via: Channel = "site"): Promise<ManualPaymentOutcome> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  // Seules les déclarations manuelles se valident à la main : un paiement
  // PayDunya en attente n'est confirmé que par son webhook.
  if (!payment || payment.provider !== "orange_money_manual") return { ok: false, reason: "not_found" };
  if (payment.status !== "pending" || !(await completePendingPayment(payment))) {
    return { ok: false, reason: "already_handled" };
  }
  scheduleInvoiceEmail(paymentId);

  await logAudit({
    actor,
    action: "admin.payment.confirm",
    targetType: "payment",
    targetId: paymentId,
    metadata: {
      amount: Number(payment.amount),
      sessionsCount: payment.sessionsCount,
      provider: payment.provider,
      reference: payment.providerRef,
      via,
    },
  });

  const n = payment.sessionsCount;
  await createNotification({
    userId: payment.patientId,
    type: "payment.confirmed",
    title: "Paiement validé",
    body: `${n} séance${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""} à votre compte. Votre facture vous est envoyée par e-mail.`,
    link: "/subscription",
  });

  return { ok: true, amount: Number(payment.amount), sessionsCount: n, reference: payment.providerRef };
}

/**
 * Refuse une déclaration, avec un motif transmis au patient. La référence
 * est libérée (et gardée dans le journal d'audit) : si le refus venait d'une
 * erreur de formule, le patient peut la déclarer à nouveau.
 */
export async function rejectManualPayment(
  paymentId: number,
  actor: Actor,
  reason: ManualPaymentRejectionReason,
  via: Channel = "site"
): Promise<ManualPaymentOutcome> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { patientId: true, provider: true, providerRef: true, amount: true, sessionsCount: true },
  });
  if (!payment || payment.provider !== "orange_money_manual") return { ok: false, reason: "not_found" };

  const { count } = await prisma.payment.updateMany({
    where: { id: paymentId, status: "pending", provider: "orange_money_manual" },
    data: { status: "failed", providerRef: null },
  });
  if (count === 0) return { ok: false, reason: "already_handled" };

  await logAudit({
    actor,
    action: "admin.payment.reject",
    targetType: "payment",
    targetId: paymentId,
    metadata: { reason, reference: payment.providerRef, via },
  });
  await createNotification({
    userId: payment.patientId,
    type: "payment.rejected",
    title: "Paiement non validé",
    body: MANUAL_PAYMENT_REJECTION_REASONS[reason],
    link: "/subscription",
  });

  return { ok: true, amount: Number(payment.amount), sessionsCount: payment.sessionsCount, reference: payment.providerRef };
}
