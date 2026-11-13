import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/notifications/recent[?after=<id>]
// Sans `after` : l'id de la dernière notification (point de départ des pop-ups).
// Avec : les notifications non lues arrivées depuis, relève de secours quand
// le flux en direct a été coupé (proxy, mise en veille du téléphone).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Non authentifié" }, { status: 401 });
  const userId = Number(session.user.id);

  const last = await prisma.notification.findFirst({ where: { userId }, orderBy: { id: "desc" }, select: { id: true } });
  const after = Number(req.nextUrl.searchParams.get("after"));
  const items =
    Number.isInteger(after) && after >= 0 && req.nextUrl.searchParams.has("after")
      ? await prisma.notification.findMany({
          where: { userId, id: { gt: after }, readAt: null },
          orderBy: { id: "asc" },
          take: 5,
          select: { id: true, title: true, body: true, link: true, createdAt: true },
        })
      : [];
  return Response.json({ lastId: last?.id ?? 0, items });
}
