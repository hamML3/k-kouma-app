'use client'

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/lib/actions/account";
import { PasswordInput } from "@/components/PasswordInput";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(changePasswordAction, initialState);

  return (
    <>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
        Mon compte
      </h1>
      <p className="text-sm mb-6 break-all" style={{ color: "var(--kk-muted)" }}>
        {email}
      </p>

      <div className="kk-card p-6">
        <h2 className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Changer mon mot de passe
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--kk-muted)" }}>
          Vous serez déconnecté de tous vos appareils et devrez vous reconnecter.
        </p>

        {state.error && <div className="kk-error mb-4">{state.error}</div>}

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="kk-label">
              Mot de passe actuel
            </label>
            <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" required className="kk-input" />
          </div>
          <div>
            <label htmlFor="password" className="kk-label">
              Nouveau mot de passe
            </label>
            <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} className="kk-input" />
            <p className="text-xs mt-1" style={{ color: "var(--kk-muted)" }}>
              8 caractères minimum, avec au moins une lettre et un chiffre.
            </p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="kk-label">
              Confirmer le nouveau mot de passe
            </label>
            <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required className="kk-input" />
          </div>
          <button type="submit" disabled={pending} className="kk-btn-green w-full">
            {pending ? "Enregistrement…" : "Changer mon mot de passe"}
          </button>
        </form>
      </div>
    </>
  );
}
