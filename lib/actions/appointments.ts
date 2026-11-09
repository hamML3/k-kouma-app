'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import {
  sendAppointmentRequestEmail,
  sendAppointmentConfirmedEmail,
  sendAppointmentCanceledEmail,
  sendAppointmentProposalEmail,
  sendAppointmentNoticeEmail,
  formatDateTime,
} from "@/lib/email";
import { claimOldestFundingPayment, releaseFundingPayment } from "@/lib/credits";
import { effectiveCommissionPercent, therapistShare } from "@/lib/commission";
import { SESSION_PRICING, resolveTherapyType } from "@/lib/pricing";
import { isSlotBookable } from "@/lib/therapistSlots";
import { MIN_LEAD_MINUTES, SESSION_MINUTES } from "@/lib/availability";
import { createNotification } from "@/lib/notifications";
import { canChooseCoach } from "@/lib/practitioners";

/** Best-effort : une notification qui échoue ne doit jamais faire échouer l'action réelle. */
async function notify(label: string, send: () => Promise<unknown>) {
  try {
    await send();
  } catch (err) {
    console.error(`[notify:${label}] envoi échoué:`, err);
  }
}

// proxy.ts laisse passer les Server Actions sans contrôle et elles restent
// joignables par POST direct : l'identité vient toujours de la session, jamais
// d'un champ du formulaire.
async function requireUserId(role?: "patient" | "therapist"): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (role && session.user.role !== role) redirect("/dashboard");
  return Number(session.user.id);
}

