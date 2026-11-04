import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { subscribeToAppointment } from "@/lib/chatBus";
import { eventStreamResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

// GET /api/messages/[appointmentId]/stream
// Flux Server-Sent Events : pousse chaque nouveau message en direct.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const session = await auth();
  if (!session?.user) return new Response("Non authentifié", { status: 401 });

  const { appointmentId } = await params;
  const id = Number(appointmentId);
  const userId = Number(session.user.id);

  const appt = await prisma.appointment.findUnique({
    where: { id },
    select: { patientId: true, therapistId: true },
  });
  if (!appt || (appt.patientId !== userId && appt.therapistId !== userId)) {
    return new Response("Accès refusé", { status: 403 });
  }

  return eventStreamResponse(req.signal, (send) => subscribeToAppointment(id, (message) => send("message", message)));
}
