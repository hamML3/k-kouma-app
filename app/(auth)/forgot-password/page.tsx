'use client'

import { useActionState } from "react";
import { forgotPasswordAction } from "@/lib/actions/auth";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, {});

  return (
    <>
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
      >
        Mot de passe oublié
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--kk-muted)" }}>
        Indiquez votre adresse email, nous vous enverrons un lien pour en choisir un nouveau.
      </p>

      {state.message ? (
        <div
          className="rounded-2xl p-4 text-sm"
          style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}
        >
          {state.message}
        </div>
      ) : (
        <form action={action} className="space-y-4">
          {state.error && <div className="kk-error">{state.error}</div>}

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

          <button type="submit" disabled={pending} className="kk-btn-purple w-full mt-2">
            {pending ? "Envoi en cours…" : "Envoyer le lien"}
          </button>
        </form>
      )}

      <p className="text-center text-sm mt-6" style={{ color: "var(--kk-muted)" }}>
        <Link href="/login" className="font-bold" style={{ color: "var(--kk-green)" }}>
          ← Retour à la connexion
        </Link>
      </p>
    </>
  );
}
