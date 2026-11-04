import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { NotificationBell } from "@/components/NotificationBell";
import { signOutAction } from "@/lib/actions/auth";

export const metadata = {
  title: "Administration — K-Kouma",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin" && session.user.role !== "moderator") redirect("/dashboard");

  const footer = (
    <div className="pt-4 mt-2" style={{ borderTop: "1px solid var(--kk-border)" }}>
      <p className="text-xs px-3 mb-2 font-semibold truncate" style={{ color: "var(--kk-muted)" }}>
        {session.user.email}
      </p>
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg w-full transition-colors hover:bg-[var(--kk-border)]"
          style={{ color: "var(--kk-muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 8h8M11 5l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 3H4a2 2 0 00-2 2v6a2 2 0 002 2h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Déconnexion
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AdminNav role={session.user.role} permissions={session.user.permissions} footer={footer} bell={<NotificationBell href="/admin/notifications" />} />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
