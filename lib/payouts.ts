import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPayoutStatementEmail, type PayoutStatement } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

// Versements aux praticiens. Un versement enregistre ce qui a réellement été
// envoyé (montant, numéro Orange Money, référence du transfert) et les gains
// qu'il solde ; le praticien en reçoit le relevé par e-mail. Partagé par
// l'approbation d'une demande de retrait (lib/actions/payouts.ts) et le
// versement spontané depuis /admin/finances (lib/actions/admin.ts).

export type RecordPayoutInput = {
  therapistId: number;
  reference: string;
  phone: string;
  actorId: number;
  /** Demande de retrait approuvée : seuls les gains acquis à sa date sont soldés. */
  request?: { id: number; createdAt: Date };
};

export type RecordPayoutResult =
  | { ok: true; payoutId: number; amount: number; earningsCount: number; requestId: number | null }
  | { ok: false; reason: "nothing_to_pay" | "duplicate_reference" | "already_handled" };

class ConcurrentPayout extends Error {}

/**
 * Enregistre un versement et solde les gains correspondants, en une seule
 * transaction : deux clics simultanés ne peuvent pas payer deux fois les
 * mêmes séances. Une demande de retrait encore en attente est close par ce
 * versement.
 */
export async function recordTherapistPayout(input: RecordPayoutInput): Promise<RecordPayoutResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const earnings = await tx.therapistEarning.findMany({
        where: {
          therapistId: input.therapistId,
          paidOut: false,
          ...(input.request ? { createdAt: { lte: input.request.createdAt } } : {}),
        },
        select: { id: true, amount: true },
      });
      if (earnings.length === 0) return { ok: false, reason: "nothing_to_pay" } as const;
      const amount = earnings.reduce((sum, e) => sum + Number(e.amount), 0);

      const pendingRequest = input.request
        ? { id: input.request.id }
        : await tx.payoutRequest.findFirst({ where: { therapistId: input.therapistId, status: "pending" }, select: { id: true } });

      const payout = await tx.therapistPayout.create({
        data: {
          therapistId: input.therapistId,
          amount: Math.round(amount * 100) / 100,
          phone: input.phone,
          reference: input.reference,
          paidById: input.actorId,
          payoutRequestId: pendingRequest?.id ?? null,
        },
        select: { id: true },
      });

      const paidAt = new Date();
      const { count } = await tx.therapistEarning.updateMany({
        where: { id: { in: earnings.map((e) => e.id) }, paidOut: false },
        data: { paidOut: true, paidOutAt: paidAt, payoutId: payout.id },
      });
      if (count !== earnings.length) throw new ConcurrentPayout();

      if (pendingRequest) {
        const closed = await tx.payoutRequest.updateMany({
          where: { id: pendingRequest.id, status: "pending" },
          data: { status: "approved", reviewedById: input.actorId, reviewedAt: paidAt },
        });
        if (input.request && closed.count === 0) throw new ConcurrentPayout();
      }

      return {
        ok: true,
        payoutId: payout.id,
        amount: Math.round(amount * 100) / 100,
        earningsCount: earnings.length,
        requestId: pendingRequest?.id ?? null,
      } as const;
    });
  } catch (err) {
    if (err instanceof ConcurrentPayout) return { ok: false, reason: "already_handled" };
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, reason: "duplicate_reference" };
    }
    throw err;
  }
}

const TYPE_LABELS: Record<string, string> = { video: "Vidéo", audio: "Audio", text: "Messagerie" };

/** Contenu du relevé d'un versement : sans nom de patient, un e-mail pouvant être lu par un tiers. */
export async function payoutStatement(payoutId: number): Promise<(PayoutStatement & { to: string }) | null> {
  const payout = await prisma.therapistPayout.findUnique({
    where: { id: payoutId },
    include: {
      therapist: { select: { email: true, therapistProfile: { select: { firstName: true } } } },
      earnings: {
        orderBy: { createdAt: "asc" },
        select: { amount: true, commissionPercent: true, appointment: { select: { scheduledAt: true, type: true } } },
      },
    },
  });
  if (!payout) return null;
  const fmtDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Bamako" });
  return {
    to: payout.therapist.email,
    firstName: payout.therapist.therapistProfile?.firstName ?? "",
    payoutId: payout.id,
    date: fmtDate(payout.createdAt),
    amount: `${Number(payout.amount).toLocaleString("fr-FR")} ${payout.currency}`,
    phone: payout.phone,
    reference: payout.reference,
    lines: payout.earnings.map((e) => ({
      date: fmtDate(e.appointment.scheduledAt),
      format: TYPE_LABELS[e.appointment.type] ?? "Séance",
      commission: e.commissionPercent !== null ? `${Number(e.commissionPercent).toLocaleString("fr-FR")} %` : "",
      amount: `${Number(e.amount).toLocaleString("fr-FR")} ${payout.currency}`,
    })),
  };
}

async function emailStatement(payoutId: number): Promise<void> {
  try {
    const statement = await payoutStatement(payoutId);
    if (!statement) return;
    const { to, ...content } = statement;
    const { error } = (await sendPayoutStatementEmail(to, content)) ?? {};
    if (error) throw new Error(error.message);
    await prisma.therapistPayout.update({ where: { id: payoutId }, data: { statementSentAt: new Date() } });
  } catch (err) {
    console.error(`[payout] relevé du versement ${payoutId} non envoyé:`, err instanceof Error ? err.message : err);
  }
}

/** Envoie le relevé après la réponse : l'action de l'équipe n'attend pas Resend. */
export function schedulePayoutStatement(payoutId: number): void {
  try {
    after(() => emailStatement(payoutId));
  } catch {
    void emailStatement(payoutId);
  }
}

/** Après un versement enregistré : journal d'audit, notification et relevé par e-mail au praticien. */
export async function announcePayout(
  result: Extract<RecordPayoutResult, { ok: true }>,
  input: { therapistId: number; phone: string; reference: string },
  actor: { id: number; email: string }
): Promise<void> {
  await logAudit({
    actor,
    action: result.requestId ? "payout_request.approve" : "admin.payout.mark_paid",
    targetType: result.requestId ? "payout_request" : "user",
    targetId: result.requestId ?? input.therapistId,
    metadata: {
      therapistId: input.therapistId,
      payoutId: result.payoutId,
      amount: result.amount,
      earningsCount: result.earningsCount,
      reference: input.reference,
    },
  });
  await createNotification({
    userId: input.therapistId,
    type: "payout.paid",
    title: "Versement envoyé",
    body: `${result.amount.toLocaleString("fr-FR")} XOF envoyés sur le ${input.phone} (réf. ${input.reference}). Le relevé vous est envoyé par e-mail.`,
    link: "/earnings",
  });
  schedulePayoutStatement(result.payoutId);
}

/** Message affiché à l'équipe quand un versement n'a pas pu être enregistré. */
export const PAYOUT_ERRORS: Record<string, string> = {
  reference: "Référence du transfert invalide : recopiez-la depuis le SMS d'Orange Money.",
  telephone: "Numéro de téléphone invalide.",
  nothing_to_pay: "Rien à verser : ces gains ont déjà été soldés.",
  duplicate_reference: "Cette référence a déjà été enregistrée pour un autre versement.",
  already_handled: "Ce versement vient d'être traité par quelqu'un d'autre.",
};
