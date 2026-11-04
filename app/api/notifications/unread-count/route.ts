import { auth } from "@/auth";
import { unreadNotificationCount } from "@/lib/notifications";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Non authentifié" }, { status: 401 });
  return Response.json({ count: await unreadNotificationCount(Number(session.user.id)) });
}
