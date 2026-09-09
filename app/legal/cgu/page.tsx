import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = { title: "Conditions générales d'utilisation et de vente — K-Kouma" };

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

const PREAMBLE_BLOCKS: Block[] = [
  p(
    "Les présentes Conditions Générales d'Utilisation et de Vente, ci-après dénommées les « CGUV », régissent l'accès, l'utilisation et la souscription aux services proposés sur la plateforme numérique K-Kouma, accessible notamment à l'adresse k-kouma.com."
  ),
  p("La Plateforme a pour vocation de permettre aux utilisateurs, notamment :"),
  list([
    "de consulter les informations relatives aux services proposés ;",
    "de créer un espace personnel ;",
    "de prendre rendez-vous avec un professionnel compétent dans le domaine de la psychologie ;",
    "de solliciter une consultation médicale en présentiel ou, lorsque cette fonctionnalité est légalement et techniquement disponible, à distance ;",
    "de transmettre les informations nécessaires à la préparation de la consultation ;",
    "de régler en ligne le prix des prestations proposées.",
  ]),
  p(
    "Les présentes CGUV constituent un contrat entre l'Utilisateur et K-Kouma SARL, ci-après dénommée « l'Éditeur », « la Société » ou « la Plateforme »."
  ),
  p("L'utilisation de la Plateforme implique l'acceptation pleine, entière et sans réserve des présentes CGUV."),
  p(
    "La Plateforme accorde une importance particulière à la confidentialité des informations médicales et à la protection des données à caractère personnel."
  ),
  p(
    "Les traitements de données mis en œuvre dans le cadre des Services sont réalisés conformément aux lois et règlements applicables en République du Mali, notamment à la législation relative à la protection des données à caractère personnel et aux prescriptions applicables de l'Autorité de Protection des Données à Caractère Personnel."
  ),
];

