import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = { title: "Mentions légales — K-Kouma" };

type Block =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] };

type Section = {
  number: string;
  title: string;
  blocks: Block[];
};

function p(text: string): Block {
  return { type: "p", text };
}
function list(items: string[]): Block {
  return { type: "list", items };
}

const SECTIONS: Section[] = [
  {
    number: "1",
    title: "Éditeur du site",
    blocks: [
      p("Le présent site est édité par :"),
      list([
        "Dénomination : K-Kouma",
        "Forme juridique : SARL",
        "Siège social : Bamako, Kalaban coura",
        "RCCM : ML_BKO_01_2026_B_4456",
        "NIF : 425590015010008L0005Y",
        "Téléphone : +223 92 84 02 30",
        "E-mail : contact@k-kouma.com",
      ]),
      p("Directeur de publication :"),
      list(["Nom et prénom : Aicha Dicko", "Fonction : Responsable Marketing et Stratégie Digitale"]),
    ],
  },
  {
    number: "2",
    title: "Objet du site",
    blocks: [
      p("Le Site propose notamment des services liés :"),
      list([
        "à la prise de rendez-vous ;",
        "à la vente de consultations ;",
        "à la mise en relation avec des professionnels compétents ;",
        "aux services numériques relatifs à la psychologie.",
      ]),
      p("Le Site ne constitue pas un service d'urgence."),
    ],
  },
  {
    number: "3",
    title: "Hébergement",
    blocks: [
      p("Le Site est hébergé par :"),
      list(["Nom de l'hébergeur : OVH SAS", "Adresse : 2 rue Kellermann, 59100 Roubaix, France", "Site Internet : ovh.fr"]),
      p("L'hébergeur peut être amené à traiter des données techniques nécessaires au fonctionnement et à la sécurité du Site."),
    ],
  },
  {
    number: "4",
    title: "Contact",
    blocks: [
      p("Pour toute demande :"),
      list(["Téléphone : +223 92 84 02 30", "E-mail : contact@k-kouma.com", "Adresse : Bamako, Kalaban coura"]),
    ],
  },
  {
    number: "5",
    title: "Propriété intellectuelle",
    blocks: [
      p("L'ensemble du contenu du Site est protégé par les règles applicables relatives à la propriété intellectuelle."),
      p("Toute reproduction, modification ou diffusion non autorisée est interdite."),
    ],
  },
  {
    number: "6",
    title: "Responsabilité",
    blocks: [
      p("Les informations générales publiées sur le Site ont une vocation informative."),
      p("Elles ne remplacent pas une consultation médicale ou psychologique personnalisée."),
      p("L'Utilisateur est invité à consulter un professionnel compétent pour toute question relative à son état de santé."),
      p("En cas d'urgence, l'Utilisateur doit contacter les services compétents ou se rendre dans une structure de soins."),
    ],
  },
  {
    // Rendu à part ci-dessous : ce paragraphe contient un lien vers /legal/confidentialite.
    number: "7",
    title: "Données personnelles",
    blocks: [],
  },
  {
    number: "8",
    title: "Droit applicable",
    blocks: [p("Le Site et ses conditions d'utilisation sont soumis aux lois applicables en République du Mali.")],
  },
];

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) =>
        b.type === "p" ? (
          <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--kk-mid)" }}>
            {b.text}
          </p>
        ) : (
          <ul key={i} className="space-y-1.5">
            {b.items.map((item, j) => (
              <li key={j} className="text-sm flex items-start gap-2" style={{ color: "var(--kk-mid)" }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--kk-purple)" }} />
                {item}
              </li>
            ))}
          </ul>
        )
      )}
    </>
  );
}

export default function MentionsLegalesPage() {
  return (
    <>
      <PublicNav />
      <main style={{ background: "var(--kk-bg)" }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--kk-purple)" }}>
            K-Kouma
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-10"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Mentions légales
          </h1>

          <div className="space-y-9">
            {SECTIONS.map((s) => (
              <div key={s.number}>
                <h2
                  className="text-base font-bold mb-2.5"
                  style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
                >
                  {s.number}. {s.title}
                </h2>
                <div className="space-y-3">
                  {s.number === "7" ? (
                    <p className="text-sm leading-relaxed" style={{ color: "var(--kk-mid)" }}>
                      Le Site traite certaines données personnelles conformément à la{" "}
                      <Link href="/legal/confidentialite" className="underline font-semibold" style={{ color: "var(--kk-green)" }}>
                        Politique de confidentialité
                      </Link>{" "}
                      accessible sur la Plateforme. Les Utilisateurs peuvent exercer leurs droits auprès de :
                    </p>
                  ) : (
                    <Blocks blocks={s.blocks} />
                  )}
                  {s.number === "7" && (
                    <ul className="space-y-1.5">
                      <li className="text-sm flex items-start gap-2" style={{ color: "var(--kk-mid)" }}>
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--kk-purple)" }} />
                        E-mail : contact@k-kouma.com
                      </li>
                    </ul>
                  )}
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
