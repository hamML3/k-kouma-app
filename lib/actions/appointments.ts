'use server'

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createAppointmentAction(formData: FormData): Promise<void> {
  const patientId = Number(formData.get("patientId"));
  const therapistId = Number(formData.get("therapistId"));
  const scheduledAt = formData.get("scheduledAt") as string;
  const type = (formData.get("type") as string) || "video";

  if (!patientId || !therapistId || !scheduledAt) {
    redirect("/appointments");
  }

  const assignment = await prisma.patientTherapistAssignment.findFirst({
    where: { patientId, therapistId, status: "active" },
  });

  if (!assignment) {
    redirect("/therapists?error=assign");
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

        await tx.appointment.create({
          data: {
            patientId,
            therapistId,
            scheduledAt: new Date(scheduledAt),
            durationMinutes: 45,
            status: "pending",
            type: type as "video" | "audio" | "text",
            webrtcRoomId: type !== "text" ? randomUUID() : null,
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

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  redirect("/appointments");
}

export async function cancelAppointmentAction(formData: FormData): Promise<void> {
  const appointmentId = Number(formData.get("appointmentId"));
  const patientId = Number(formData.get("patientId"));

  if (!appointmentId || !patientId) redirect("/appointments");

  await prisma.$transaction(async (tx) => {
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
    }
  });

  revalidatePath("/appointments");
  redirect("/appointments");
}

export async function confirmAppointmentAction(formData: FormData): Promise<void> {
  const appointmentId = Number(formData.get("appointmentId"));
  const therapistId = Number(formData.get("therapistId"));

  if (!appointmentId || !therapistId) redirect("/patients");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { type: true },
  });

  await prisma.appointment.updateMany({
    where: { id: appointmentId, therapistId },
    data: {
      status: "confirmed",
      // Les séances "messagerie" n'ont pas de salle WebRTC — seuls audio/vidéo en ont besoin.
      ...(appointment?.type !== "text" ? { webrtcRoomId: randomUUID() } : {}),
    },
  });

  revalidatePath("/patients");
  revalidatePath("/appointments");
  redirect("/patients");
}

export async function completeAppointmentAction(formData: FormData): Promise<void> {
  const appointmentId = Number(formData.get("appointmentId"));
  const userId = Number(formData.get("userId"));

  if (!appointmentId || !userId) redirect("/appointments");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { patientId: true, therapistId: true, status: true, type: true },
  });

  if (!appointment || (appointment.patientId !== userId && appointment.therapistId !== userId)) {
    redirect("/appointments");
  }

  // Une séance de messagerie n'est close que par le psychologue — le patient
  // ne peut pas y mettre fin de son côté (appels vidéo/audio : les deux le peuvent).
  if (appointment.type === "text" && appointment.therapistId !== userId) {
    redirect(`/appointments/${appointmentId}/chat`);
  }

  if (appointment.status === "completed") {
    revalidatePath("/appointments");
    revalidatePath("/patients");
    redirect("/appointments");
  }

  const therapistProfile = await prisma.therapistProfile.findUnique({
    where: { userId: appointment.therapistId },
    select: { hourlyRate: true },
  });

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "completed" },
    }),
    // Gain figé au tarif du thérapeute au moment de la séance.
    prisma.therapistEarning.create({
      data: {
        therapistId: appointment.therapistId,
        appointmentId,
        amount: therapistProfile?.hourlyRate ?? 0,
      },
    }),
  ]);

  revalidatePath("/appointments");
  revalidatePath("/patients");
  revalidatePath("/earnings");
  redirect("/appointments");
}
