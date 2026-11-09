import Link from "next/link";
import { EMERGENCY_TEXT } from "@/lib/emergency";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = { title: "Sécurité & confidentialité — K-Kouma" };

const SECTIONS = [
  {
    title: "Confidentialité de vos échanges",
    body: [
      "Tout ce que vous partagez avec votre psychologue — pendant une séance vidéo, audio ou par messagerie — reste strictement confidentiel. Aucun contenu de vos consultations n'est communiqué à un tiers, y compris à un autre membre de l'équipe K-Kouma, sauf obligation légale (danger immédiat pour vous-même ou autrui).",
      "Les psychologues présents sur K-Kouma sont soumis au secret professionnel, comme dans un cabinet physique.",
    ],
  },
  {
    title: "Protection de vos données personnelles",
    body: [
      "Vos informations (identité, réponses au questionnaire d'admission, historique de séances, messages) sont stockées de façon sécurisée et ne sont accessibles qu'à vous-même et au psychologue qui vous accompagne.",
      "Nous ne vendons ni ne partageons vos données personnelles à des fins publicitaires ou commerciales.",
      "Vous pouvez à tout moment demander la suppression de votre compte et de vos données en nous contactant.",
    ],
  },
  {
    title: "Sécurité technique des consultations",
    body: [
      "Les appels vidéo et audio passent par une connexion chiffrée directe entre vous et votre psychologue.",
      "L'accès à votre compte est protégé par mot de passe. Nous vous recommandons de ne jamais partager vos identifiants et d'utiliser un mot de passe unique.",
      "Le site est accessible uniquement en connexion sécurisée (HTTPS).",
    ],
  },
  {
    title: "Signaler un problème",
    body: [
      "Si vous rencontrez un comportement inapproprié de la part d'un psychologue, ou toute autre situation qui vous met mal à l'aise, vous pouvez le signaler en toute confidentialité en nous contactant.",
      "Chaque signalement est examiné par notre équipe. Les psychologues de K-Kouma sont vérifiés avant d'être autorisés à exercer sur la plateforme (diplôme et pièce d'identité contrôlés).",
    ],
  },
  {
    title: "En cas d'urgence",
    body: [
      `K-Kouma est un espace de soutien psychologique, mais ne remplace pas un service d'urgence. Si vous ou un proche êtes en danger immédiat, appelez ${EMERGENCY_TEXT}, ou rendez-vous aux urgences les plus proches.`,
    ],
  },
];

export default function SecurityPage() {
  return (
    <>
      <PublicNav />
      <main style={{ background: "var(--kk-bg)" }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-green-text)" }}>
            Votre confiance, notre responsabilité
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Sécurité &amp; confidentialité
          </h1>
          <p className="text-base leading-relaxed mb-4" style={{ color: "var(--kk-mid)" }}>
            Parler de sa santé mentale demande de la confiance. Voici, en toute transparence, comment nous protégeons
            vos échanges et vos données sur K-Kouma.
          </p>
          <p className="text-sm leading-relaxed mb-12" style={{ color: "var(--kk-mid)" }}>
            Pour le détail juridique complet, consultez notre{" "}
            <Link href="/legal/confidentialite" className="underline font-semibold" style={{ color: "var(--kk-green-text)" }}>
              Politique de confidentialité et de protection des données
            </Link>
            .
          </p>

          <div className="space-y-8">
            {SECTIONS.map((s) => (
              <div key={s.title} className="kk-card p-6">
                <h2
                  className="text-lg font-bold mb-3"
                  style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
                >
                  {s.title}
                </h2>
                <div className="space-y-2">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--kk-mid)" }}>
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl p-6 mt-10 text-center"
            style={{ background: "var(--kk-purple-light)", border: "1px solid #C8BCEB" }}
          >
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--kk-dark)" }}>
              Une question sur la sécurité de vos données ou un problème à signaler ?
            </p>
            <Link href="/contact" className="kk-btn-purple inline-block px-6 py-2.5 text-sm">
              Nous contacter
            </Link>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
