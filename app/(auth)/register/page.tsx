import Link from "next/link";

export default function RegisterPage() {
  return (
    <>
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
      >
        Créer un compte
      </h1>
      <p className="text-sm mb-7" style={{ color: "var(--kk-muted)" }}>
        Vous avez déjà un compte ?{" "}
        <Link
          href="/login"
          className="font-bold"
          style={{ color: "var(--kk-green)" }}
        >
          Se connecter
        </Link>
      </p>

      <div className="space-y-3">
        <Link href="/register/patient" className="kk-register-card kk-register-card--green">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--kk-green-light)" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="7" r="3.5" stroke="#557B53" strokeWidth="1.8" />
              <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="#557B53" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: "var(--kk-dark)" }}>
              Je cherche un soutien
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
              Trouvez un psychologue et commencez dès aujourd&apos;hui
            </p>
          </div>
          <svg className="shrink-0 self-center" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="#A8AEA1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <Link href="/register/therapist" className="kk-register-card kk-register-card--purple">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--kk-purple-light)" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2v4M10 14v4M2 10h4M14 10h4" stroke="#8E7CB8" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="10" cy="10" r="3" stroke="#8E7CB8" strokeWidth="1.8" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: "var(--kk-dark)" }}>
              Je suis psychologue
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
              Rejoignez la plateforme et accompagnez vos patients à distance
            </p>
          </div>
          <svg className="shrink-0 self-center" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="#A8AEA1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </>
  );
}
