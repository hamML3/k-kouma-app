'use client'

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import Link from "next/link";

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
        Pas encore de compte ?{" "}
        <Link
          href="/register"
          className="font-bold"
          style={{ color: "var(--kk-green)" }}
        >
          Créer un compte
        </Link>
      </p>

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
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="kk-input"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="kk-btn-purple w-full mt-2"
        >
          {pending ? "Connexion en cours…" : "Se connecter"}
        </button>
      </form>

      <p className="text-center text-xs mt-5" style={{ color: "var(--kk-muted)" }}>
        En cas d&apos;urgence psychologique, composez le{" "}
        <span className="font-bold" style={{ color: "var(--kk-dark)" }}>15</span> ou
        rendez-vous aux urgences les plus proches.
      </p>
    </>
  );
}
