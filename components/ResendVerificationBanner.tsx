'use client'

import { useActionState } from "react";
import { resendVerificationEmailAction } from "@/lib/actions/auth";

export function ResendVerificationBanner() {
  const [state, action, pending] = useActionState(resendVerificationEmailAction, {});

  return (
    <div
      className="rounded-2xl p-5 mb-7 flex items-center justify-between gap-4 flex-wrap"
      style={{ background: "var(--kk-gold-light)", border: "1px solid #E9C98A" }}
    >
      <div>
        <p className="font-bold mb-0.5" style={{ color: "var(--kk-gold-text)" }}>
          Confirmez votre adresse email
        </p>
        <p className="text-sm" style={{ color: "#8A6530" }}>
          {state.message ?? "Vérifiez votre boîte mail et cliquez sur le lien de confirmation reçu à l'inscription."}
        </p>
        {state.error && (
          <p className="text-sm mt-1" style={{ color: "#C0392B" }}>{state.error}</p>
        )}
      </div>
      {!state.message && (
        <form action={action}>
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 text-sm font-bold px-5 py-2.5 rounded-full"
            style={{ background: "var(--kk-gold-text)", color: "#fff" }}
          >
            {pending ? "Envoi…" : "Renvoyer l'email"}
          </button>
        </form>
      )}
    </div>
  );
}
