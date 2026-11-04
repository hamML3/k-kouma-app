import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
