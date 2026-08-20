'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string; icon: React.ReactNode };

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
];

/** Nav de la sidebar admin, avec surlignage de la section active. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1">
      {NAV_LINKS.map((link) => {
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
