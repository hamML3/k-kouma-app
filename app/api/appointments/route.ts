import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAppointmentSchema } from "@/lib/validators/appointment";
import { randomUUID } from "crypto";

async function ensureActiveSubscription(patientId: number) {
  const existing = await prisma.patientSubscription.findUnique({ where: { patientId } });

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

// GET : liste des rendez-vous du patient ou du thérapeute connecté
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const userId = Number(session.user.id);
  const isTherapist = session.user.role === "therapist";

  const appointments = await prisma.appointment.findMany({
    where: isTherapist ? { therapistId: userId } : { patientId: userId },
    include: {
      patient: { select: { patientProfile: { select: { nickname: true, avatarUrl: true } } } },
      therapist: { select: { therapistProfile: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json({ appointments });
}

// POST : créer un rendez-vous (patient uniquement, abonnement actif requis)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "patient") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const patientId = Number(session.user.id);

  await ensureActiveSubscription(patientId);

  const body = await req.json();
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { therapistId, scheduledAt, durationMinutes, type } = parsed.data;

  // Vérifier que ce thérapeute est bien attribué au patient
  const assignment = await prisma.patientTherapistAssignment.findFirst({
    where: { patientId, therapistId, status: "active" },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Ce thérapeute n'est pas votre thérapeute attitré" }, { status: 403 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      patientId,
      therapistId,
      scheduledAt: new Date(scheduledAt),
      durationMinutes,
      type,
      webrtcRoomId: type !== "text" ? randomUUID() : null,
    },
  });

  return NextResponse.json({ appointment }, { status: 201 });
}
