import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = { title: "FAQ — K-Kouma" };

const FAQ_GROUPS: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: "Découvrir K-Kouma",
    items: [
      {
        q: "Qu'est-ce que K-Kouma ?",
        a: "K-Kouma est une plateforme de téléconsultation psychologique, 100 % à distance, pensée pour l'Afrique de l'Ouest. Elle vous met en relation avec des psychologues qualifiés et vérifiés, par chat, audio ou vidéo.",
      },
      {
        q: "K-Kouma remplace-t-il un suivi médical ou un traitement ?",
        a: "Non. K-Kouma propose un accompagnement psychologique, pas un diagnostic médical ni la prescription de médicaments. En cas d'urgence ou de danger immédiat, contactez les secours (SAMU : 15, Police : 17).",
      },
      {
        q: "Comment choisit-on mon psychologue ?",
        a: "Après votre inscription, un court questionnaire (9 questions) nous permet de comprendre vos besoins — motif, langue, préférences — et de vous recommander les psychologues les plus adaptés, avec une explication de chaque recommandation.",
      },
    ],
  },
  {
    title: "Séances & abonnement",
    items: [
      {
        q: "Le chat compte-t-il comme une séance ?",
        a: "Oui. Chat, audio et vidéo sont trois formats équivalents : chacun consomme une séance de votre crédit, au même tarif. Le format ne change ni le prix ni la durée — seule la manière d'échanger avec votre psychologue change.",
      },
      {
        q: "Combien coûte une séance ?",
        a: "Le tarif dépend du type de thérapie (individuelle, couple, ou adolescent/enfant). Le détail est visible sur la page Tarifs. Un pack de 3 séances est proposé à prix réduit.",
      },
      {
        q: "Comment payer ?",
        a: "Le paiement se fait par Mobile Money (Orange Money, Wave et autres opérateurs) directement depuis votre espace personnel.",
      },
      {
        q: "Puis-je changer de psychologue en cours de route ?",
        a: "Oui, à tout moment depuis votre espace personnel, sans justification à fournir.",
      },
      {
        q: "Puis-je annuler un rendez-vous ?",
        a: "Oui, tant que le rendez-vous est encore « en attente » de confirmation par le psychologue. La séance vous est alors recréditée.",
      },
    ],
  },
  {
    title: "Confidentialité & sécurité",
    items: [
      {
        q: "Mes échanges sont-ils confidentiels ?",
        a: "Oui. Vos séances et vos messages sont couverts par le secret professionnel, comme dans un cabinet physique. Plus de détails sur notre page Sécurité & confidentialité.",
      },
      {
        q: "Les psychologues sont-ils vérifiés ?",
        a: "Oui. Chaque candidature est examinée par notre équipe : diplôme et pièce d'identité sont contrôlés avant qu'un psychologue puisse exercer sur la plateforme.",
      },
    ],
  },
  {
    title: "Aspects pratiques",
    items: [
      {
        q: "De quoi ai-je besoin pour une séance vidéo ou audio ?",
        a: "D'une connexion internet, d'un navigateur récent et de l'accès au micro (et à la caméra pour la vidéo). Aucune application à installer.",
      },
      {
        q: "Dans quelles langues puis-je consulter ?",
        a: "Selon les psychologues disponibles : français, bambara, peulh, malinké, soraï, entre autres. Vous indiquez votre préférence lors de l'inscription.",
      },
      {
        q: "K-Kouma est-il disponible en dehors du Mali ?",
        a: "K-Kouma se développe dans plusieurs pays d'Afrique de l'Ouest (Mali, Sénégal, Côte d'Ivoire, Bénin, Togo).",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <PublicNav />
      <main style={{ background: "var(--kk-bg)" }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-purple-text)" }}>
            Questions fréquentes
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="text-base leading-relaxed mb-12" style={{ color: "var(--kk-mid)" }}>
            Vous ne trouvez pas de réponse à votre question ?{" "}
            <Link href="/contact" className="font-bold" style={{ color: "var(--kk-purple-text)" }}>
              Contactez-nous
            </Link>
            .
          </p>

          <div className="space-y-10">
            {FAQ_GROUPS.map((group) => (
              <div key={group.title}>
                <h2
                  className="text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ color: "var(--kk-muted)" }}
                >
                  {group.title}
                </h2>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <details key={item.q} className="kk-card p-5 group">
                      <summary
                        className="font-bold text-sm cursor-pointer list-none flex items-center justify-between gap-3"
                        style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}
                      >
                        {item.q}
                        <span
                          className="shrink-0 text-lg leading-none transition-transform group-open:rotate-45"
                          style={{ color: "var(--kk-purple-text)" }}
                        >
                          +
                        </span>
                      </summary>
                      <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--kk-mid)" }}>
                        {item.a}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