const SECTIONS: Section[] = [
  {
    number: "1",
    title: "Identification de l'éditeur",
    blocks: [
      p("La Plateforme est éditée par :"),
      list([
        "Dénomination : K-Kouma",
        "Forme juridique : SARL",
        "Siège social : Bamako, Kalaban coura",
        "RCCM : ML_BKO_01_2026_B_4456",
        "NIF : 425590015010008L0005Y",
        "Téléphone : +223 92 84 02 30",
        "E-mail : contact@k-kouma.com",
        "Responsable de la protection des données / Point de contact : contact@k-kouma.com",
      ]),
    ],
  },
  {
    number: "2",
    title: "Définitions",
    blocks: [
      p("Au sens des présentes CGUV :"),
      list([
        "« Utilisateur » désigne toute personne qui accède ou utilise la Plateforme.",
        "« Patient » désigne toute personne physique bénéficiant ou souhaitant bénéficier d'une consultation.",
        "« Professionnel de santé » désigne tout médecin ou professionnel légalement habilité à intervenir dans le cadre des services proposés.",
        "« Psychologue » désigne le médecin ou professionnel compétent dans la spécialité de psychologie intervenant, le cas échéant, par l'intermédiaire de la Plateforme.",
        "« Consultation » désigne une prestation médicale ou spécialisée proposée dans le cadre des Services.",
        "« Téléconsultation » désigne une consultation réalisée à distance par un moyen de communication électronique sécurisé, lorsque cette modalité est disponible et juridiquement autorisée.",
        "« Plateforme » désigne l'ensemble des services numériques exploités sous la dénomination K-Kouma.",
        "« Compte » désigne l'espace personnel de l'Utilisateur.",
        "« Données personnelles » désigne toute information permettant d'identifier directement ou indirectement une personne.",
        "« Données de santé » désigne toute information relative à l'état de santé d'un Patient, notamment ses symptômes, antécédents, traitements, examens ou documents médicaux.",
      ]),
    ],
  },
  {
    number: "3",
    title: "Objet des services",
    blocks: [
      p("La Plateforme peut proposer notamment :"),
      list([
        "la prise de rendez-vous avec un psychologue ;",
        "la vente de consultations médicales ;",
        "la consultation en présentiel ;",
        "la consultation à distance lorsque celle-ci est proposée ;",
        "la gestion administrative des rendez-vous ;",
        "le paiement des prestations ;",
        "la transmission sécurisée d'informations nécessaires à la consultation ;",
        "l'accès à des informations générales relatives aux services.",
      ]),
      p(
        "La nature exacte de chaque prestation, son prix, ses conditions et ses éventuelles limitations sont communiqués à l'Utilisateur avant validation de sa commande."
      ),
    ],
  },
  {
    number: "4",
    title: "Acceptation des conditions",
    blocks: [
      p("L'Utilisateur reconnaît avoir pris connaissance des présentes CGUV avant toute utilisation des Services."),
      p("L'acceptation peut être matérialisée par :"),
      list([
        "une case à cocher ;",
        "un bouton de validation ;",
        "la création d'un Compte ;",
        "la réservation d'une consultation ;",
        "le paiement d'une prestation.",
      ]),
      p("Toute acceptation électronique régulièrement enregistrée constitue une preuve de l'acceptation des présentes conditions."),
    ],
  },
  {
    number: "5",
    title: "Conditions d'accès",
    blocks: [
      p("L'accès aux Services nécessite notamment :"),
      list([
        "un terminal compatible ;",
        "une connexion Internet ;",
        "une adresse électronique ou un numéro de téléphone valide lorsque cela est nécessaire.",
      ]),
      p("L'Utilisateur demeure responsable de ses équipements et de ses frais de connexion."),
      p("La Plateforme s'efforce d'assurer la disponibilité des Services mais ne garantit pas une disponibilité permanente ou ininterrompue."),
    ],
  },
  {
    number: "6",
    title: "Création et sécurité du compte",
    blocks: [
      p("Certaines fonctionnalités nécessitent la création d'un Compte."),
      p("L'Utilisateur s'engage à fournir des informations exactes, complètes et actualisées."),
      p("Il est interdit :"),
      list([
        "de créer un Compte sous une identité fictive ;",
        "d'utiliser l'identité d'un tiers ;",
        "de communiquer volontairement des informations trompeuses ;",
        "de permettre à un tiers non autorisé d'utiliser son Compte.",
      ]),
      p("L'Utilisateur est responsable de la confidentialité de ses identifiants."),
      p("Toute suspicion d'accès frauduleux doit être signalée sans délai à la Plateforme."),
    ],
  },
  {
    number: "7",
    title: "Prise de rendez-vous",
    blocks: [
      p("La réservation d'une consultation peut comporter les étapes suivantes :"),
      list([
        "sélection du service ;",
        "choix du professionnel lorsque cette possibilité est offerte ;",
        "sélection d'une date et d'un créneau ;",
        "renseignement des informations nécessaires ;",
        "affichage du prix ;",
        "validation de la commande ;",
        "paiement lorsque celui-ci est requis ;",
        "confirmation du rendez-vous.",
      ]),
      p(
        "La confirmation électronique adressée au Patient vaut prise en compte de la réservation, sous réserve de la disponibilité effective du Professionnel concerné."
      ),
    ],
  },
  {
    number: "8",
    title: "Prix",
    blocks: [
      p("Les prix sont indiqués en francs CFA, sauf indication contraire."),
      p("Avant toute validation définitive, l'Utilisateur est informé :"),
      list(["du prix de la consultation ;", "des éventuels frais supplémentaires ;", "des modalités de paiement."]),
      p("Le prix applicable est celui affiché au moment de la validation de la commande."),
      p("La Plateforme peut modifier ses tarifs pour les prestations futures sans affecter les prestations déjà valablement commandées."),
    ],
  },
  {
    number: "9",
    title: "Modalités de paiement",
    blocks: [
      p("Le paiement peut être effectué par les moyens proposés sur la Plateforme, notamment :"),
      list(["Mobile Money ;", "carte bancaire ;", "portefeuille électronique ;", "virement ;", "tout autre moyen de paiement sécurisé."]),
      p(
        "Lorsque le paiement est traité par un prestataire tiers, les données bancaires ou financières peuvent être collectées et traitées directement par ce prestataire conformément à ses propres règles de sécurité."
      ),
      p(
        "La Plateforme ne conserve pas les données bancaires au-delà de ce qui est strictement nécessaire à l'exécution de ses obligations, lorsque leur conservation est techniquement évitable."
      ),
    ],
  },
  {
    number: "10",
    title: "Annulation et report",
    blocks: [
      p("Le Patient peut solliciter l'annulation ou le report de son rendez-vous conformément aux modalités affichées lors de la réservation."),
      p("Sauf conditions particulières :"),
      list([
        "une demande de report doit être formulée au moins 24 à 48 heures avant le rendez-vous ;",
        "une annulation dans le délai applicable peut donner lieu à un report, un avoir ou un remboursement selon les conditions annoncées ;",
        "l'absence non justifiée du Patient peut entraîner la facturation de la prestation réservée ;",
        "en cas d'indisponibilité du Professionnel, la Plateforme peut proposer un report ou un remboursement.",
      ]),
      p("Aucune disposition du présent article ne prive l'Utilisateur des droits impératifs qui lui sont reconnus par la législation applicable."),
    ],
  },
  {
    number: "11",
    title: "Consultation médicale et limites du service",
    blocks: [
      p("Le Patient reconnaît qu'une consultation médicale, notamment à distance, présente des limites."),
      p("Le Professionnel de santé peut décider que :"),
      list([
        "les informations disponibles sont insuffisantes ;",
        "un examen clinique physique est nécessaire ;",
        "des examens complémentaires doivent être réalisés ;",
        "une consultation en présentiel est nécessaire ;",
        "une orientation vers une structure spécialisée est nécessaire.",
      ]),
      p("Le Patient accepte que le Professionnel conserve son indépendance dans son appréciation médicale."),
      p("La Plateforme ne garantit jamais :"),
      list([
        "un diagnostic déterminé ;",
        "une guérison ;",
        "un résultat médical particulier ;",
        "la délivrance systématique d'une ordonnance ;",
        "l'absence de nécessité d'une consultation physique.",
      ]),
    ],
  },
  {
    number: "12",
    title: "Absence de service d'urgence",
    blocks: [
      p("LA PLATEFORME N'EST PAS UN SERVICE D'URGENCE MÉDICALE."),
      p("Elle ne doit pas être utilisée lorsqu'une personne présente une situation susceptible de mettre immédiatement sa vie ou son intégrité en danger."),
      p(
        "En présence notamment d'une perte de connaissance, d'une crise convulsive grave ou prolongée, d'une paralysie soudaine, de troubles soudains de la parole, d'un mal de tête brutal et inhabituel, d'une confusion aiguë ou de tout autre symptôme grave, l'Utilisateur doit immédiatement contacter les services compétents ou se rendre dans un établissement de santé."
      ),
      p("La réservation d'une consultation sur la Plateforme ne constitue pas une prise en charge d'urgence."),
    ],
  },
  {
    number: "13",
    title: "Obligations du patient",
    blocks: [
      p("Le Patient s'engage à :"),
      list([
        "fournir des informations exactes ;",
        "communiquer loyalement les informations nécessaires à sa prise en charge ;",
        "signaler tout symptôme urgent ;",
        "respecter les rendez-vous ;",
        "respecter les Professionnels et le personnel ;",
        "ne pas utiliser la Plateforme à des fins frauduleuses ;",
        "ne pas enregistrer une consultation sans autorisation.",
      ]),
      p("Le Patient demeure responsable des conséquences résultant d'informations volontairement fausses ou volontairement dissimulées."),
    ],
  },
  {
    number: "14",
    title: "Confidentialité et secret",
    blocks: [
      p("Les informations communiquées dans le cadre d'une consultation présentent un caractère confidentiel."),
      p("L'accès aux données médicales est limité aux personnes dont l'intervention est nécessaire."),
      p("Les Professionnels de santé demeurent soumis aux obligations professionnelles et déontologiques qui leur sont applicables."),
    ],
  },
  {
    number: "15",
    title: "Responsabilité médicale",
    blocks: [
      p("Chaque Professionnel de santé demeure responsable de ses décisions et actes professionnels dans les conditions prévues par les textes applicables."),
      p("Lorsque la Plateforme agit comme intermédiaire technique ou administratif, elle ne se substitue pas au jugement médical du Professionnel."),
      p("Les informations générales publiées sur la Plateforme ne constituent pas un avis médical personnalisé."),
    ],
  },
  {
    number: "16",
    title: "Responsabilité technique de la plateforme",
    blocks: [
      p("La Plateforme met en œuvre des moyens raisonnables pour assurer le bon fonctionnement de ses Services."),
      p("Elle ne saurait toutefois être tenue responsable d'un dysfonctionnement résultant notamment :"),
      list([
        "d'une défaillance du réseau Internet ;",
        "d'une panne de l'équipement de l'Utilisateur ;",
        "d'un acte malveillant extérieur ;",
        "d'une utilisation non conforme ;",
        "d'un événement de force majeure.",
      ]),
      p("La Plateforme ne peut exclure sa responsabilité lorsqu'une telle exclusion serait interdite par la loi."),
    ],
  },
  {
    number: "17",
    title: "Données à caractère personnel",
    blocks: [
      p("La Plateforme collecte uniquement les données nécessaires à la fourniture de ses Services."),
      p("Ces données peuvent inclure :"),
      list([
        "identité ;",
        "coordonnées ;",
        "informations relatives au Compte ;",
        "informations relatives aux rendez-vous ;",
        "données de paiement ;",
        "données techniques ;",
        "données de santé nécessaires à la consultation.",
      ]),
      p("Les données sont traitées pour des finalités déterminées, explicites et légitimes."),
      p("Les données ne doivent pas être utilisées à des fins incompatibles avec celles pour lesquelles elles ont été collectées."),
    ],
  },
  {
    number: "18",
    title: "Données de santé",
    blocks: [
      p("Les données relatives à la santé bénéficient d'une protection renforcée."),
      p("La Plateforme s'engage notamment à mettre en œuvre :"),
      list([
        "une limitation des accès ;",
        "des habilitations individualisées ;",
        "des mesures de confidentialité ;",
        "une sécurisation des transmissions ;",
        "des procédures de sauvegarde ;",
        "des mesures de prévention contre les accès non autorisés ;",
        "des procédures de gestion des incidents.",
      ]),
      p("Les données de santé ne doivent pas être utilisées à des fins publicitaires ou commerciales incompatibles avec leur finalité médicale."),
    ],
  },
  {
    number: "19",
    title: "Droits des personnes",
    blocks: [
      p(
        "Toute personne concernée peut exercer les droits que lui reconnaît la législation applicable, notamment demander des informations relatives au traitement de ses données et solliciter, dans les conditions légales, l'accès ou la rectification de celles-ci."
      ),
      p("Les demandes peuvent être adressées à :"),
      list(["E-mail : contact@k-kouma.com", "Adresse : Bamako, Kalaban coura"]),
    ],
  },
  {
    number: "20",
    title: "Interdictions",
    blocks: [
      p("Il est interdit à l'Utilisateur de :"),
      list([
        "accéder aux données d'un autre utilisateur ;",
        "tenter de contourner les mesures de sécurité ;",
        "introduire un programme malveillant ;",
        "perturber volontairement les Services ;",
        "usurper l'identité d'une autre personne ;",
        "diffuser sans autorisation une consultation.",
      ]),
      p("Toute violation peut entraîner la suspension ou la suppression du Compte et, le cas échéant, l'engagement de poursuites."),
    ],
  },
  {
    number: "21",
    title: "Propriété intellectuelle",
    blocks: [
      p("Les contenus, logiciels, logos, marques, textes et éléments graphiques de la Plateforme sont protégés."),
      p("Toute reproduction ou exploitation non autorisée est interdite."),
    ],
  },
  {
    number: "22",
    title: "Suspension des services",
    blocks: [
      p("La Plateforme peut suspendre temporairement un accès notamment pour :"),
      list(["maintenance ;", "incident de sécurité ;", "violation des présentes CGUV ;", "nécessité légale ;", "prévention d'une fraude."]),
    ],
  },
  {
    number: "23",
    title: "Modification des conditions",
    blocks: [
      p("Les présentes CGUV peuvent être modifiées afin de tenir compte :"),
      list(["d'une évolution légale ;", "d'une évolution réglementaire ;", "d'une évolution technique ;", "d'une modification des Services."]),
      p("La version applicable est celle publiée sur la Plateforme à la date d'utilisation des Services, sous réserve des droits acquis."),
    ],
  },
  {
    number: "24",
    title: "Droit applicable",
    blocks: [p("Les présentes CGUV sont régies par le droit applicable en République du Mali.")],
  },
  {
    number: "25",
    title: "Règlement des litiges",
    blocks: [
      p("En cas de différend, les parties privilégient une tentative de règlement amiable."),
      p("À défaut d'accord, le litige pourra être porté devant les juridictions compétentes conformément aux règles applicables au Mali."),
    ],
  },
  {
    number: "26",
    title: "Contact",
    blocks: [
      p("Pour toute question : K-Kouma SARL"),
      list(["Adresse : Bamako, Kalaban coura", "Téléphone : +223 92 84 02 30", "E-mail : contact@k-kouma.com"]),
    ],
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
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--kk-green)" }} />
                {item}
              </li>
            ))}
          </ul>
        )
      )}
    </>
  );
}

export default function CguPage() {
  return (
    <>
      <PublicNav />
      <main style={{ background: "var(--kk-bg)" }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--kk-purple)" }}>
            Plateforme de consultations médicales en psychologie
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Conditions générales d&apos;utilisation et de vente
          </h1>
          <p className="text-sm mb-10" style={{ color: "var(--kk-muted)" }}>
            Version 1.0 — Date d&apos;entrée en vigueur : 07/09/2026
          </p>

          <div className="kk-card p-5 mb-10 space-y-3">
            <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              Préambule
            </h2>
            <Blocks blocks={PREAMBLE_BLOCKS} />
          </div>

          <div className="space-y-9">
            {SECTIONS.map((s) => (
              <div key={s.number}>
                <h2
                  className="text-base font-bold mb-2.5"
                  style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
                >
                  Article {s.number} — {s.title}
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
