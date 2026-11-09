'use client'

import { useState } from "react";
import { createAppointmentAction } from "@/lib/actions/appointments";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import type { SlotOption } from "@/lib/availability";
import { SlotPicker } from "./_slotPicker";

const SESSION_TYPES: { value: string; label: string; desc: string; icon: IconName }[] = [
  { value: "video", label: "Vidéo", desc: "L'expérience la plus proche d'une consultation en cabinet.", icon: "video" },
  { value: "audio", label: "Audio", desc: "Un appel vocal uniquement, discret et simple.", icon: "headphones" },
  { value: "text", label: "Messagerie", desc: "Échangez par messages écrits à votre rythme.", icon: "chat" },
];

/** Heure locale du navigateur convertie en UTC : le serveur ne connaît pas le fuseau du patient. */
function localToIso(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export default function BookingClient({
  therapistId,
  therapistName,
  rate,
  configured,
  slots,
}: {
  therapistId: number;
  therapistName: string;
  rate: number;
  configured: boolean;
  slots: SlotOption[];
}) {
  const [slotPicked, setSlotPicked] = useState(false);
  const [freeTime, setFreeTime] = useState("");
  const freeTimeIso = localToIso(freeTime);
  const noSlots = configured && slots.length === 0;
  const ready = configured ? slotPicked : Boolean(freeTimeIso);

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
                {rate.toLocaleString("fr-FR")} XOF · 1 h
              </p>
            </div>
          </div>

          {/* Date & time */}
          {noSlots ? (
            <div className="rounded-2xl p-6 text-center" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
              <p className="text-2xl mb-1" aria-hidden>🗓️</p>
              <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>
                Aucun créneau libre pour le moment
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--kk-muted)" }}>
                {therapistName} n&apos;a plus de disponibilité sur les 2 prochaines semaines. Revenez bientôt.
              </p>
            </div>
          ) : configured ? (
            <SlotPicker slots={slots} onChange={setSlotPicked} />
          ) : (
            <div>
              <label htmlFor="freeTime" className="kk-label">Date et heure souhaitées</label>
              <input
                id="freeTime"
                type="datetime-local"
                required
                value={freeTime}
                onChange={(e) => setFreeTime(e.target.value)}
                className="kk-input"
                style={{ cursor: "pointer" }}
              />
              <input type="hidden" name="scheduledAt" value={freeTimeIso} />
            </div>
          )}

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
            La séance dure <strong>1 heure</strong>. Votre praticien confirmera votre créneau par email sous 24h.
          </div>

          <button type="submit" disabled={!ready} className="kk-btn-purple w-full">
            {ready ? "Confirmer ma réservation →" : "Choisissez un créneau"}
          </button>
        </form>
      </main>
    </>
  );
}
