import { prisma } from "@/lib/prisma";
import { completePendingPayment } from "@/lib/payments";
import { scheduleInvoiceEmail } from "@/lib/invoices";
import { alertStaffOnTelegram, createNotification } from "@/lib/notifications";
import { getTransactionStatus, safeTxnId, type OrangeTxnStatus } from "@/lib/orangeMoneyWebpay";

// Paiements en ligne par l'API Orange Money Web Payment (provider
// "orange_money"). Un paiement n'est crédité qu'après confirmation par Orange :
// sa notification (authentifiée par le notif_token), revérifiée auprès de
// l'API d'état quand elle répond, le retour du patient sur le site, ou la
// relève périodique du cron pour les notifications qui ne viennent pas.

export const ORANGE_MONEY_PROVIDER = "orange_money";

/** La page de paiement Orange expire après 10 minutes ; on laisse une large marge. */
export const ABANDON_AFTER_MS = 30 * 60_000;

export type SyncOutcome = "completed" | "pending" | "failed" | "canceled" | "not_found";

/** Ce que l'on fait d'un paiement en attente selon l'état donné par Orange. */
export function decideFromStatus(status: OrangeTxnStatus, createdAt: Date, now = new Date()): "complete" | "fail" | "cancel" | "wait" {
  if (status === "SUCCESS") return "complete";
  if (status === "FAILED" || status === "EXPIRED") return "fail";
  // INITIATED : le patient n'a rien validé ; au-delà de la durée de la page, il a abandonné.
  if (status === "INITIATED" && now.getTime() - createdAt.getTime() > ABANDON_AFTER_MS) return "cancel";
  return "wait";
}

type Pending = { id: number; patientId: number; sessionsCount: number; amount: unknown; currency: string };

async function markCompleted(payment: Pending, txnId: string | null): Promise<void> {
  if (!(await completePendingPayment(payment))) return;
  if (txnId) await prisma.payment.update({ where: { id: payment.id }, data: { providerTxnId: txnId } });
  scheduleInvoiceEmail(payment.id);
  const n = payment.sessionsCount;
  await createNotification({
    userId: payment.patientId,
    type: "payment.confirmed",
    title: "Paiement reçu",
    body: `${n} séance${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""} à votre compte. Votre facture vous est envoyée par e-mail.`,
    link: "/subscription",
  });
  await alertStaffOnTelegram("manage_finances", {
    type: "payment.received",
    title: "Paiement Orange Money reçu",
    body: `${Number(payment.amount).toLocaleString("fr-FR")} ${payment.currency}`,
    link: "/admin/finances",
    alert: { amount: Number(payment.amount), currency: payment.currency, reference: txnId ?? undefined },
  });
}

async function settle(paymentId: number, status: "failed" | "canceled"): Promise<void> {
  await prisma.payment.updateMany({ where: { id: paymentId, status: "pending" }, data: { status } });
}

/**
 * Met un paiement Orange Money en accord avec l'état réel chez Orange.
 * `canceledByPatient` : le patient est revenu par le lien « Annuler » de la
 * page Orange ; un paiement encore non validé est alors annulé tout de suite.
 */
export async function syncOrangeMoneyPayment(paymentId: number, opts: { canceledByPatient?: boolean } = {}): Promise<SyncOutcome> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.provider !== ORANGE_MONEY_PROVIDER) return "not_found";
  if (payment.status !== "pending") return payment.status;
  if (!payment.providerRef || !payment.providerOrderId) {
    // La création chez Orange n'a jamais abouti.
    await settle(payment.id, "failed");
    return "failed";
  }

  const { status, txnId } = await getTransactionStatus({
    orderId: payment.providerOrderId,
    amount: Number(payment.amount),
    payToken: payment.providerRef,
  });
  const decision = decideFromStatus(status, payment.createdAt);
  if (decision === "complete") {
    await markCompleted(payment, txnId);
    return "completed";
  }
  if (decision === "fail") {
    await settle(payment.id, "failed");
    return "failed";
  }
  if (decision === "cancel" || (opts.canceledByPatient && status === "INITIATED")) {
    await settle(payment.id, "canceled");
    return "canceled";
  }
  return "pending";
}

/**
 * Notification d'Orange : elle n'est acceptée que si son notif_token est
 * celui reçu à la création du paiement (méthode d'authentification du
 * guide). L'état est revérifié auprès de l'API ; si celle-ci ne répond pas,
 * on s'en tient à la notification authentifiée.
 */
export async function handleOrangeMoneyNotification(body: { status?: unknown; notif_token?: unknown; txnid?: unknown }): Promise<SyncOutcome> {
  const token = typeof body.notif_token === "string" ? body.notif_token : "";
  if (!/^[A-Za-z0-9]{8,64}$/.test(token)) return "not_found";
  const payment = await prisma.payment.findUnique({ where: { notifToken: token } });
  if (!payment || payment.provider !== ORANGE_MONEY_PROVIDER) return "not_found";
  if (payment.status !== "pending") return payment.status;

  try {
    return await syncOrangeMoneyPayment(payment.id);
  } catch (err) {
    console.error("[orange_money] vérification de la notification impossible, notification seule retenue:", err instanceof Error ? err.message : err);
  }
  const status = typeof body.status === "string" ? body.status.toUpperCase() : "";
  if (status === "SUCCESS") {
    await markCompleted(payment, safeTxnId(body.txnid));
    return "completed";
  }
  if (status === "FAILED") {
    await settle(payment.id, "failed");
    return "failed";
  }
  return "pending";
}

/**
 * Relève périodique (cron) des paiements restés en attente : notification
 * perdue, patient qui a fermé la page Orange sans revenir sur le site.
 */
export async function runOrangeMoneySweep(now = new Date()): Promise<{ checked: number; completed: number; closed: number; errors: number }> {
  const pending = await prisma.payment.findMany({
    where: {
      provider: ORANGE_MONEY_PROVIDER,
      status: "pending",
      // Laisse au patient le temps de payer avant de demander l'état.
      createdAt: { lt: new Date(now.getTime() - 2 * 60_000), gt: new Date(now.getTime() - 7 * 24 * 3600_000) },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  const result = { checked: 0, completed: 0, closed: 0, errors: 0 };
  for (const { id } of pending) {
    try {
      const outcome = await syncOrangeMoneyPayment(id);
      result.checked++;
      if (outcome === "completed") result.completed++;
      else if (outcome === "failed" || outcome === "canceled") result.closed++;
    } catch (err) {
      result.errors++;
      console.error(`[orange_money] relève du paiement ${id} impossible:`, err instanceof Error ? err.message : err);
    }
  }
  return result;
}
