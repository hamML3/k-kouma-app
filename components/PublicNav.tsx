import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PlatformBannerLive } from "@/components/PlatformBannerLive";
import { PublicMobileMenu } from "@/components/PublicMobileMenu";

const NAV_ITEMS = [
  { label: "Accueil", href: "/" },
  { label: "À propos", href: "/a-propos" },
  { label: "Psychologues", href: "/therapists" },
  { label: "Tarifs", href: "/#tarifs" },
  { label: "Quiz", href: "/quiz" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
];

/** Barre de navigation du site public — reprise sur toutes les pages hors espace connecté. */
export function PublicNav() {
  return (
    <>
      <PlatformBannerLive />
      <header
        className="sticky top-0 z-50 w-full"
        style={{ background: "rgba(246,242,234,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #EDE8DC" }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Logo size={30} />
            <p className="text-[10px] leading-tight hidden sm:block" style={{ color: "var(--kk-muted)" }}>
              Votre bien-être,
              <br />
              notre mission
            </p>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-semibold transition-colors hover:opacity-70"
                style={{ color: "#5C645B" }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile : un seul bouton d'entrée, la page de connexion propose ensuite l'inscription */}
            <Link
              href="/login"
              className="sm:hidden text-sm font-bold px-5 py-2 rounded-full"
              style={{ background: "var(--kk-purple)", color: "#fff" }}
            >
              Commencer
            </Link>
            <Link
              href="/login"
              className="hidden sm:block text-sm font-bold px-4 py-2 rounded-full border transition-all"
              style={{ borderColor: "#557B53", color: "#557B53" }}
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="hidden sm:block text-sm font-bold px-5 py-2 rounded-full"
              style={{ background: "var(--kk-purple)", color: "#fff" }}
            >
              S&apos;inscrire
            </Link>
            <PublicMobileMenu items={NAV_ITEMS} />
          </div>
        </div>
      </header>
    </>
  );
}
