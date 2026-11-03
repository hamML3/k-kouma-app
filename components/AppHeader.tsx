'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { signOutAction } from "@/lib/actions/auth";

type NavLink = { href: string; label: string };

const PATIENT_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/therapists", label: "Psychologues" },
  { href: "/appointments", label: "Rendez-vous" },
  { href: "/subscription", label: "Abonnement" },
  { href: "/quiz", label: "Quiz" },
  { href: "/blog", label: "Articles" },
];

const THERAPIST_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/patients", label: "Mes patients" },
  { href: "/appointments", label: "Rendez-vous" },
  { href: "/earnings", label: "Mes gains" },
  { href: "/blog", label: "Articles" },
  { href: "/profile", label: "Mon profil" },
];

/** Un lien de nav est actif sur sa propre page et ses sous-pages (ex: /therapists/12). */
function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

/**
 * Barre de navigation commune à toutes les pages de l'espace connecté
 * (patient et thérapeute). Logo + identité + déconnexion en haut,
 * liens des sections principales en dessous, avec l'onglet actif surligné.
 */
export function AppHeader({ role, displayName }: { role: string; displayName: string }) {
  const pathname = usePathname();
  const links = role === "therapist" ? THERAPIST_LINKS : PATIENT_LINKS;

  return (
    <header
      className="sticky top-0 z-20 px-5 pt-4 pb-2"
      style={{
        background: "rgba(246,242,234,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--kk-border)",
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Logo href="/dashboard" size={26} />
          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden sm:inline text-sm font-semibold truncate max-w-[160px]" style={{ color: "var(--kk-mid)" }}>
              {displayName}
            </span>
            <form action={signOutAction}>
              <button type="submit" className="text-sm font-semibold" style={{ color: "var(--kk-muted)" }}>
                Déconnexion
              </button>
            </form>
          </div>
        </div>

        <nav className="flex items-center gap-2 mt-3 -mx-1 px-1 pb-0.5 overflow-x-auto">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all"
                style={{
                  background: active ? "var(--kk-green)" : "transparent",
                  color: active ? "#fff" : "var(--kk-mid)",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