export async function createAppointmentAction(formData: FormData): Promise<void> {
  const patientId = await requireUserId("patient");
  const therapistId = Number(formData.get("therapistId"));
  const scheduledAt = formData.get("scheduledAt") as string;
  const type = (formData.get("type") as string) || "video";

  const scheduledTime = new Date(scheduledAt).getTime();
  if (
    !therapistId ||
    Number.isNaN(scheduledTime) ||
    scheduledTime <= new Date().getTime() ||
    !["video", "audio", "text"].includes(type)
  ) {
    redirect("/appointments");
  }

  const assignment = await prisma.patientTherapistAssignment.findFirst({
    where: { patientId, therapistId, status: "active" },
  });

  if (!assignment) {
    redirect("/therapists?error=assign");
  }

  // Le questionnaire peut avoir été rempli après le choix du coach.
  const [practitioner, patientProfile] = await Promise.all([
    prisma.therapistProfile.findUnique({ where: { userId: therapistId }, select: { practitionerKind: true } }),
    prisma.patientProfile.findUnique({ where: { userId: patientId }, select: { onboardingAnswers: true } }),
  ]);
  if (
    practitioner?.practitionerKind === "coach" &&
    !canChooseCoach(patientProfile?.onboardingAnswers as { safety?: string; therapyType?: string } | null)
  ) {
    redirect("/therapists?error=coach");
  }

  if (!(await isSlotBookable(therapistId, new Date(scheduledAt)))) {
    redirect("/therapists?error=slot_taken");
  }

  // Transaction sérialisable : le contrôle de créneau (lecture) et la
  // réservation (écriture) doivent être vus comme une seule opération
  // atomique, sinon deux réservations lancées au même instant sur le même
  // créneau peuvent toutes les deux lire "libre" avant que l'une des deux
  // n'écrive — MySQL lève alors une erreur de sérialisation sur la seconde
  // plutôt que de laisser passer un double rendez-vous.
  let result: "ok" | "conflict" | "no_credit" | "retry";
  try {
    result = await prisma.$transaction(
      async (tx) => {
        const conflict = await tx.appointment.findFirst({
          where: {
            therapistId,
            scheduledAt: new Date(scheduledAt),
            status: { in: ["pending", "confirmed"] },
          },
          select: { id: true },
        });
        if (conflict) return "conflict";

        // Consomme un crédit de séance de façon atomique : l'UPDATE
        // conditionnel (sessionCredits > 0) agit comme verrou.
        const debited = await tx.patientProfile.updateMany({
          where: { userId: patientId, sessionCredits: { gt: 0 } },
          data: { sessionCredits: { decrement: 1 } },
        });
        if (debited.count === 0) return "no_credit";

        const fundedByPaymentId = await claimOldestFundingPayment(tx, patientId);

        await tx.appointment.create({
          data: {
            patientId,
            therapistId,
            scheduledAt: new Date(scheduledAt),
            durationMinutes: SESSION_MINUTES,
            status: "pending",
            type: type as "video" | "audio" | "text",
            webrtcRoomId: type !== "text" ? randomUUID() : null,
            fundedByPaymentId,
          },
        });
        return "ok";
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch {
    // Conflit de sérialisation MySQL : une autre réservation concurrente a
    // gagné la course sur ce même créneau.
    result = "retry";
  }

  if (result === "no_credit") {
    redirect("/subscription?error=credit");
  }
  if (result === "conflict" || result === "retry") {
    redirect("/therapists?error=slot_taken");
  }

  const [therapist, patient] = await Promise.all([
    prisma.user.findUnique({
      where: { id: therapistId },
      select: { email: true, therapistProfile: { select: { firstName: true, lastName: true } } },
    }),
    prisma.user.findUnique({ where: { id: patientId }, select: { patientProfile: { select: { nickname: true } } } }),
  ]);
  await createNotification({
    userId: therapistId,
    type: "appointment.request",
    title: "Nouvelle demande de rendez-vous",
    body: `${patient?.patientProfile?.nickname ?? "Un patient"}, le ${formatDateTime(new Date(scheduledAt))}.`,
    link: "/patients",
  });
  // Accusé de réception pour le patient : sa demande attend la réponse du praticien.
  const patientAccount = await prisma.user.findUnique({ where: { id: patientId }, select: { email: true } });
  const therapistFullName = therapist?.therapistProfile
    ? `${therapist.therapistProfile.firstName} ${therapist.therapistProfile.lastName}`
    : "votre praticien";
  await createNotification({
    userId: patientId,
    type: "appointment.requested",
    title: "Demande de séance envoyée",
    body: `${therapistFullName}, le ${formatDateTime(new Date(scheduledAt))}. Vous serez prévenu dès sa réponse.`,
    link: "/appointments",
  });
  if (patientAccount) {
    await notify("appointment.requested", () =>
      sendAppointmentNoticeEmail({
        to: patientAccount.email,
        name: patient?.patientProfile?.nickname ?? "Bonjour",
        subject: "Votre demande de séance est envoyée",
        title: "Demande de séance envoyée",
        lines: [
          `Votre demande de séance avec ${therapistFullName} le ${formatDateTime(new Date(scheduledAt))} a bien été envoyée.`,
          "Votre praticien va la confirmer ou vous proposer une autre date. Vous serez prévenu par e-mail.",
        ],
      })
    );
  }
  if (therapist?.therapistProfile) {
    await notify("appointment.request", () =>
      sendAppointmentRequestEmail(
        therapist.email,
        therapist.therapistProfile!.firstName,
        patient?.patientProfile?.nickname ?? "Un patient",
        new Date(scheduledAt)
      )
    );
  }

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  redirect("/appointments");
}

export async function cancelAppointmentAction(formData: FormData): Promise<void> {
  const patientId = await requireUserId("patient");
  const appointmentId = Number(formData.get("appointmentId"));

  if (!appointmentId) redirect("/appointments");

  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { therapistId: true, scheduledAt: true, fundedByPaymentId: true },
  });

  const { count } = await prisma.$transaction(async (tx) => {
    const canceled = await tx.appointment.updateMany({
      where: { id: appointmentId, patientId, status: "pending" },
      data: { status: "canceled" },
    });
    // Recrédite la séance uniquement si l'annulation a bien eu lieu (évite de
    // créditer deux fois si le rendez-vous n'était déjà plus "pending").
    if (canceled.count > 0) {
      await tx.patientProfile.updateMany({
        where: { userId: patientId },
        data: { sessionCredits: { increment: 1 } },
      });
      await releaseFundingPayment(tx, existing?.fundedByPaymentId);
    }
    return { count: canceled.count };
  });

  if (count > 0 && existing) {
    const [therapist, patient] = await Promise.all([
      prisma.user.findUnique({
        where: { id: existing.therapistId },
        select: { email: true, therapistProfile: { select: { firstName: true } } },
      }),
      prisma.user.findUnique({ where: { id: patientId }, select: { patientProfile: { select: { nickname: true } } } }),
    ]);
    await createNotification({
      userId: existing.therapistId,
      type: "appointment.canceled",
      title: "Rendez-vous annulé",
      body: `${patient?.patientProfile?.nickname ?? "Un patient"} a annulé la séance du ${formatDateTime(existing.scheduledAt)}.`,
      link: "/appointments",
    });
    if (therapist?.therapistProfile) {
      await notify("appointment.canceled", () =>
        sendAppointmentCanceledEmail(
          therapist.email,
          therapist.therapistProfile!.firstName,
          patient?.patientProfile?.nickname ?? "Un patient",
          existing.scheduledAt
        )
      );
    }
  }

  revalidatePath("/appointments");
  redirect("/appointments");
}

export async function confirmAppointmentAction(formData: FormData): Promise<void> {
  const therapistId = await requireUserId("therapist");
  const appointmentId = Number(formData.get("appointmentId"));

  if (!appointmentId) redirect("/patients");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { type: true, patientId: true, scheduledAt: true },
  });

  // Le praticien confirme la date proposée par le patient ; une date qu'il a
  // lui-même proposée attend la réponse du patient (acceptProposalAction).
  const updated = await prisma.appointment.updateMany({
    where: { id: appointmentId, therapistId, status: "pending", proposedBy: "patient" },
    data: {
      status: "confirmed",
      // La relance « en attente » a pu poser reminderSentAt : le rappel de la veille doit rester possible.
      reminderSentAt: null,
      // Les séances "messagerie" n'ont pas de salle WebRTC — seuls audio/vidéo en ont besoin.
      ...(appointment?.type !== "text" ? { webrtcRoomId: randomUUID() } : {}),
    },
  });

  if (updated.count > 0 && appointment) {
    const [patient, therapist] = await Promise.all([
      prisma.user.findUnique({
        where: { id: appointment.patientId },
        select: { email: true, patientProfile: { select: { nickname: true } } },
      }),
      prisma.user.findUnique({ where: { id: therapistId }, select: { therapistProfile: { select: { firstName: true } } } }),
    ]);
    await createNotification({
      userId: appointment.patientId,
      type: "appointment.confirmed",
      title: "Rendez-vous confirmé",
      body: `${therapist?.therapistProfile?.firstName ?? "Votre psychologue"} a confirmé votre séance du ${formatDateTime(appointment.scheduledAt)}.`,
      link: "/appointments",
    });
    if (patient?.patientProfile) {
      await notify("appointment.confirmed", () =>
        sendAppointmentConfirmedEmail(
          patient.email,
          patient.patientProfile!.nickname,
          therapist?.therapistProfile?.firstName ?? "Votre psychologue",
          appointment.scheduledAt
        )
      );
    }
  }

  revalidatePath("/patients");
  revalidatePath("/appointments");
  redirect("/patients");
}

