import Link from "next/link";
import { Logo } from "./Logo";
import { signOutAction } from "@/lib/actions/auth";
import { AppMobileMenu } from "./AppMobileMenu";
import { AppNavLinks, type NavLink } from "./AppNavLinks";
import { NotificationBell } from "./NotificationBell";
import { PlatformBanner } from "./PlatformBanner";
import { getPlatformSettings } from "@/lib/platformSettings";

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
  { href: "/disponibilites", label: "Disponibilités" },
  { href: "/earnings", label: "Mes gains" },
  { href: "/blog", label: "Articles" },
  { href: "/profile", label: "Mon profil" },
];

/**
 * Barre de navigation commune à toutes les pages de l'espace connecté
 * (patient et thérapeute). Logo + identité + déconnexion en haut, liens des
 * sections principales en dessous, avec l'onglet actif surligné. Toutes les
 * pages qui l'utilisent passent par auth() (dynamiques), donc les réglages
 * plateforme lus ici (bannière/maintenance) sont toujours à jour.
 */
export async function AppHeader({ role, displayName }: { role: string; displayName: string }) {
  const links = role === "therapist" ? THERAPIST_LINKS : PATIENT_LINKS;
  const settings = await getPlatformSettings();

  const signOut = (
    <form action={signOutAction}>
      <button type="submit" className="text-sm font-semibold" style={{ color: "var(--kk-muted)" }}>
        Déconnexion
      </button>
    </form>
  );

  return (
    <>
      <PlatformBanner
        announcementActive={settings?.announcementActive ?? false}
        announcementText={settings?.announcementText ?? null}
        maintenanceModeEnabled={settings?.maintenanceModeEnabled ?? false}
      />
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
            <div className="flex items-center gap-1 md:gap-4 shrink-0">
              <NotificationBell />
              <Link
                href="/compte"
                className="hidden md:block text-sm font-semibold truncate max-w-[160px]"
                style={{ color: "var(--kk-mid)" }}
              >
                {displayName}
              </Link>
              <div className="hidden md:block">{signOut}</div>
              <AppMobileMenu
                links={links}
                footer={
                  <>
                    <p className="text-xs font-semibold truncate mb-2" style={{ color: "var(--kk-muted)" }}>
                      {displayName}
                    </p>
                    <Link href="/compte" className="block text-sm font-semibold mb-2" style={{ color: "var(--kk-muted)" }}>
                      Mon compte
                    </Link>
                    {signOut}
                  </>
                }
              />
            </div>
          </div>

          <div className="hidden md:block">
            <AppNavLinks links={links} />
          </div>
        </div>
      </header>
    </>
  );
}
