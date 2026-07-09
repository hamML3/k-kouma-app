import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Verify that the requesting user is a participant of this room
async function verifyParticipant(roomId: string, userId: number): Promise<boolean> {
  const appt = await prisma.appointment.findFirst({
    where: { webrtcRoomId: roomId },
    select: { patientId: true, therapistId: true },
  });
  if (!appt) return false;
  return appt.patientId === userId || appt.therapistId === userId;
}

// GET /api/webrtc/[roomId]/signal?excludeRole=X&after=ISO_timestamp
// Returns signals from the other role, created after `after`
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { roomId } = await params;
  const userId = Number(session.user.id);

  const ok = await verifyParticipant(roomId, userId);
  if (!ok) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const excludeRole = req.nextUrl.searchParams.get("excludeRole") ?? "";
  const afterParam = req.nextUrl.searchParams.get("after");
  const after = afterParam ? new Date(afterParam) : new Date(0);

  const signals = await prisma.webrtcSignal.findMany({
    where: {
      roomId,
      fromRole: { not: excludeRole },
      createdAt: { gt: after },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { payload: true, createdAt: true, fromRole: true },
  });

  return NextResponse.json(signals);
}

// POST /api/webrtc/[roomId]/signal
// Body: { fromRole: string, payload: object }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { roomId } = await params;
  const userId = Number(session.user.id);

  const ok = await verifyParticipant(roomId, userId);
  if (!ok) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json() as { fromRole?: string; payload?: unknown };
  const { fromRole, payload } = body;

  if (!fromRole || !payload) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  await prisma.webrtcSignal.create({
    data: { roomId, fromRole, payload },
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
