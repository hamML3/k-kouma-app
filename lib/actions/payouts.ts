'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { announcePayout, recordTherapistPayout } from "@/lib/payouts";
import { phoneSchema, recordPayoutSchema } from "@/lib/validators/payments";
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

  // Sans numéro de versement, l'équipe ne saurait pas où envoyer l'argent.
  const profile = await prisma.therapistProfile.findUnique({ where: { userId: therapistId }, select: { payoutPhone: true } });
  if (!profile?.payoutPhone) {
    return { error: "Indiquez d'abord le numéro Orange Money sur lequel recevoir vos gains." };
  }

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
    alert: { amount: unpaidTotal, currency: "XOF" },
  });

  revalidatePath("/earnings");
  revalidatePath("/admin/finances");

  return {
    success: true,
    pendingRequest: { amount: unpaidTotal, createdAt: created.createdAt.toISOString() },
  };
}

/**
 * Approuve une demande de retrait, une fois l'argent envoyé : l'équipe saisit
 * la référence du transfert Orange Money et le numéro qui l'a reçu. Seuls
 * les gains acquis à la date de la demande sont soldés (lib/payouts.ts) ;
 * ceux arrivés depuis restent pour le prochain versement.
 */
export async function approvePayoutRequestAction(formData: FormData): Promise<void> {
  const admin = await requireAdminOrModerator();
  const requestId = Number(formData.get("requestId"));
  if (!requestId) redirect("/admin/finances");

  const request = await prisma.payoutRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "pending") redirect("/admin/finances?erreur=already_handled");

  const parsed = recordPayoutSchema.safeParse({ reference: formData.get("reference") ?? "", phone: formData.get("phone") ?? "" });
  if (!parsed.success) {
    redirect(`/admin/finances?erreur=${parsed.error.issues[0]?.path[0] === "phone" ? "telephone" : "reference"}#retraits`);
  }

  const input = { therapistId: request.therapistId, ...parsed.data };
  const result = await recordTherapistPayout({
    ...input,
    actorId: admin.id,
    request: { id: request.id, createdAt: request.createdAt },
  });
  if (!result.ok) redirect(`/admin/finances?erreur=${result.reason}#retraits`);

  await announcePayout(result, input, admin);

  revalidatePath("/admin/finances");
  revalidatePath("/earnings");
  redirect(`/admin/finances?versement=${result.payoutId}`);
}

export type SavePayoutPhoneState = { error?: string; saved?: boolean; phone?: string };

/** Le praticien indique le numéro Orange Money sur lequel recevoir ses gains. */
export async function savePayoutPhoneAction(_prev: SavePayoutPhoneState, formData: FormData): Promise<SavePayoutPhoneState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "therapist") redirect("/login");

  const parsed = phoneSchema.safeParse(formData.get("payoutPhone") ?? "");
  if (!parsed.success) return { error: "Numéro invalide. Exemple : +223 70 00 00 00." };

  const therapistId = Number(session.user.id);
  await prisma.therapistProfile.update({ where: { userId: therapistId }, data: { payoutPhone: parsed.data } });
  await logAudit({
    actor: { id: therapistId, email: session.user.email ?? undefined },
    action: "therapist.payout_phone.update",
    targetType: "user",
    targetId: therapistId,
  });
  revalidatePath("/earnings");
  return { saved: true, phone: parsed.data };
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
