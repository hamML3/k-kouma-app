import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { subscribeToNotifications } from "@/lib/chatBus";
import { eventStreamResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

// GET /api/notifications/stream : les nouvelles notifications de l'utilisateur connecté, en direct.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Non authentifié", { status: 401 });
  const userId = Number(session.user.id);
  return eventStreamResponse(req.signal, (send) => subscribeToNotifications(userId, (n) => send("notification", n)));
}
