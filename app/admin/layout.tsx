import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOutAction } from "@/lib/actions/auth";

export const metadata = {
  title: "Administration — K-Kouma",
};

const NAV_LINKS = [
  {
    href: "/admin",
    label: "Tableau de bord",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <rect x="10" y="2" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <rect x="2" y="10" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <rect x="10" y="10" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: "/admin/therapists",
    label: "Psychologues",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

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
        <Link
          href="/admin"
          className="block mb-8 px-2"
        >
          <span
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            K-Kouma
          </span>
          <span
            className="block text-xs font-semibold mt-0.5"
            style={{ color: "var(--kk-purple)" }}
          >
            Administration
          </span>
        </Link>

        <nav className="flex-1 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ color: "var(--kk-mid)" }}
            >
              <span style={{ color: "var(--kk-muted)" }}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

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
