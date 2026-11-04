'use client'

import { useActionState, useState, useEffect, useRef } from "react";
import { createUserAction } from "@/lib/actions/admin";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="kk-error text-xs mt-1">{messages[0]}</p>;
}

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, {});
  const [role, setRole] = useState<"patient" | "therapist" | "admin" | "moderator">("patient");
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="kk-btn-purple text-sm px-5 py-2.5">
        + Créer un utilisateur
      </button>
    );
  }

  return (
    <div className="kk-card p-5 mb-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Nouvel utilisateur
        </h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold" style={{ color: "var(--kk-muted)" }}>
          Fermer
        </button>
      </div>

      {state.error && <div className="kk-error mb-4">{state.error}</div>}
      {state.success && (
        <div className="rounded-2xl p-4 mb-4 text-sm" style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}>
          Compte créé avec succès.
        </div>
      )}

      <form ref={formRef} action={action} className="space-y-4">
        <div>
          <label htmlFor="role" className="kk-label">Rôle</label>
          <select
            id="role"
            name="role"
            className="kk-input"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            <option value="patient">Patient</option>
            <option value="therapist">Psychologue</option>
            <option value="moderator">Modérateur (accès restreint)</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="kk-label">Email</label>
            <input id="email" name="email" type="email" required className="kk-input" placeholder="vous@exemple.com" />
            <FieldError messages={state.fieldErrors?.email} />
          </div>
          <div>
            <label htmlFor="password" className="kk-label">Mot de passe</label>
            <input id="password" name="password" type="password" required minLength={8} className="kk-input" placeholder="••••••••" />
            <FieldError messages={state.fieldErrors?.password} />
          </div>
        </div>

        {role === "patient" && (
          <div>
            <label htmlFor="nickname" className="kk-label">Pseudonyme</label>
            <input id="nickname" name="nickname" type="text" className="kk-input" placeholder="Ex: Aïcha" />
            <FieldError messages={state.fieldErrors?.nickname} />
          </div>
        )}

        {role === "therapist" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="kk-label">Prénom</label>
              <input id="firstName" name="firstName" type="text" className="kk-input" />
              <FieldError messages={state.fieldErrors?.firstName} />
            </div>
            <div>
              <label htmlFor="lastName" className="kk-label">Nom</label>
              <input id="lastName" name="lastName" type="text" className="kk-input" />
            </div>
          </div>
        )}

        <button type="submit" disabled={pending} className="kk-btn-purple w-full">
          {pending ? "Création…" : "Créer le compte"}
        </button>
      </form>
    </div>
  );
}
