import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { subscribeToAppointment } from "@/lib/chatBus";

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

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // le contrôleur peut déjà être fermé si le client s'est déconnecté
        }
      };

      unsubscribe = subscribeToAppointment(id, (message) => send("message", message));

      // Ping régulier pour garder la connexion ouverte à travers les proxys/reverse-proxy.
      heartbeat = setInterval(() => send("ping", { t: Date.now() }), 25000);

      send("ready", {});
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  req.signal.addEventListener("abort", () => {
    unsubscribe?.();
    if (heartbeat) clearInterval(heartbeat);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
