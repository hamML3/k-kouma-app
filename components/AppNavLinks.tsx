'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string };

/** Un lien de nav est actif sur sa propre page et ses sous-pages (ex: /therapists/12). */
function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

/** Liens de section de l'espace connecté, avec l'onglet actif surligné — isolé dans un composant client pour usePathname. */
export function AppNavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
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
  );
}
