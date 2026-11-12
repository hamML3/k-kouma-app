'use client'

import { useActionState, useState } from "react";
import {
  requestPayoutAction,
  savePayoutPhoneAction,
  type RequestPayoutState,
  type SavePayoutPhoneState,
} from "@/lib/actions/payouts";

type PendingRequest = { amount: number; createdAt: string };

/**
 * Bouton "Demander le retrait" (visible dès qu'il y a un solde non reversé)
 * ou, s'il existe déjà une demande en attente, son statut à la place —
 * jamais les deux en même temps, pour ne pas laisser croire qu'une nouvelle
 * demande partirait alors qu'une est déjà en cours d'examen.
 */
export function RequestPayoutSection({
  unpaidTotal,
  hasPayoutPhone,
  initialPendingRequest,
}: {
  unpaidTotal: number;
  hasPayoutPhone: boolean;
  initialPendingRequest: PendingRequest | null;
}) {
  const [state, action, pending] = useActionState<RequestPayoutState, FormData>(requestPayoutAction, {});

  // La demande en attente peut venir du chargement de la page (déjà créée
  // avant), ou de la réponse de l'action qu'on vient de soumettre (création
  // réussie, ou doublon détecté côté serveur) — dans tous ces cas, même rendu.
  const pendingRequest = state.pendingRequest ?? initialPendingRequest;

  if (pendingRequest) {
    return (
      <div
        className="rounded-2xl p-5 mb-8 flex items-center gap-3"
        style={{ background: "var(--kk-gold-light)", border: "1px solid #E9C98A" }}
      >
        <span className="text-2xl shrink-0" aria-hidden>
          ⏳
        </span>
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--kk-gold-text)" }}>
            Demande de retrait en attente
          </p>
          <p className="text-sm mt-0.5" style={{ color: "#8A6530" }}>
            {pendingRequest.amount.toLocaleString("fr-FR")} XOF demandés le{" "}
            {new Date(pendingRequest.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            — un administrateur va l&apos;examiner.
          </p>
        </div>
      </div>
    );
  }

  if (unpaidTotal <= 0) return null;

  return (
    <div
      className="rounded-2xl p-5 mb-8 flex items-center justify-between gap-4 flex-wrap"
      style={{ background: "#fff", border: "1.5px solid var(--kk-border)" }}
    >
      <div className="min-w-0">
        <p className="font-bold text-sm" style={{ color: "var(--kk-dark)" }}>
          Demander le retrait
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
          {hasPayoutPhone
            ? "Recevez vos gains en attente par Orange Money dès qu'un administrateur valide la demande."
            : "Indiquez d'abord ci-dessus le numéro Orange Money sur lequel recevoir vos gains."}
        </p>
        {state.error && <p className="kk-error text-xs mt-2">{state.error}</p>}
      </div>
      <form action={action} className="shrink-0">
        <button type="submit" disabled={pending || !hasPayoutPhone} className="kk-btn-green text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
          {pending ? "Envoi…" : "Demander le retrait"}
        </button>
      </form>
    </div>
  );
}

/**
 * Numéro Orange Money sur lequel l'équipe envoie les gains. Champ contrôlé :
 * React vide les champs non contrôlés après chaque action de formulaire.
 */
export function PayoutPhoneForm({ initialPhone }: { initialPhone: string | null }) {
  const [state, action, pending] = useActionState<SavePayoutPhoneState, FormData>(savePayoutPhoneAction, {});
  const saved = state.phone ?? initialPhone;
  const [editing, setEditing] = useState(!initialPhone);
  const [value, setValue] = useState(initialPhone ?? "");
  // Referme le champ après chaque enregistrement réussi (ajustement pendant le
  // rendu plutôt que dans un effet).
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.saved) setEditing(false);
  }
  const showForm = editing || !saved;

  return (
    <div className="rounded-2xl p-5 mb-4" style={{ background: "#fff", border: "1.5px solid var(--kk-border)" }}>
      <p className="font-bold text-sm" style={{ color: "var(--kk-dark)" }}>
        Numéro de versement
      </p>
      {!showForm && saved ? (
        <div className="flex items-center justify-between gap-3 mt-1">
          <p className="text-sm" style={{ color: "var(--kk-mid)" }}>
            Vos gains sont envoyés par Orange Money au <strong style={{ color: "var(--kk-dark)" }}>{saved}</strong>.
          </p>
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold underline shrink-0" style={{ color: "var(--kk-purple-text)" }}>
            Modifier
          </button>
        </div>
      ) : (
        <form action={action} className="mt-2">
          <label htmlFor="payoutPhone" className="text-xs" style={{ color: "var(--kk-muted)" }}>
            Numéro Orange Money sur lequel recevoir vos gains
          </label>
          <div className="flex gap-2 mt-1 flex-wrap">
            <input
              id="payoutPhone"
              name="payoutPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="+223 70 00 00 00"
              className="kk-input flex-1 min-w-[12rem]"
            />
            <button type="submit" disabled={pending} className="kk-btn-purple text-sm px-5 py-2.5">
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
          {state.error && <p className="kk-error text-xs mt-2">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
