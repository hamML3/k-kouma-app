import Link from "next/link";
import { verifyEmailToken } from "@/lib/actions/auth";

export const metadata = { title: "Vérification email — K-Kouma" };

const COPY = {
  success: {
    title: "Email confirmé !",
    body: "Votre adresse email est maintenant vérifiée. Merci !",
  },
  already_verified: {
    title: "Déjà confirmé",
    body: "Votre adresse email était déjà vérifiée.",
  },
  expired: {
    title: "Lien expiré",
    body: "Ce lien de vérification a expiré. Connectez-vous pour en recevoir un nouveau depuis votre tableau de bord.",
  },
  invalid: {
    title: "Lien invalide",
    body: "Ce lien de vérification n'est pas valide. Connectez-vous pour en recevoir un nouveau depuis votre tableau de bord.",
  },
} as const;

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailToken(token) : "invalid";
  const { title, body } = COPY[result];

  return (
    <>
      <div className="text-center mb-2">
        <span className="text-4xl">{result === "success" || result === "already_verified" ? "✅" : "⚠️"}</span>
      </div>
      <h1
        className="text-2xl font-bold mb-1 text-center"
        style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
      >
        {title}
      </h1>
      <p className="text-sm mb-6 text-center" style={{ color: "var(--kk-muted)" }}>
        {body}
      </p>
      <Link href="/dashboard" className="kk-btn-purple w-full inline-block text-center">
        Aller à mon espace
      </Link>
    </>
  );
}
