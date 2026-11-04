'use client'

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/lib/actions/auth";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { PasswordInput } from "@/components/PasswordInput";
import Link from "next/link";

function PasswordChangedNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("passwordChanged") !== "1") return null;
  return (
    <p className="text-sm rounded-xl p-3 mb-5" style={{ background: "var(--kk-green-light)", color: "var(--kk-green-hover)" }}>
      Votre mot de passe a été modifié. Connectez-vous avec le nouveau.
    </p>
  );
}

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, {});

  return (
    <>
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
      >
        Connexion
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--kk-muted)" }}>
        Heureux de vous revoir. Connectez-vous pour retrouver votre espace.
      </p>

      <Suspense fallback={null}>
        <PasswordChangedNotice />
      </Suspense>

      {state.error && (
        <div className="kk-error mb-5">{state.error}</div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="kk-label">
            Adresse email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="kk-input"
            placeholder="vous@exemple.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="kk-label">
              Mot de passe
            </label>
            <Link href="/forgot-password" className="text-xs font-semibold" style={{ color: "var(--kk-purple)" }}>
              Oublié ?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            className="kk-input"
            placeholder="••••••••"
          />
        </div>

        <button type="submit" disabled={pending} className="kk-btn-purple w-full mt-2">
          {pending ? "Connexion en cours…" : "Se connecter"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6" aria-hidden>
        <div className="flex-1 h-px" style={{ background: "var(--kk-border)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--kk-faint)" }}>Nouveau sur K-Kouma ?</span>
        <div className="flex-1 h-px" style={{ background: "var(--kk-border)" }} />
      </div>

      <Link href="/register" className="kk-btn-outline w-full text-center block">
        Créer un compte
      </Link>

      <p className="text-center text-xs mt-5" style={{ color: "var(--kk-muted)" }}>
        En cas d&apos;urgence psychologique, composez le{" "}
        <span className="font-bold" style={{ color: "var(--kk-dark)" }}>15</span> ou
        rendez-vous aux urgences les plus proches.
      </p>

      <LoadingOverlay show={pending} />
    </>
  );
}
