import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { subscribeToRoom } from "@/lib/chatBus";
import { eventStreamResponse } from "@/lib/sse";
import { participantRole } from "@/lib/webrtcRoom";

export const dynamic = "force-dynamic";

// GET /api/webrtc/[roomId]/stream
// Prévient qu'un signal de l'autre participant est disponible. Le contenu se
// lit toujours sur /signal, qui garde l'ordre et sert de secours si le flux tombe.
export async function GET(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Non authentifié", { status: 401 });

  const { roomId } = await params;
  const role = await participantRole(roomId, Number(session.user.id));
  if (!role) return new Response("Accès refusé", { status: 403 });

  return eventStreamResponse(req.signal, (send) =>
    subscribeToRoom(roomId, (fromRole) => {
      if (fromRole !== role) send("signal", {});
    })
  );
}
