import Link from "next/link";
import { confirmEmailChange, type EmailChangeResult } from "@/lib/emailChange";

export const metadata = { title: "Nouvelle adresse e-mail — K-Kouma" };

const COPY: Record<EmailChangeResult, { title: string; body: string }> = {
  success: {
    title: "Adresse modifiée",
    body: "Votre nouvelle adresse e-mail est enregistrée et vérifiée. Pour votre sécurité, vous avez été déconnecté : reconnectez-vous avec cette nouvelle adresse.",
  },
  expired: {
    title: "Lien expiré",
    body: "Ce lien a expiré (24 heures). Refaites la demande depuis « Mon compte ».",
  },
  invalid: {
    title: "Lien invalide",
    body: "Ce lien n'est pas valide ou a déjà servi. Si besoin, refaites la demande depuis « Mon compte ».",
  },
  taken: {
    title: "Adresse indisponible",
    body: "Cette adresse est désormais utilisée par un autre compte. Votre adresse actuelle reste inchangée.",
  },
};

export default async function ConfirmEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = token ? await confirmEmailChange(token) : "invalid";
  const { title, body } = COPY[result];

  return (
    <>
      <div className="text-center mb-2">
        <span className="text-4xl">{result === "success" ? "✅" : "⚠️"}</span>
      </div>
      <h1 className="text-2xl font-bold mb-1 text-center" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
        {title}
      </h1>
      <p className="text-sm mb-6 text-center" style={{ color: "var(--kk-muted)" }}>
        {body}
      </p>
      <Link href={result === "success" ? "/login" : "/compte"} className="kk-btn-purple w-full inline-block text-center">
        {result === "success" ? "Se connecter" : "Mon compte"}
      </Link>
    </>
  );
}