export async function completeAppointmentAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const appointmentId = Number(formData.get("appointmentId"));

  if (!appointmentId) redirect("/appointments");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      patientId: true,
      therapistId: true,
      status: true,
      type: true,
      fundedByPayment: { select: { amount: true, sessionsCount: true } },
      patient: { select: { patientProfile: { select: { onboardingAnswers: true, selectedTherapyType: true } } } },
    },
  });

  if (!appointment || (appointment.patientId !== userId && appointment.therapistId !== userId)) {
    redirect("/appointments");
  }

  // Une séance de messagerie n'est close que par le psychologue — le patient
  // ne peut pas y mettre fin de son côté (appels vidéo/audio : les deux le peuvent).
  if (appointment.type === "text" && appointment.therapistId !== userId) {
    redirect(`/appointments/${appointmentId}/chat`);
  }

  // Seule une séance confirmée génère un gain — ni une demande en attente, ni
  // un rendez-vous annulé, ni une séance déjà terminée.
  if (appointment.status !== "confirmed") {
    revalidatePath("/appointments");
    revalidatePath("/patients");
    redirect("/appointments");
  }

  const [therapistProfile, settings] = await Promise.all([
    prisma.therapistProfile.findUnique({
      where: { userId: appointment.therapistId },
      select: { commissionPercent: true },
    }),
    prisma.platformSettings.findUnique({ where: { id: 1 } }),
  ]);

  // Prix réel de la séance : au prorata du paiement qui l'a financée (pack ou
  // séance seule) si connu, sinon le tarif catalogue à la séance seule — ce
  // deuxième cas ne devrait concerner que des crédits antérieurs à ce système.
  const sessionPrice = appointment.fundedByPayment
    ? Number(appointment.fundedByPayment.amount) / appointment.fundedByPayment.sessionsCount
    : SESSION_PRICING[
        resolveTherapyType(
          appointment.patient?.patientProfile?.onboardingAnswers as { therapyType?: string } | null,
          appointment.patient?.patientProfile?.selectedTherapyType
        )
      ].single;

  const commissionPercent = effectiveCommissionPercent(
    therapistProfile?.commissionPercent ? Number(therapistProfile.commissionPercent) : null,
    Number(settings?.defaultCommissionPercent ?? 20)
  );

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "completed" },
    }),
    // Gain figé à la commission en vigueur au moment de la séance.
    prisma.therapistEarning.create({
      data: {
        therapistId: appointment.therapistId,
        appointmentId,
        amount: therapistShare(sessionPrice, commissionPercent),
        commissionPercent,
      },
    }),
  ]);

  // Le patient est invité à donner son avis (formulaire sur /appointments).
  await createNotification({
    userId: appointment.patientId,
    type: "appointment.completed",
    title: "Séance terminée",
    body: "Comment s'est passée votre séance ? Vous pouvez laisser un avis.",
    link: "/appointments",
  });

  revalidatePath("/appointments");
  revalidatePath("/patients");
  revalidatePath("/earnings");
  redirect("/appointments");
}

