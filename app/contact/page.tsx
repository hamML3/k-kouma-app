import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = { title: "Contact — K-Kouma" };

export default function ContactPage() {
  return (
    <>
      <PublicNav />
      <main style={{ background: "var(--kk-bg)" }}>
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-green-text)" }}>
            Une question, un problème à signaler ?
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Contactez-nous
          </h1>
          <p className="text-base leading-relaxed mb-10" style={{ color: "var(--kk-mid)" }}>
            Notre équipe vous répond sous 48 heures ouvrées.
          </p>

          <div className="kk-card p-8 text-left space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kk-muted)" }}>
                Par email
              </p>
              <a
                href="mailto:contact@k-kouma.com"
                className="text-lg font-bold"
                style={{ color: "var(--kk-purple-text)", fontFamily: "var(--font-lora)" }}
              >
                contact@k-kouma.com
              </a>
            </div>

            <div style={{ borderTop: "1px solid var(--kk-border)" }} className="pt-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kk-muted)" }}>
                Déjà utilisateur ?
              </p>
              <p className="text-sm" style={{ color: "var(--kk-mid)" }}>
                Pour un problème lié à une séance ou à un psychologue en particulier, précisez la date et le nom du
                psychologue concerné — cela nous aide à traiter votre demande plus rapidement.
              </p>
            </div>

            <div style={{ borderTop: "1px solid var(--kk-border)" }} className="pt-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#C0392B" }}>
                Urgence
              </p>
              <p className="text-sm" style={{ color: "var(--kk-mid)" }}>
                K-Kouma n&apos;est pas un service d&apos;urgence. En cas de danger immédiat, contactez le{" "}
                <strong>15</strong> (SAMU) ou le <strong>17</strong> (Police).
              </p>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
