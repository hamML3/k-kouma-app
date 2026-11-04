'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { markTherapistEarningsPaid } from "@/lib/payouts";
import { createNotification, notifyStaff } from "@/lib/notifications";

export type RequestPayoutState = {
  error?: string;
  success?: boolean;
  pendingRequest?: { amount: number; createdAt: string };
};

/**
 * Même garde que confirmManualPaymentAction/markTherapistPayoutAction
 * (lib/actions/admin.ts). Redéfinie ici car ces gardes n'y sont pas
 * exportées — convention déjà suivie ailleurs dans ce dépôt (chaque fichier
 * d'actions définit sa propre garde locale, voir requireReportsReviewer()
 * dans lib/actions/reports.ts ou requireArticleAuthor() dans
 * lib/actions/articles.ts).
 */
async function requireAdminOrModerator(): Promise<{ id: number; email: string; role: string }> {
  const session = await auth();
  if (!session?.user?.email || !hasPermission(session.user.role, session.user.permissions, "manage_finances")) {
    throw new Error("Accès refusé.");
  }
  return { id: Number(session.user.id), email: session.user.email, role: session.user.role };
}

/**
 * Demande de retrait du thérapeute — image miroir de
 * declareManualPaymentAction (lib/actions/payments.ts) : le patient y
 * déclare un paiement entrant déjà envoyé ; ici le thérapeute demande un
 * paiement sortant qui reste à faire. Le montant est figé à l'instant de la
 * demande (voir PayoutRequest.amount dans le schéma), pour que l'admin voie
 * ce qui était réellement dû même si d'autres séances se terminent avant la
 * revue. Toujours résolue depuis la session (jamais depuis le formulaire).
 *
 * Signature compatible useActionState (prevState, formData) mais les deux
 * paramètres sont omis : rien à y lire, un simple bouton suffit à déclencher
 * la demande (même convention que resendVerificationEmailAction, qui omet
 * déjà le paramètre formData qu'il n'utilise pas non plus).
 */
export async function requestPayoutAction(): Promise<RequestPayoutState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "therapist") redirect("/login");

  const therapistId = Number(session.user.id);

  // Pas de doublon : si une demande est déjà en attente, on la renvoie telle
  // quelle plutôt que d'en créer une seconde ou d'afficher une erreur muette.
  const existing = await prisma.payoutRequest.findFirst({
    where: { therapistId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return {
      error: "Vous avez déjà une demande de retrait en attente.",
      pendingRequest: { amount: Number(existing.amount), createdAt: existing.createdAt.toISOString() },
    };
  }

  const aggregate = await prisma.therapistEarning.aggregate({
    where: { therapistId, paidOut: false },
    _sum: { amount: true },
  });
  const unpaidTotal = Number(aggregate._sum.amount ?? 0);

  if (unpaidTotal <= 0) {
    return { error: "Vous n'avez aucun gain en attente de reversement pour le moment." };
  }

  const created = await prisma.payoutRequest.create({
    data: { therapistId, amount: unpaidTotal },
  });

  await logAudit({
    actor: { id: therapistId, email: session.user.email ?? undefined },
    action: "payout_request.create",
    targetType: "payout_request",
    targetId: created.id,
    metadata: { amount: unpaidTotal },
  });

  await notifyStaff("manage_finances", {
    type: "payout_request.created",
    title: "Nouvelle demande de retrait",
    body: `${unpaidTotal.toLocaleString("fr-FR")} XOF à reverser.`,
    link: "/admin/finances",
  });

  revalidatePath("/earnings");
  revalidatePath("/admin/finances");

  return {
    success: true,
    pendingRequest: { amount: unpaidTotal, createdAt: created.createdAt.toISOString() },
  };
}

/**
 * Approuve une demande de retrait : clôt la demande ET reverse les gains du
 * thérapeute, dans la même transaction — c'est l'effet concret attendu par
 * le thérapeute qui a demandé, pas seulement un changement de statut. La
 * marque des gains réutilise markTherapistEarningsPaid (lib/payouts.ts),
 * partagée avec markTherapistPayoutAction, plutôt que de la dupliquer.
 */
export async function approvePayoutRequestAction(formData: FormData): Promise<void> {
  const admin = await requireAdminOrModerator();
  const requestId = Number(formData.get("requestId"));
  if (!requestId) redirect("/admin/finances");

  const request = await prisma.payoutRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "pending") redirect("/admin/finances");

  const [, earningsResult] = await prisma.$transaction([
    prisma.payoutRequest.update({
      where: { id: requestId },
      data: { status: "approved", reviewedById: admin.id, reviewedAt: new Date() },
    }),
    markTherapistEarningsPaid(request.therapistId),
  ]);

  await logAudit({
    actor: admin,
    action: "payout_request.approve",
    targetType: "payout_request",
    targetId: requestId,
    metadata: {
      therapistId: request.therapistId,
      amount: Number(request.amount),
      earningsCount: earningsResult.count,
    },
  });

  await createNotification({
    userId: request.therapistId,
    type: "payout_request.approved",
    title: "Demande de retrait approuvée",
    body: `${Number(request.amount).toLocaleString("fr-FR")} XOF reversés.`,
    link: "/earnings",
  });

  revalidatePath("/admin/finances");
  revalidatePath("/earnings");
  redirect("/admin/finances");
}

/**
 * Rejette une demande de retrait (ex: montant à vérifier manuellement) — ne
 * touche pas aux gains du thérapeute, qui restent non reversés et pourront
 * faire l'objet d'une nouvelle demande plus tard.
 */
export async function rejectPayoutRequestAction(formData: FormData): Promise<void> {
  const admin = await requireAdminOrModerator();
  const requestId = Number(formData.get("requestId"));
  if (!requestId) redirect("/admin/finances");

  const request = await prisma.payoutRequest.findUnique({
    where: { id: requestId },
    select: { therapistId: true },
  });

  const { count } = await prisma.payoutRequest.updateMany({
    where: { id: requestId, status: "pending" },
    data: { status: "rejected", reviewedById: admin.id, reviewedAt: new Date() },
  });

  await logAudit({
    actor: admin,
    action: "payout_request.reject",
    targetType: "payout_request",
    targetId: requestId,
  });

  if (count > 0 && request) {
    await createNotification({
      userId: request.therapistId,
      type: "payout_request.rejected",
      title: "Demande de retrait refusée",
      body: "Vos gains restent disponibles : vous pouvez faire une nouvelle demande.",
      link: "/earnings",
    });
  }

  revalidatePath("/admin/finances");
  revalidatePath("/earnings");
  redirect("/admin/finances");
}