const PROPOSAL_MAX_DAYS = 60;

/** Un autre rendez-vous (en attente ou confirmé) de ce praticien ou de ce patient chevauche-t-il ce créneau ? */
async function overlapsOther(appointmentId: number, therapistId: number, patientId: number, start: Date, minutes: number): Promise<boolean> {
  const end = new Date(start.getTime() + minutes * 60_000);
  const others = await prisma.appointment.findMany({
    where: {
      id: { not: appointmentId },
      status: { in: ["pending", "confirmed"] },
      OR: [{ therapistId }, { patientId }],
      scheduledAt: { lt: end, gt: new Date(start.getTime() - 3 * 3_600_000) },
    },
    select: { scheduledAt: true, durationMinutes: true },
  });
  return others.some((o) => o.scheduledAt.getTime() + (o.durationMinutes || SESSION_MINUTES) * 60_000 > start.getTime());
}

/**
 * Négociation de la date d'un rendez-vous en attente : le patient propose,
 * le praticien confirme ou propose une autre date, et ainsi de suite. Chacun
 * peut proposer ; la date proposée par le patient doit tomber dans les
 * disponibilités du praticien, celle du praticien est libre (c'est son
 * agenda). Aucun chevauchement avec un autre rendez-vous de l'un ou l'autre.
 */
