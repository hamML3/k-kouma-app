'use server'

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

async function ensureActiveSubscription(patientId: number) {
  const existing = await prisma.patientSubscription.findUnique({
    where: { patientId },
  });

  if (existing?.status === "active") {
    return existing;
  }

  const plan =
    (await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { id: "asc" },
    })) ??
    (await prisma.subscriptionPlan.create({
      data: {
        name: "Starter",
        price: 0,
        currency: "XOF",
        videoMinutesIncluded: 180,
        isActive: true,
      },
    }));

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (existing) {
    return prisma.patientSubscription.update({
      where: { patientId },
      data: {
        planId: plan.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        videoMinutesRemaining: plan.videoMinutesIncluded,
      },
    });
  }

  return prisma.patientSubscription.create({
    data: {
      patientId,
      planId: plan.id,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      videoMinutesRemaining: plan.videoMinutesIncluded,
    },
  });
}

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

  await ensureActiveSubscription(patientId);

  await prisma.appointment.create({
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

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  redirect("/appointments");
}

export async function cancelAppointmentAction(formData: FormData): Promise<void> {
  const appointmentId = Number(formData.get("appointmentId"));
  const patientId = Number(formData.get("patientId"));

  if (!appointmentId || !patientId) redirect("/appointments");

  await prisma.appointment.updateMany({
    where: { id: appointmentId, patientId, status: "pending" },
    data: { status: "canceled" },
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
    select: { patientId: true, therapistId: true, status: true },
  });

  if (!appointment || (appointment.patientId !== userId && appointment.therapistId !== userId)) {
    redirect("/appointments");
  }

  if (appointment.status === "completed") {
    revalidatePath("/appointments");
    revalidatePath("/patients");
    redirect("/appointments");
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "completed" },
  });

  revalidatePath("/appointments");
  revalidatePath("/patients");
  redirect("/appointments");
}
