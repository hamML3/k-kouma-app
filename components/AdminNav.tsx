'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string; icon: React.ReactNode; adminOnly?: boolean };

const NAV_LINKS: NavLink[] = [
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
  {
    href: "/admin/users",
    label: "Utilisateurs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="6.5" cy="6" r="2.8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M1.5 16c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="13.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 9c2.2 0 4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/finances",
    label: "Finances",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2 8h14" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="6" cy="11" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/admin/audit",
    label: "Journal d'audit",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M5 2h6l3 3v11a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M6.5 8h5M6.5 11h5M6.5 14h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Réglages",
    adminOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 2.5v2M9 13.5v2M2.5 9h2M13.5 9h2M4.3 4.3l1.4 1.4M12.3 12.3l1.4 1.4M4.3 13.7l1.4-1.4M12.3 5.7l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

/** Nav de la sidebar admin, avec surlignage de la section active. */
export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1">
      {NAV_LINKS.filter((link) => !link.adminOnly || role === "admin").map((link) => {
        const active = link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              color: active ? "var(--kk-purple)" : "var(--kk-mid)",
              background: active ? "var(--kk-purple-light)" : "transparent",
            }}
          >
            <span style={{ color: active ? "var(--kk-purple)" : "var(--kk-muted)" }}>{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
