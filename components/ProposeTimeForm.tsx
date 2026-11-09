'use client'

import { useState } from "react";

/**
 * Proposer une autre date pour un rendez-vous en attente. Le champ date-heure
 * est à l'heure de l'appareil de la personne ; on envoie l'instant exact
 * (ISO), converti ici, pour éviter toute confusion de fuseau horaire.
 */
export function ProposeTimeForm({
  appointmentId,
  action,
  label = "Proposer une autre date",
}: {
  appointmentId: number;
  action: (formData: FormData) => void | Promise<void>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState("");
  const iso = local ? new Date(local).toISOString() : "";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold px-4 py-2 rounded-full"
        style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple-text)" }}
      >
        {label}
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 w-full">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="scheduledAt" value={iso} />
      <input
        type="datetime-local"
        required
        step={900}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        aria-label="Nouvelle date et heure"
        className="kk-input text-sm max-w-[15rem]"
      />
      <button type="submit" disabled={!iso} className="kk-btn-purple text-xs px-4 py-2">
        Envoyer la proposition
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold" style={{ color: "var(--kk-muted)" }}>
        Annuler
      </button>
    </form>
  );
}
