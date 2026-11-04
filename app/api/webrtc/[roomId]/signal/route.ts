import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// Le rôle de l'appelant dans cette salle se déduit du rendez-vous, jamais de la
// requête : un participant ne doit pas pouvoir se faire passer pour l'autre.
async function participantRole(roomId: string, userId: number): Promise<"patient" | "therapist" | null> {
  const appt = await prisma.appointment.findFirst({
    where: { webrtcRoomId: roomId },
    select: { patientId: true, therapistId: true },
  });
  if (appt?.patientId === userId) return "patient";
  if (appt?.therapistId === userId) return "therapist";
  return null;
}

// GET /api/webrtc/[roomId]/signal?after=ISO_timestamp
// Returns signals from the other participant, created after `after`
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { roomId } = await params;
  const userId = Number(session.user.id);

  const role = await participantRole(roomId, userId);
  if (!role) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const afterParam = req.nextUrl.searchParams.get("after");
  const after = afterParam ? new Date(afterParam) : new Date(0);

  const signals = await prisma.webrtcSignal.findMany({
    where: {
      roomId,
      fromRole: { not: role },
      createdAt: { gt: after },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { payload: true, createdAt: true, fromRole: true },
  });

  return NextResponse.json(signals);
}

// POST /api/webrtc/[roomId]/signal
// Body: { payload: object }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { roomId } = await params;
  const userId = Number(session.user.id);

  const role = await participantRole(roomId, userId);
  if (!role) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { payload } = await req.json() as { payload?: Prisma.InputJsonValue };

  if (!payload) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  await prisma.webrtcSignal.create({
    data: { roomId, fromRole: role, payload },
  });

  // Cleanup old signals for this room (keep last 200 to avoid DB bloat)
  const old = await prisma.webrtcSignal.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    skip: 200,
    select: { id: true },
  });
  if (old.length > 0) {
    await prisma.webrtcSignal.deleteMany({ where: { id: { in: old.map((s) => s.id) } } });
  }

  return NextResponse.json({ ok: true });
}
