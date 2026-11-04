import Link from "next/link";
import { Logo } from "@/components/Logo";

const COUNTRIES = [
  { flag: "🇲🇱", name: "Mali" },
  { flag: "🇸🇳", name: "Sénégal" },
  { flag: "🇨🇮", name: "Côte d'Ivoire" },
  { flag: "🇧🇯", name: "Bénin" },
  { flag: "🇹🇬", name: "Togo" },
];

const LINK_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Plateforme",
    links: [
      { label: "À propos", href: "/a-propos" },
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Mentions légales", href: "/legal/mentions-legales" },
      { label: "Conditions d'utilisation", href: "/legal/cgu" },
      { label: "Confidentialité", href: "/legal/confidentialite" },
      { label: "Cookies", href: "/legal/cookies" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

// Réseaux sociaux — pas encore de comptes officiels renseignés : pointés vers
// /contact (destination réelle) plutôt que "#". À remplacer par les vraies
// URLs Facebook / Instagram / WhatsApp dès qu'elles existent.
const SOCIAL_ICONS = ["📘", "📸", "💬"];

/** Bandeau pays + pied de page du site public — repris sur toutes les pages hors espace connecté. */
export function PublicFooter() {
  return (
    <>
      <div className="py-4" style={{ background: "#E4EDDD", borderTop: "1px solid #C2D9BC" }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-center gap-2 flex-wrap">
          <p className="text-xs font-semibold mr-3" style={{ color: "#557B53" }}>
            Nous sommes présents en Afrique de l&apos;Ouest
          </p>
          {COUNTRIES.map((c) => (
            <span key={c.name} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#5C645B" }}>
              {c.flag} {c.name}
            </span>
          ))}
        </div>
      </div>

      <footer style={{ background: "#1F2E20" }}>
        <div className="max-w-6xl mx-auto px-6 py-12 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="mb-3">
              <Logo tone="white" size={28} />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#A8AEA1" }}>
              Votre bien-être mental, notre priorité. Plateforme de téléconsultation psychologique pour l&apos;Afrique de l&apos;Ouest.
            </p>
            <div className="flex gap-3 mt-4">
              {SOCIAL_ICONS.map((icon, i) => (
                <Link
                  key={i}
                  href="/contact"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  {icon}
                </Link>
              ))}
            </div>
          </div>

          {LINK_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#A8AEA1" }}>
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm transition-opacity hover:opacity-70" style={{ color: "#A8AEA1" }}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#A8AEA1" }}>
              Commencer
            </p>
            <Link
              href="/register"
              className="block w-full text-center text-sm font-bold py-3 rounded-full mb-3"
              style={{ background: "#557B53", color: "#fff" }}
            >
              S&apos;inscrire gratuitement
            </Link>
            <Link
              href="/login"
              className="block w-full text-center text-sm font-bold py-3 rounded-full"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
            >
              Se connecter
            </Link>
          </div>
        </div>

        <div
          className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-xs" style={{ color: "#A8AEA1" }}>
            © 2026 K-Kouma. Tous droits réservés.
          </p>
        </div>
      </footer>
    </>
  );
}
