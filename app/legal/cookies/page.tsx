import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = { title: "Politique de gestion des cookies — K-Kouma" };

type Block =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "sub"; text: string };

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
function sub(text: string): Block {
  return { type: "sub", text };
}

const SECTIONS: Section[] = [
  {
    number: "1",
    title: "Objet",
    blocks: [p("La présente Politique explique comment K-Kouma (k-kouma.com) utilise des cookies et technologies similaires.")],
  },
  {
    number: "2",
    title: "Qu'est-ce qu'un cookie ?",
    blocks: [
      p("Un cookie est un petit fichier enregistré sur le terminal de l'Utilisateur lors de la navigation."),
      p("Il peut permettre notamment :"),
      list([
        "d'assurer le fonctionnement du Site ;",
        "de sécuriser une session ;",
        "de mémoriser certaines préférences ;",
        "de mesurer l'utilisation du Site.",
      ]),
    ],
  },
  {
    number: "3",
    title: "Catégories de cookies",
    blocks: [
      sub("Cookies strictement nécessaires"),
      p("Ils permettent notamment :"),
      list(["la connexion ;", "la sécurité ;", "la gestion de session ;", "le bon fonctionnement des fonctionnalités essentielles."]),
      sub("Cookies de préférence"),
      p("Ils permettent de mémoriser certains choix de navigation."),
      sub("Cookies de mesure d'audience"),
      p("Ils permettent de mieux comprendre l'utilisation du Site et d'améliorer son fonctionnement."),
      sub("Cookies tiers"),
      p("Certains services externes peuvent déposer leurs propres cookies conformément à leurs conditions."),
    ],
  },
  {
    number: "4",
    title: "Données médicales et cookies",
    blocks: [
      p("La Plateforme s'interdit d'utiliser des cookies à des fins de publicité ciblée fondée sur les informations médicales ou l'état de santé d'un Utilisateur."),
      p("Les données relatives aux symptômes, consultations ou documents médicaux ne doivent pas être exploitées à des fins publicitaires."),
    ],
  },
  {
    number: "5",
    title: "Consentement",
    blocks: [
      p("Lorsque la réglementation applicable l'exige, le consentement de l'Utilisateur est recueilli avant le dépôt de cookies non essentiels."),
      p("L'Utilisateur peut accepter, refuser ou modifier ses choix à tout moment."),
    ],
  },
  {
    number: "6",
    title: "Durée",
    blocks: [p("Les cookies sont conservés pour une durée limitée et proportionnée à leur finalité.")],
  },
  {
    number: "7",
    title: "Gestion des cookies",
    blocks: [
      p("L'Utilisateur peut gérer ses préférences :"),
      list(["via le module de gestion des cookies du Site ;", "via les paramètres de son navigateur."]),
    ],
  },
  {
    number: "8",
    title: "Contact",
    blocks: [p("Toute question peut être adressée à : K-Kouma SARL"), list(["E-mail : contact@k-kouma.com"])],
  },
];

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "p") {
          return (
            <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--kk-mid)" }}>
              {b.text}
            </p>
          );
        }
        if (b.type === "sub") {
          return (
            <p key={i} className="text-sm font-bold pt-1" style={{ color: "var(--kk-dark)" }}>
              {b.text}
            </p>
          );
        }
        return (
          <ul key={i} className="space-y-1.5">
            {b.items.map((item, j) => (
              <li key={j} className="text-sm flex items-start gap-2" style={{ color: "var(--kk-mid)" }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--kk-purple)" }} />
                {item}
              </li>
            ))}
          </ul>
        );
      })}
    </>
  );
}

export default function CookiesPage() {
  return (
    <>
      <PublicNav />
      <main style={{ background: "var(--kk-bg)" }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--kk-purple-text)" }}>
            K-Kouma
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-10"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Politique de gestion des cookies
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
                  <Blocks blocks={s.blocks} />
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
