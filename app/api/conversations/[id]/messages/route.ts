import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { listMessages, loadConversation, markRead, sendConversationMessage } from "@/lib/conversations";
import { viewerFromSession } from "@/lib/viewer";

// GET /api/conversations/[id]/messages?after=ISO : messages plus récents que `after`
// (relève de secours quand le flux en direct est coupé). Marque la conversation lue.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = viewerFromSession(await auth());
  if (!viewer) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const id = Number((await params).id);
  const loaded = Number.isInteger(id) ? await loadConversation(id, viewer) : null;
  if (!loaded) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const afterParam = req.nextUrl.searchParams.get("after");
  const after = afterParam ? new Date(afterParam) : undefined;
  const messages = await listMessages(id, after && !isNaN(after.getTime()) ? after : undefined);
  if (messages.length > 0) await markRead(id, loaded.side);
  return NextResponse.json(messages);
}

// POST /api/conversations/[id]/messages  { body }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = viewerFromSession(await auth());
  if (!viewer) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const payload = (await req.json().catch(() => ({}))) as { body?: unknown };
  const result = await sendConversationMessage(id, viewer, payload.body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.message);
}
