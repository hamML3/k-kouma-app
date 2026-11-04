'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { isActive, type NavLink } from "@/components/AppNavLinks";
import { useModalBehavior } from "@/lib/useModalBehavior";

/** Menu de l'espace connecté sous 768px, même schéma que l'admin et le site public. */
export function AppMobileMenu({ links, footer }: { links: NavLink[]; footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useModalBehavior(open, setOpen);

  // Ferme le tiroir à chaque changement de page (ajustement pendant le rendu,
  // pas dans un effet, pour éviter un rendu en cascade).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        className="md:hidden w-10 h-10 -mr-2 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--kk-border)]"
        style={{ color: "var(--kk-dark)" }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <div
        className={`md:hidden fixed inset-0 z-[60] transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        inert={!open}
      >
        <div className="absolute inset-0" style={{ background: "rgba(44,52,46,0.45)" }} onClick={() => setOpen(false)} />
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`absolute right-0 top-0 h-full w-72 max-w-[85vw] flex flex-col py-6 px-5 overflow-y-auto outline-none transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ background: "#fff", boxShadow: "-12px 0 40px rgba(60,70,55,0.18)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <Logo size={24} />
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

          <nav className="flex-1 space-y-1">
            {links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className="block px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    color: active ? "#fff" : "var(--kk-mid)",
                    background: active ? "var(--kk-green)" : "transparent",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 mt-4" style={{ borderTop: "1px solid var(--kk-border)" }}>
            {footer}
          </div>
        </div>
      </div>
    </>
  );
}
