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
} from "@/lib/email";
import { claimOldestFundingPayment, releaseFundingPayment } from "@/lib/credits";
import { effectiveCommissionPercent, therapistShare } from "@/lib/commission";
import { SESSION_PRICING, resolveTherapyType } from "@/lib/pricing";
import { isSlotBookable } from "@/lib/therapistSlots";

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
            durationMinutes: 45,
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

  const updated = await prisma.appointment.updateMany({
    where: { id: appointmentId, therapistId, status: "pending" },
    data: {
      status: "confirmed",
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
      patient: { select: { patientProfile: { select: { onboardingAnswers: true } } } },
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
    : SESSION_PRICING[resolveTherapyType(appointment.patient?.patientProfile?.onboardingAnswers as { therapyType?: string } | null)].single;

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

  revalidatePath("/appointments");
  revalidatePath("/patients");
  revalidatePath("/earnings");
  redirect("/appointments");
}
