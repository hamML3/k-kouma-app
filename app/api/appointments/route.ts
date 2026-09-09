import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAppointmentSchema } from "@/lib/validators/appointment";
import { randomUUID } from "crypto";

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

// POST : créer un rendez-vous (patient uniquement, crédit de séance requis)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "patient") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const patientId = Number(session.user.id);

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

  // Même verrou atomique que la réservation via l'interface web — un seul
  // crédit débité même en cas de requêtes concurrentes.
  const created = await prisma.$transaction(async (tx) => {
    const debited = await tx.patientProfile.updateMany({
      where: { userId: patientId, sessionCredits: { gt: 0 } },
      data: { sessionCredits: { decrement: 1 } },
    });
    if (debited.count === 0) return null;

    return tx.appointment.create({
      data: {
        patientId,
        therapistId,
        scheduledAt: new Date(scheduledAt),
        durationMinutes,
        type,
        webrtcRoomId: type !== "text" ? randomUUID() : null,
      },
    });
  });

  if (!created) {
    return NextResponse.json(
      { error: "Aucune séance disponible. Achetez un crédit de séance avant de réserver." },
      { status: 402 }
    );
  }

  return NextResponse.json({ appointment: created }, { status: 201 });
}
