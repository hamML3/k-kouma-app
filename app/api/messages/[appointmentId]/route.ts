import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { publishMessage } from "@/lib/chatBus";
import { sendNewMessageEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

async function getParticipantAppointment(appointmentId: number, userId: number) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, patientId: true, therapistId: true, type: true },
  });
  if (!appt) return null;
  if (appt.patientId !== userId && appt.therapistId !== userId) return null;
  return appt;
}

/** Best-effort, hors du chemin critique — ne bloque jamais l'envoi du message côté chat. */
function notifyNewMessage(appointmentId: number, senderId: number, recipientId: number) {
  (async () => {
    try {
      const [recipient, sender] = await Promise.all([
        prisma.user.findUnique({
          where: { id: recipientId },
          select: {
            email: true,
            patientProfile: { select: { nickname: true } },
            therapistProfile: { select: { firstName: true } },
          },
        }),
        prisma.user.findUnique({
          where: { id: senderId },
          select: {
            patientProfile: { select: { nickname: true } },
            therapistProfile: { select: { firstName: true } },
          },
        }),
      ]);
      if (!recipient) return;
      const recipientName = recipient.patientProfile?.nickname ?? recipient.therapistProfile?.firstName ?? "Bonjour";
      const senderName = sender?.patientProfile?.nickname ?? sender?.therapistProfile?.firstName ?? "Un utilisateur";
      await createNotification({
        userId: recipientId,
        type: "message.new",
        title: `Nouveau message de ${senderName}`,
        link: `/appointments/${appointmentId}/chat`,
        dedupeUnread: true,
      });
      const url = recipient.therapistProfile
        ? `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/patients`
        : `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/appointments/${appointmentId}/chat`;
      await sendNewMessageEmail(recipient.email, recipientName, senderName, url);
    } catch (err) {
      console.error("[notify:new_message] envoi échoué:", err);
    }
  })();
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

  publishMessage(id, { ...message, createdAt: message.createdAt.toISOString() });

  const recipientId = appt.patientId === userId ? appt.therapistId : appt.patientId;
  notifyNewMessage(id, userId, recipientId);

  return NextResponse.json(message);
}
