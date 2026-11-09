import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { subscribeToConversation } from "@/lib/chatBus";
import { loadConversation } from "@/lib/conversations";
import { eventStreamResponse } from "@/lib/sse";
import { viewerFromSession } from "@/lib/viewer";

export const dynamic = "force-dynamic";

// GET /api/conversations/[id]/stream : chaque nouveau message, en direct (Server-Sent Events).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = viewerFromSession(await auth());
  if (!viewer) return new Response("Non authentifié", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || !(await loadConversation(id, viewer))) return new Response("Accès refusé", { status: 403 });
  return eventStreamResponse(req.signal, (send) => subscribeToConversation(id, (message) => send("message", message)));
}
