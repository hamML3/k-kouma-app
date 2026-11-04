import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NotificationList } from "@/components/NotificationList";

export const metadata = { title: "Notifications — K-Kouma" };

export default async function AdminNotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-2xl">
      <NotificationList userId={Number(session.user.id)} />
    </div>
  );
}
