import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AdminNav } from "@/components/AdminNav";
import { signOutAction } from "@/lib/actions/auth";

export const metadata = {
  title: "Administration — K-Kouma",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin" && session.user.role !== "moderator") redirect("/dashboard");

  return (
    <div className="flex min-h-screen" style={{ background: "var(--kk-bg)" }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex flex-col py-6 px-4 shrink-0"
        style={{
          background: "#fff",
          borderRight: "1px solid var(--kk-border)",
          boxShadow: "2px 0 12px rgba(60,70,55,0.04)",
        }}
      >
        <Link href="/admin" className="block mb-8 px-2">
          <Logo size={24} />
          <span
            className="block text-xs font-semibold mt-0.5"
            style={{ color: "var(--kk-purple)" }}
          >
            {session.user.role === "moderator" ? "Administration (modérateur)" : "Administration"}
          </span>
        </Link>

        <AdminNav role={session.user.role} />

        <div className="pt-4" style={{ borderTop: "1px solid var(--kk-border)" }}>
          <p className="text-xs px-3 mb-2 font-semibold truncate" style={{ color: "var(--kk-muted)" }}>
            {session.user.email}
          </p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg w-full"
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
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-8">{children}</main>
    </div>
  );
}
