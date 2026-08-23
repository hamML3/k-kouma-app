import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function getParticipantAppointment(appointmentId: number, userId: number) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, patientId: true, therapistId: true, type: true },
  });
  if (!appt) return null;
  if (appt.patientId !== userId && appt.therapistId !== userId) return null;
  return appt;
}

// GET /api/messages/[appointmentId]?after=ISO_timestamp
// Renvoie les messages créés après `after`, triés par date croissante.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { appointmentId } = await params;
  const id = Number(appointmentId);
  const userId = Number(session.user.id);

  const appt = await getParticipantAppointment(id, userId);
  if (!appt) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const afterParam = req.nextUrl.searchParams.get("after");
  const after = afterParam ? new Date(afterParam) : new Date(0);

  const messages = await prisma.message.findMany({
    where: { appointmentId: id, createdAt: { gt: after } },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, senderId: true, body: true, createdAt: true },
  });

  return NextResponse.json(messages);
}

// POST /api/messages/[appointmentId]
// Body: { body: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { appointmentId } = await params;
  const id = Number(appointmentId);
  const userId = Number(session.user.id);

  const appt = await getParticipantAppointment(id, userId);
  if (!appt) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  if (appt.type !== "text") {
    return NextResponse.json({ error: "Cette séance n'est pas une séance de messagerie" }, { status: 400 });
  }

  const { body } = (await req.json()) as { body?: string };
  const trimmed = body?.trim();
  if (!trimmed) return NextResponse.json({ error: "Message vide" }, { status: 400 });
  if (trimmed.length > 4000) {
    return NextResponse.json({ error: "Message trop long (4000 caractères max)" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: { appointmentId: id, senderId: userId, body: trimmed },
    select: { id: true, senderId: true, body: true, createdAt: true },
  });

  return NextResponse.json(message);
}
