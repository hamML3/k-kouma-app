'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { hasPermission, type Permission } from "@/lib/permissions";
import { useModalBehavior } from "@/lib/useModalBehavior";

type NavLink = { href: string; label: string; icon: React.ReactNode; adminOnly?: boolean; requiresPermission?: Permission };

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
    href: "/admin/reports",
    label: "Signalements",
    // Contrairement aux autres sections, réservé aux modérateurs titulaires
    // de manage_reports — pas ouvert par défaut (voir lib/permissions.ts).
    requiresPermission: "manage_reports",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M4 2v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M4 2.8c2.3-1.1 4.6 1.1 6.9 0s2.9.7 4.1 1.5v5.7c-1.2-.8-1.8-1.5-4.1-.3s-4.6-1.1-6.9 0z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/admin/support",
    label: "Support",
    // Comme les signalements : les échanges avec le support peuvent être
    // sensibles, la lecture est réservée à manage_support.
    requiresPermission: "manage_support",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5v6a1.5 1.5 0 0 1-1.5 1.5H8l-3.5 3v-3H4.5A1.5 1.5 0 0 1 3 10.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/admin/reviews",
    label: "Avis",
    requiresPermission: "manage_reports",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2l2.2 4.5 4.8.7-3.5 3.4.8 4.9L9 13.2l-4.3 2.3.8-4.9L2 7.2l4.8-.7L9 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/admin/stats",
    label: "Statistiques",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M2.5 15.5h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="3.5" y="9.5" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
        <rect x="7.5" y="5.5" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.6" />
        <rect x="11.5" y="7.5" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.6" />
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
    href: "/admin/articles",
    label: "Articles",
    adminOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M4.5 2h9l1.5 1.5v11a1 1 0 01-1 1h-9a1 1 0 01-1-1V2.5a.5.5 0 01.5-.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M6 6.5h6M6 9.5h6M6 12.5h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/articles/proposer",
    label: "Proposer un article",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M11.5 2.5l4 4-8.5 8.5-4.5 1 1-4.5 8-8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
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

type AdminNavProps = {
  role: string;
  /** Permissions du compte modérateur (ignoré pour un admin, qui voit tout) — voir lib/permissions.ts. */
  permissions?: string[];
  /** Bloc "compte connecté + déconnexion", fourni par le layout (fermeture de session en Server Action). */
  footer: React.ReactNode;
  bell: React.ReactNode;
};

/**
 * Nav de la sidebar admin, avec surlignage de la section active.
 * Sidebar fixe sur grand écran ; tiroir plein écran (hamburger) sur mobile, pour que le
 * back-office reste utilisable dès 375px de large (une appli mobile dédiée est prévue plus tard).
 */
export function AdminNav({ role, permissions, footer, bell }: AdminNavProps) {
  const pathname = usePathname();
  const adminLabel = role === "moderator" ? "Administration (modérateur)" : "Administration";
  const [open, setOpen] = useState(false);
  const panelRef = useModalBehavior(open, setOpen);

  // Ferme le tiroir à chaque changement de page (ajustement pendant le rendu,
  // pas dans un effet, pour éviter un rendu en cascade).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const navLinks = (
    <nav className="flex-1 space-y-1">
      {NAV_LINKS.filter(
        (link) =>
          (!link.adminOnly || role === "admin") &&
          (!link.requiresPermission || hasPermission(role, permissions, link.requiresPermission))
      ).map((link) => {
        const active = link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
              active ? "" : "hover:bg-[var(--kk-border)] hover:translate-x-0.5"
            }`}
            style={{
              color: active ? "var(--kk-purple)" : "var(--kk-mid)",
              background: active ? "var(--kk-purple-light)" : "transparent",
            }}
          >
            {active && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
                style={{ background: "var(--kk-purple)" }}
              />
            )}
            <span style={{ color: active ? "var(--kk-purple)" : "var(--kk-muted)" }}>{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Barre mobile : logo + bouton hamburger */}
      <header
        className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-3"
        style={{ background: "#fff", borderBottom: "1px solid var(--kk-border)" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu d'administration"
          aria-expanded={open}
          className="w-10 h-10 -ml-1.5 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--kk-border)]"
          style={{ color: "var(--kk-dark)" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <Link href="/admin" className="flex items-center gap-2">
          <Logo size={22} />
        </Link>
        {bell}
      </header>

      {/* Tiroir mobile + fond assombri */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        inert={!open}
      >
        <div
          className="absolute inset-0"
          style={{ background: "rgba(44,52,46,0.45)" }}
          onClick={() => setOpen(false)}
        />
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Menu d'administration"
          className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] flex flex-col py-6 px-4 overflow-y-auto outline-none transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ background: "#fff", boxShadow: "12px 0 40px rgba(60,70,55,0.18)" }}
        >
          <div className="flex items-center justify-between mb-6 px-2">
            <Link href="/admin" className="flex items-center gap-2" onClick={() => setOpen(false)}>
              <Logo size={22} />
              <span className="text-xs font-semibold" style={{ color: "var(--kk-purple-text)" }}>
                {adminLabel}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--kk-border)]"
              style={{ color: "var(--kk-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {navLinks}
          {footer}
        </div>
      </div>

      {/* Sidebar fixe desktop */}
      <aside
        className="hidden lg:flex lg:flex-col w-60 py-6 px-4 shrink-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto"
        style={{
          background: "#fff",
          borderRight: "1px solid var(--kk-border)",
          boxShadow: "2px 0 12px rgba(60,70,55,0.04)",
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-8 px-2">
          <Link href="/admin" className="block">
            <Logo size={24} />
            <span className="block text-xs font-semibold mt-0.5" style={{ color: "var(--kk-purple-text)" }}>
              {adminLabel}
            </span>
          </Link>
          {bell}
        </div>

        {navLinks}
        {footer}
      </aside>
    </>
  );
}
