'use client'

import { useActionState } from "react";
import { cancelEmailChangeAction, requestEmailChangeAction, type ChangeEmailState } from "@/lib/actions/account";
import { PasswordInput } from "@/components/PasswordInput";

const initialState: ChangeEmailState = {};

/** Changer l'adresse e-mail du compte : confirmée par un lien envoyé à la nouvelle adresse. */
export function ChangeEmailForm({ currentEmail, pendingEmail }: { currentEmail: string; pendingEmail: string | null }) {
  const [state, action, pending] = useActionState(requestEmailChangeAction, initialState);
  const awaiting = state.sentTo ?? pendingEmail;

  return (
    <div className="kk-card p-6">
      <h2 className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
        Changer mon adresse e-mail
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--kk-muted)" }}>
        Adresse actuelle : <strong className="break-all" style={{ color: "var(--kk-dark)" }}>{currentEmail}</strong>. Un lien de confirmation est
        envoyé à la nouvelle adresse ; elle ne remplace l&apos;actuelle qu&apos;une fois ce lien ouvert.
      </p>

      {awaiting && (
        <div className="rounded-xl p-4 mb-5 text-sm" style={{ background: "var(--kk-gold-light)", color: "var(--kk-gold-text)" }}>
          <p>
            Un lien de confirmation a été envoyé à <strong className="break-all">{awaiting}</strong>. Ouvrez-le dans les 24 heures
            (pensez à regarder dans les courriers indésirables).
          </p>
          <form action={cancelEmailChangeAction} className="mt-2">
            <button type="submit" className="text-xs font-bold underline">
              Annuler cette demande
            </button>
          </form>
        </div>
      )}

      {state.error && <div className="kk-error mb-4">{state.error}</div>}

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="newEmail" className="kk-label">
            Nouvelle adresse e-mail
          </label>
          <input id="newEmail" name="newEmail" type="email" required autoComplete="email" maxLength={180} className="kk-input" />
        </div>
        <div>
          <label htmlFor="emailChangePassword" className="kk-label">
            Mot de passe actuel
          </label>
          <PasswordInput id="emailChangePassword" name="currentPassword" autoComplete="current-password" required className="kk-input" />
        </div>
        <button type="submit" disabled={pending} className="kk-btn-purple w-full">
          {pending ? "Envoi…" : "Envoyer le lien de confirmation"}
        </button>
      </form>
    </div>
  );
}
