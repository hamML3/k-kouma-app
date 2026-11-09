import { SESSION_MINUTES } from "@/lib/availability";

/** La salle ouvre un peu avant l'heure, pour tester micro et caméra. */
export const JOIN_EARLY_MINUTES = 15;

export type SessionPhase = "early" | "open" | "ended";

/**
 * Fenêtre d'une séance : ouverte JOIN_EARLY_MINUTES avant le début, close
 * à la fin prévue (début + durée). Après la fin, l'appel est coupé et la
 * salle refuse toute reconnexion : une séance dure une heure.
 */
export function sessionWindow(scheduledAt: Date, durationMinutes: number | null | undefined) {
  const start = scheduledAt.getTime();
  const minutes = durationMinutes && durationMinutes > 0 ? durationMinutes : SESSION_MINUTES;
  return {
    opensAt: new Date(start - JOIN_EARLY_MINUTES * 60_000),
    endsAt: new Date(start + minutes * 60_000),
  };
}

export function sessionPhase(scheduledAt: Date, durationMinutes: number | null | undefined, now = new Date()): SessionPhase {
  const { opensAt, endsAt } = sessionWindow(scheduledAt, durationMinutes);
  if (now < opensAt) return "early";
  if (now >= endsAt) return "ended";
  return "open";
}
