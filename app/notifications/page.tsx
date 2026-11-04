import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { NotificationList } from "@/components/NotificationList";

export const metadata = { title: "Notifications — K-Kouma" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "admin" || session.user.role === "moderator") redirect("/admin/notifications");

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role={session.user.role} displayName={session.user.name ?? session.user.email ?? ""} />
      <main className="max-w-2xl mx-auto px-5 py-8">
        <NotificationList userId={Number(session.user.id)} />
      </main>
    </div>
  );
}
