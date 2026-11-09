import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { isValidUnsubscribe } from "@/lib/campaigns";
import { confirmUnsubscribeAction, resubscribeAction } from "@/lib/actions/marketing";

export const metadata = { title: "Désinscription — K-Kouma" };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string; etat?: string }>;
}) {
  const { u, t, etat } = await searchParams;
  const userId = Number(u);
  const valid = isValidUnsubscribe(userId, t ?? "");

  let title = "Lien invalide";
  let text = "Ce lien de désinscription n'est pas valide. Vous pouvez aussi gérer vos préférences dans « Mon compte ».";
  if (valid && etat === "ok") {
    title = "Vous êtes désinscrit";
    text = "Vous ne recevrez plus nos actualités et offres. Les messages liés à votre compte (rendez-vous, paiements, sécurité) continuent d'arriver.";
  } else if (valid && etat === "reabonne") {
    title = "Vous êtes réabonné";
    text = "Vous recevrez de nouveau nos actualités et offres.";
  } else if (valid) {
    title = "Se désinscrire des actualités et offres ?";
    text = "Vous ne recevrez plus nos e-mails promotionnels. Les messages liés à votre compte (rendez-vous, paiements, sécurité) continueront d'arriver.";
  }

  return (
    <>
      <PublicNav />
      <main className="min-h-[70vh] flex items-center justify-center px-5 py-12" style={{ background: "var(--kk-bg)" }}>
        <div className="kk-card p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            {title}
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--kk-muted)" }}>
            {text}
          </p>
          {valid && !etat && (
            <form action={confirmUnsubscribeAction}>
              <input type="hidden" name="u" value={userId} />
              <input type="hidden" name="t" value={t} />
              <button type="submit" className="kk-btn-purple w-full">
                Confirmer la désinscription
              </button>
            </form>
          )}
          {valid && etat === "ok" && (
            <form action={resubscribeAction}>
              <input type="hidden" name="u" value={userId} />
              <input type="hidden" name="t" value={t} />
              <button type="submit" className="kk-btn-outline w-full">
                Je me suis trompé : me réabonner
              </button>
            </form>
          )}
          {(!valid || etat === "reabonne") && (
            <Link href="/" className="kk-btn-outline inline-block px-6 py-2.5 text-sm">
              Retour à l&apos;accueil
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