export async function proposeAppointmentTimeAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "patient" && role !== "therapist")) redirect("/login");
  const userId = Number(session.user.id);
  const appointmentId = Number(formData.get("appointmentId"));
  const proposed = new Date(String(formData.get("scheduledAt") ?? ""));

  const appointment = appointmentId
    ? await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, patientId: true, therapistId: true, status: true, durationMinutes: true },
      })
    : null;
  const byTherapist = appointment?.therapistId === userId;
  if (!appointment || appointment.status !== "pending" || (!byTherapist && appointment.patientId !== userId)) {
    redirect("/appointments");
  }

  const now = Date.now();
  if (
    isNaN(proposed.getTime()) ||
    proposed.getTime() < now + MIN_LEAD_MINUTES * 60_000 ||
    proposed.getTime() > now + PROPOSAL_MAX_DAYS * 86_400_000
  ) {
    redirect("/appointments?error=proposal_date");
  }
  const minutes = appointment.durationMinutes || SESSION_MINUTES;
  if (!byTherapist && !(await isSlotBookable(appointment.therapistId, proposed, appointment.id))) {
    redirect("/appointments?error=proposal_unavailable");
  }
  if (await overlapsOther(appointment.id, appointment.therapistId, appointment.patientId, proposed, minutes)) {
    redirect("/appointments?error=proposal_conflict");
  }

  const { count } = await prisma.appointment.updateMany({
    where: { id: appointment.id, status: "pending" },
    data: { scheduledAt: proposed, proposedBy: byTherapist ? "therapist" : "patient", reminderSentAt: null },
  });
  if (count === 0) redirect("/appointments");

  const recipientId = byTherapist ? appointment.patientId : appointment.therapistId;
  const [recipient, sender] = await Promise.all([
    prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true, patientProfile: { select: { nickname: true } }, therapistProfile: { select: { firstName: true } } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { patientProfile: { select: { nickname: true } }, therapistProfile: { select: { firstName: true, lastName: true } } },
    }),
  ]);
  const fromName = sender?.therapistProfile
    ? `${sender.therapistProfile.firstName} ${sender.therapistProfile.lastName}`
    : sender?.patientProfile?.nickname ?? "Votre interlocuteur";
  await createNotification({
    userId: recipientId,
    type: "appointment.proposal",
    title: "Nouvelle date proposée",
    body: `${fromName} propose le ${formatDateTime(proposed)}.`,
    link: "/appointments",
  });
  if (recipient) {
    await notify("appointment.proposal", () =>
      sendAppointmentProposalEmail(
        recipient.email,
        recipient.patientProfile?.nickname ?? recipient.therapistProfile?.firstName ?? "Bonjour",
        fromName,
        proposed
      )
    );
  }

  revalidatePath("/appointments");
  revalidatePath("/patients");
  redirect("/appointments?proposal=sent");
}

/** Le patient accepte la date proposée par son praticien : le rendez-vous est confirmé. */
export async function acceptProposalAction(formData: FormData): Promise<void> {
  const patientId = await requireUserId("patient");
  const appointmentId = Number(formData.get("appointmentId"));
  const appointment = appointmentId
    ? await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, patientId: true, therapistId: true, status: true, proposedBy: true, scheduledAt: true, durationMinutes: true, type: true },
      })
    : null;
  if (!appointment || appointment.patientId !== patientId || appointment.status !== "pending" || appointment.proposedBy !== "therapist") {
    redirect("/appointments");
  }
  if (appointment.scheduledAt.getTime() <= Date.now()) redirect("/appointments?error=proposal_date");
  if (await overlapsOther(appointment.id, appointment.therapistId, patientId, appointment.scheduledAt, appointment.durationMinutes || SESSION_MINUTES)) {
    redirect("/appointments?error=proposal_conflict");
  }

  const { count } = await prisma.appointment.updateMany({
    where: { id: appointment.id, status: "pending", proposedBy: "therapist" },
    data: { status: "confirmed", reminderSentAt: null, ...(appointment.type !== "text" ? { webrtcRoomId: randomUUID() } : {}) },
  });
  if (count > 0) {
    const [patient, therapist] = await Promise.all([
      prisma.user.findUnique({ where: { id: patientId }, select: { patientProfile: { select: { nickname: true } } } }),
      prisma.user.findUnique({ where: { id: appointment.therapistId }, select: { email: true, therapistProfile: { select: { firstName: true } } } }),
    ]);
    const patientName = patient?.patientProfile?.nickname ?? "Votre patient";
    await createNotification({
      userId: appointment.therapistId,
      type: "appointment.accepted",
      title: "Date acceptée",
      body: `${patientName} a accepté la séance du ${formatDateTime(appointment.scheduledAt)}.`,
      link: "/appointments",
    });
    if (therapist) {
      await notify("appointment.accepted", () =>
        sendAppointmentNoticeEmail({
          to: therapist.email,
          name: therapist.therapistProfile?.firstName ?? "Bonjour",
          subject: "Date acceptée : séance confirmée",
          title: "Séance confirmée",
          lines: [`${patientName} a accepté la date que vous avez proposée : la séance du ${formatDateTime(appointment.scheduledAt)} est confirmée.`],
        })
      );
    }
  }

  revalidatePath("/appointments");
  revalidatePath("/patients");
  redirect("/appointments?proposal=accepted");
}
