import { auth } from "@/auth";
import { unreadNotificationCount } from "@/lib/notifications";
import { NotificationBellLink } from "./NotificationBellLink";

export async function NotificationBell({ href = "/notifications" }: { href?: string }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return <NotificationBellLink href={href} initialCount={await unreadNotificationCount(Number(session.user.id))} />;
}
