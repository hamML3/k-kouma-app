'use client'

import { createAppointmentAction } from "@/lib/actions/appointments";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

const SESSION_TYPES: { value: string; label: string; desc: string; icon: IconName }[] = [
  { value: "video", label: "Vidéo", desc: "L'expérience la plus proche d'une consultation en cabinet.", icon: "video" },
  { value: "audio", label: "Audio", desc: "Un appel vocal uniquement, discret et simple.", icon: "headphones" },
  { value: "text", label: "Messagerie", desc: "Échangez par messages écrits à votre rythme.", icon: "chat" },
];

function tomorrow9am(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export default function BookingClient({
  patientId,
  therapistId,
  therapistName,
  rate,
}: {
  patientId: number;
  therapistId: number;
  therapistName: string;
  rate: number;
}) {
  return (
    <>
      <main className="max-w-xl mx-auto px-5 py-8">
        <Link
          href="/therapists"
          className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4"
          style={{ color: "var(--kk-muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour
        </Link>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
        >
          Réserver une séance
        </h1>
        <p className="text-sm mb-7" style={{ color: "var(--kk-muted)" }}>
          Choisissez un créneau et le format qui vous convient.
        </p>

        <form action={createAppointmentAction} className="space-y-5">
          <input type="hidden" name="patientId" value={String(patientId)} />
          <input type="hidden" name="therapistId" value={String(therapistId)} />

          {/* Therapist info */}
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "var(--kk-green-light)", border: "1px solid #C2D9BC" }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
              style={{ background: "var(--kk-green)", fontFamily: "var(--font-lora)" }}
            >
              {therapistName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--kk-dark)" }}>
                Séance avec {therapistName}
              </p>
              <p className="text-xs" style={{ color: "var(--kk-mid)" }}>
                {rate > 0 ? `${rate.toLocaleString("fr-FR")} XOF · 45 min` : "Tarif à confirmer · 45 min"}
              </p>
            </div>
          </div>

          {/* Date & time */}
          <div>
            <label className="kk-label">Date et heure souhaitées</label>
            <input
              type="datetime-local"
              name="scheduledAt"
              required
              defaultValue={tomorrow9am()}
              min={new Date().toISOString().slice(0, 16)}
              className="kk-input"
              style={{ cursor: "pointer" }}
            />
          </div>

          {/* Session type */}
          <div>
            <label className="kk-label">Format de la séance</label>
            <div className="space-y-2.5 mt-2">
              {SESSION_TYPES.map((t, i) => (
                <label
                  key={t.value}
                  className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all"
                  style={{ background: "#fff", border: "1.5px solid var(--kk-border)" }}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t.value}
                    defaultChecked={i === 0}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--kk-dark)" }}>
                      <Icon name={t.icon} size={15} />
                      {t.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                      {t.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-4 text-xs"
            style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
          >
            La séance dure <strong>45 minutes</strong>. Le psychologue confirmera votre créneau par email sous 24h.
          </div>

          <button type="submit" className="kk-btn-purple w-full">
            Confirmer ma réservation →
          </button>
        </form>
      </main>
    </>
  );
}
