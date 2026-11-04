'use client'

import { useActionState } from "react";
import { requestPayoutAction, type RequestPayoutState } from "@/lib/actions/payouts";

type PendingRequest = { amount: number; createdAt: string };

/**
 * Bouton "Demander le retrait" (visible dès qu'il y a un solde non reversé)
 * ou, s'il existe déjà une demande en attente, son statut à la place —
 * jamais les deux en même temps, pour ne pas laisser croire qu'une nouvelle
 * demande partirait alors qu'une est déjà en cours d'examen.
 */
export function RequestPayoutSection({
  unpaidTotal,
  initialPendingRequest,
}: {
  unpaidTotal: number;
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
          Recevez vos gains en attente dès qu&apos;un administrateur valide la demande.
        </p>
        {state.error && <p className="kk-error text-xs mt-2">{state.error}</p>}
      </div>
      <form action={action} className="shrink-0">
        <button type="submit" disabled={pending} className="kk-btn-green text-sm px-5 py-2.5">
          {pending ? "Envoi…" : "Demander le retrait"}
        </button>
      </form>
    </div>
  );
}
