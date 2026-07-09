import Link from "next/link";

export default function TherapistPendingPage() {
  return (
    <div className="text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{ background: "var(--kk-green-light)" }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M7 14.5l5 5 9-10"
            stroke="#557B53"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1
        className="text-2xl font-bold mb-2"
        style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
      >
        Candidature reçue !
      </h1>
      <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--kk-muted)" }}>
        Notre équipe vérifie votre profil et votre diplôme sous{" "}
        <strong style={{ color: "var(--kk-dark)" }}>48 heures</strong>. Vous
        recevrez un email de confirmation dès que votre compte sera activé.
      </p>

      <div
        className="rounded-xl px-5 py-4 text-sm text-left mb-6"
        style={{
          background: "var(--kk-gold-light)",
          border: "1px solid #E9C98A",
        }}
      >
        <p className="font-bold mb-2" style={{ color: "var(--kk-gold)" }}>
          Prochaines étapes
        </p>
        <ol className="space-y-1.5" style={{ color: "#8A6530" }}>
          <li className="flex items-start gap-2">
            <span className="font-bold shrink-0">1.</span>
            Préparez une copie de votre diplôme de psychologue
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold shrink-0">2.</span>
            Notre équipe vous contactera par email
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold shrink-0">3.</span>
            Complétez votre profil et vos disponibilités
          </li>
        </ol>
      </div>

      <Link
        href="/"
        className="text-sm font-bold"
        style={{ color: "var(--kk-green)" }}
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
