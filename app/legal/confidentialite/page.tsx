import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = { title: "Politique de confidentialité — K-Kouma" };

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
    title: "Notre engagement",
    blocks: [
      p("La protection de la vie privée et la confidentialité des informations médicales constituent une priorité pour K-Kouma SARL."),
      p("La présente Politique explique :"),
      list([
        "quelles données sont collectées ;",
        "pourquoi elles sont collectées ;",
        "comment elles sont utilisées ;",
        "qui peut y accéder ;",
        "combien de temps elles sont conservées ;",
        "quelles mesures sont prises pour les protéger ;",
        "comment exercer ses droits.",
      ]),
    ],
  },
  {
    number: "2",
    title: "Responsable du traitement",
    blocks: [
      p("Le responsable du traitement est :"),
      p("K-Kouma SARL"),
      list([
        "Adresse : Bamako, Kalaban coura",
        "E-mail : contact@k-kouma.com",
        "Téléphone : +223 92 84 02 30",
        "RCCM : ML_BKO_01_2026_B_4456",
        "NIF : 425590015010008L0005Y",
        "Site web : k-kouma.com",
      ]),
      p("Contact protection des données : Responsable Protection des Données"),
      list(["E-mail : contact@k-kouma.com"]),
    ],
  },
  {
    number: "3",
    title: "Données collectées",
    blocks: [
      p("Selon les Services utilisés, nous pouvons collecter :"),
      sub("A. Données d'identification"),
      list(["nom ;", "prénom ;", "date de naissance ;", "sexe ;", "numéro de téléphone ;", "adresse électronique ;", "adresse lorsque nécessaire."]),
      sub("B. Données relatives au Compte"),
      list(["identifiant ;", "informations de connexion ;", "historique technique ;", "préférences."]),
      sub("C. Données relatives aux rendez-vous"),
      list(["date ;", "heure ;", "service réservé ;", "professionnel concerné ;", "historique des réservations."]),
      sub("D. Données financières"),
      p("Les informations nécessaires au paiement peuvent être traitées par les prestataires de paiement."),
      p("La Plateforme limite autant que possible l'accès direct aux données financières sensibles."),
      sub("E. Données de santé"),
      p("Lorsque cela est nécessaire au Service demandé :"),
      list(["symptômes ;", "antécédents ;", "traitements ;", "allergies communiquées ;", "résultats d'examens ;", "documents médicaux ;", "informations nécessaires à l'évaluation médicale."]),
    ],
  },
  {
    number: "4",
    title: "Finalités",
    blocks: [
      p("Les données sont utilisées pour :"),
      list([
        "créer et gérer les Comptes ;",
        "identifier les Patients ;",
        "organiser les rendez-vous ;",
        "permettre la consultation ;",
        "assurer la communication avec le Patient ;",
        "gérer les paiements ;",
        "assurer la sécurité ;",
        "prévenir les fraudes ;",
        "répondre aux demandes ;",
        "respecter les obligations légales ;",
        "améliorer les Services dans le respect des droits des personnes.",
      ]),
      p(
        "Les données de santé ne sont pas utilisées pour réaliser un profil commercial du Patient ou lui adresser une publicité ciblée fondée sur son état de santé."
      ),
    ],
  },
  {
    number: "5",
    title: "Principes de traitement",
    blocks: [
      p("La Plateforme s'engage à ce que les données soient :"),
      list([
        "collectées loyalement ;",
        "traitées licitement ;",
        "utilisées pour des finalités déterminées ;",
        "adéquates et proportionnées ;",
        "exactes et mises à jour ;",
        "conservées pendant une durée justifiée ;",
        "protégées par des mesures de sécurité appropriées.",
      ]),
    ],
  },
  {
    number: "6",
    title: "Données de santé",
    blocks: [
      p("Les données de santé font l'objet d'une protection renforcée."),
      p("L'accès est limité aux personnes habilitées et uniquement lorsque cet accès est nécessaire."),
      p("La communication de données médicales à des tiers non autorisés est interdite."),
    ],
  },
  {
    number: "7",
    title: "Destinataires",
    blocks: [
      p("Les données peuvent être accessibles :"),
      list([
        "aux psychologues et professionnels concernés ;",
        "aux personnels administratifs habilités ;",
        "aux prestataires techniques nécessaires au fonctionnement du Site ;",
        "aux prestataires de paiement ;",
        "aux autorités légalement habilitées.",
      ]),
      p("Tous les destinataires sont soumis à des obligations appropriées de confidentialité et de sécurité."),
    ],
  },
  {
    number: "8",
    title: "Hébergement et sous-traitance",
    blocks: [
      p("La Plateforme peut recourir à des prestataires pour :"),
      list(["l'hébergement ;", "la maintenance ;", "la sécurité ;", "la messagerie ;", "la visioconférence ;", "le paiement."]),
      p("Avant tout recours à un prestataire susceptible d'accéder à des données personnelles, la Plateforme veille à mettre en place des garanties contractuelles appropriées."),
    ],
  },
  {
    number: "9",
    title: "Transferts de données",
    blocks: [
      p("Lorsque des données sont susceptibles d'être transférées ou accessibles depuis l'extérieur du Mali, la Plateforme veille au respect des formalités et garanties exigées par la réglementation applicable."),
      p("Aucun transfert ne doit être effectué en contradiction avec les exigences applicables de protection des données."),
    ],
  },
  {
    number: "10",
    title: "Durée de conservation",
    blocks: [
      p("Les données sont conservées uniquement pendant la durée nécessaire à leur finalité."),
      p("Les durées peuvent varier selon :"),
      list(["la nature de la prestation ;", "les obligations professionnelles ;", "les obligations légales ;", "les exigences comptables ;", "les nécessités probatoires."]),
      p("À l'issue de la durée applicable, les données sont supprimées, anonymisées ou archivées conformément aux règles applicables."),
    ],
  },
  {
    number: "11",
    title: "Sécurité",
    blocks: [
      p("La Plateforme met en œuvre notamment :"),
      list([
        "contrôle des accès ;",
        "authentification ;",
        "gestion des habilitations ;",
        "sécurisation des communications ;",
        "sauvegardes ;",
        "limitation des accès aux données sensibles ;",
        "surveillance des incidents ;",
        "sensibilisation des personnes habilitées.",
      ]),
      p("Aucune mesure technique ne pouvant garantir un risque nul, la Plateforme s'engage néanmoins à mettre en œuvre des mesures adaptées au niveau de sensibilité des informations traitées."),
    ],
  },
  {
    number: "12",
    title: "Vos droits",
    blocks: [
      p("Toute personne peut exercer les droits reconnus par la réglementation applicable, notamment :"),
      list([
        "obtenir des informations sur le traitement ;",
        "demander l'accès à certaines données ;",
        "demander la correction de données inexactes ;",
        "s'opposer à certains traitements lorsque la loi le permet ;",
        "saisir l'autorité compétente.",
      ]),
      p("Toute demande doit être adressée à :"),
      list(["E-mail : contact@k-kouma.com"]),
    ],
  },
  {
    number: "13",
    title: "Violation ou incident de sécurité",
    blocks: [
      p("En cas d'incident susceptible d'affecter la confidentialité, l'intégrité ou la disponibilité des données, la Plateforme met en œuvre les mesures nécessaires afin :"),
      list(["d'identifier l'incident ;", "de limiter ses conséquences ;", "de sécuriser les systèmes ;", "d'évaluer les obligations d'information ou de notification applicables."]),
    ],
  },
  {
    number: "14",
    title: "Mineurs et personnes représentées",
    blocks: [
      p("Lorsqu'un Service concerne un mineur ou une personne juridiquement représentée, les informations nécessaires doivent être fournies par le représentant légal ou toute personne habilitée conformément aux règles applicables."),
    ],
  },
  {
    number: "15",
    title: "Modification de la politique",
    blocks: [
      p("La présente Politique peut évoluer en fonction des modifications légales, réglementaires ou techniques."),
      p("La version applicable est celle publiée sur la Plateforme."),
    ],
  },
  {
    number: "16",
    title: "Contact",
    blocks: [
      p("Pour toute question relative à vos données : K-Kouma SARL"),
      list(["E-mail : contact@k-kouma.com", "Téléphone : +223 92 84 02 30", "Adresse : Bamako, Kalaban coura"]),
    ],
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

export default function ConfidentialitePage() {
  return (
    <>
      <PublicNav />
      <main style={{ background: "var(--kk-bg)" }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--kk-purple)" }}>
            K-Kouma
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Politique de confidentialité et de protection des données à caractère personnel
          </h1>
          <p className="text-sm mb-4" style={{ color: "var(--kk-muted)" }}>
            Version 1.0 — Date d&apos;entrée en vigueur : 07/09/2026
          </p>
          <p className="text-sm leading-relaxed mb-10" style={{ color: "var(--kk-mid)" }}>
            Pour une présentation plus accessible de nos engagements au quotidien, consultez aussi notre page{" "}
            <Link href="/security" className="underline font-semibold" style={{ color: "var(--kk-green)" }}>
              Sécurité &amp; confidentialité
            </Link>
            .
          </p>

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
