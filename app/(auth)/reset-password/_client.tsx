'use client'

import { useActionState } from "react";
import { resetPasswordAction } from "@/lib/actions/auth";
import Link from "next/link";

export default function ResetPasswordClient({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, {});

  if (!token) {
    return (
      <>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
        >
          Lien invalide
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--kk-muted)" }}>
          Ce lien de réinitialisation est incomplet. Demandez-en un nouveau.
        </p>
        <Link href="/forgot-password" className="kk-btn-purple w-full inline-block text-center">
          Demander un nouveau lien
        </Link>
      </>
    );
  }

  if (state.success) {
    return (
      <>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
        >
          Mot de passe modifié
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--kk-muted)" }}>
          Votre mot de passe a bien été mis à jour. Vous pouvez maintenant vous connecter.
        </p>
        <Link href="/login" className="kk-btn-purple w-full inline-block text-center">
          Se connecter
        </Link>
      </>
    );
  }

  return (
    <>
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
      >
        Choisir un nouveau mot de passe
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--kk-muted)" }}>
        Choisissez un mot de passe d&apos;au moins 8 caractères.
      </p>

      <form action={action} className="space-y-4">
        {state.error && <div className="kk-error">{state.error}</div>}
        <input type="hidden" name="token" value={token} />

        <div>
          <label htmlFor="password" className="kk-label">
            Nouveau mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="kk-input"
            placeholder="••••••••"
          />
        </div>

        <button type="submit" disabled={pending} className="kk-btn-purple w-full mt-2">
          {pending ? "Enregistrement…" : "Réinitialiser le mot de passe"}
        </button>
      </form>
    </>
  );
}
