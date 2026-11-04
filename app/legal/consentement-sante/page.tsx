import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = { title: "Consentement au traitement des données de santé — K-Kouma" };

const DATA_TYPES = [
  "mes symptômes ;",
  "mes antécédents ;",
  "mes traitements ;",
  "mes résultats d'examens ;",
  "les documents médicaux que je transmets volontairement ;",
  "toute information nécessaire à la consultation demandée.",
];

const ACKNOWLEDGEMENTS = [
  "sont utilisées dans la mesure nécessaire à l'organisation et à la réalisation du service demandé ;",
  "sont accessibles uniquement aux personnes habilitées ;",
  "font l'objet de mesures de confidentialité et de sécurité appropriées ;",
  "ne doivent pas être utilisées à des fins publicitaires fondées sur mon état de santé ;",
  "sont conservées conformément aux obligations applicables.",
];

const CHECKBOXES = [
  "J'ai lu la Politique de confidentialité.",
  "J'ai compris que certaines données relatives à ma santé peuvent être nécessaires à la réalisation de la consultation demandée.",
  "Lorsque mon consentement est requis, je consens de manière libre, spécifique, éclairée et non équivoque au traitement des données nécessaires à la fourniture du Service demandé.",
  "Je confirme que les informations communiquées sont exactes à ma connaissance.",
  "Je comprends que la Plateforme n'est pas un service d'urgence médicale.",
];

function Dot() {
  return <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--kk-purple)" }} />;
}

export default function ConsentementSantePage() {
  return (
    <>
      <PublicNav />
      <main style={{ background: "var(--kk-bg)" }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--kk-purple-text)" }}>
            K-Kouma (k-kouma.com)
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Consentement au traitement des données relatives à la santé
          </h1>
          <p className="text-sm leading-relaxed mb-10" style={{ color: "var(--kk-mid)" }}>
            Ce document explique le contenu du consentement demandé à chaque patient lors de la création de son
            compte, avant toute demande de consultation. Pour le cadre général du traitement de vos données,
            consultez aussi notre{" "}
            <Link href="/legal/confidentialite" className="underline font-semibold" style={{ color: "var(--kk-green-text)" }}>
              Politique de confidentialité
            </Link>
            .
          </p>

          <div className="space-y-3 mb-10">
            <p className="text-sm leading-relaxed" style={{ color: "var(--kk-mid)" }}>
              Dans le cadre de ma demande de consultation, j&apos;ai été informé que certaines informations
              nécessaires à l&apos;organisation et à la réalisation de ma prise en charge peuvent concerner ma
              santé. Ces informations peuvent notamment inclure :
            </p>
            <ul className="space-y-1.5">
              {DATA_TYPES.map((t) => (
                <li key={t} className="text-sm flex items-start gap-2" style={{ color: "var(--kk-mid)" }}>
                  <Dot />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 mb-10">
            <p className="text-sm leading-relaxed" style={{ color: "var(--kk-mid)" }}>
              Je reconnais avoir été informé que ces données :
            </p>
            <ul className="space-y-1.5">
              {ACKNOWLEDGEMENTS.map((t) => (
                <li key={t} className="text-sm flex items-start gap-2" style={{ color: "var(--kk-mid)" }}>
                  <Dot />
                  {t}
                </li>
              ))}
            </ul>
            <p className="text-sm leading-relaxed" style={{ color: "var(--kk-mid)" }}>
              Je comprends également que je peux adresser toute demande relative à mes données à :{" "}
              <span className="font-semibold">contact@k-kouma.com</span>.
            </p>
          </div>

          <div className="kk-card p-6">
            <h2 className="text-base font-bold mb-4" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              Les 5 conditions demandées à l&apos;inscription
            </h2>
            <ul className="space-y-3">
              {CHECKBOXES.map((c) => (
                <li key={c} className="text-sm flex items-start gap-2.5" style={{ color: "var(--kk-mid)" }}>
                  <span
                    className="mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center"
                    style={{ border: "1.5px solid var(--kk-green)" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5L13 4" stroke="var(--kk-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
