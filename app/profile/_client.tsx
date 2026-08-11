'use client'

import { useActionState, useState } from "react";
import { updateTherapistProfileAction } from "@/lib/actions/profile";
import Link from "next/link";

const SPECIALTIES = [
  "Anxiété et stress",
  "Dépression",
  "Traumatisme (PTSD)",
  "Relations et couple",
  "Deuil et perte",
  "Troubles alimentaires",
  "Addictions",
  "Développement personnel",
  "Enfants et adolescents",
];

const RATE_PRESETS = [10000, 15000, 20000, 25000, 30000];

type Profile = {
  firstName: string;
  lastName: string;
  bio: string;
  languages: string;
  specialties: string;
  hourlyRate: number;
};

export default function ProfileClient({
  userId,
  profile,
}: {
  userId: number;
  profile: Profile;
}) {
  const [state, action, pending] = useActionState(updateTherapistProfileAction, {});

  const initialPreset = RATE_PRESETS.includes(profile.hourlyRate) ? profile.hourlyRate : null;
  const [selectedRate, setSelectedRate] = useState<number | null>(initialPreset);
  const [customRate, setCustomRate] = useState(initialPreset ? "" : String(profile.hourlyRate || ""));

  const effectiveRate = selectedRate ?? (customRate ? Number(customRate) : null);

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-5 py-4"
        style={{
          background: "rgba(246,242,234,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--kk-border)",
        }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: "var(--kk-mid)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Tableau de bord
          </Link>
          <span
            className="text-base font-bold"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Mon profil
          </span>
          <div className="w-24" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8">
        {/* Success banner */}
        {state.success && (
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-3"
            style={{ background: "var(--kk-green-light)", border: "1px solid #C2D9BC" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#557B53" strokeWidth="1.6" />
              <path d="M6 10l3 3 5-5" stroke="#557B53" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-semibold" style={{ color: "var(--kk-green)" }}>
              Profil mis à jour avec succès.
            </p>
          </div>
        )}

        {state.error && (
          <div className="kk-error mb-5">{state.error}</div>
        )}

        <h1
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
        >
          Modifier mon profil
        </h1>

        <form action={action} className="space-y-5">
          <input type="hidden" name="userId" value={String(userId)} />

          {/* Identity */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
          >
            <p className="font-bold text-sm" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
              Identité
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="kk-label">Prénom</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  defaultValue={profile.firstName}
                  className="kk-input"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="kk-label">Nom</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  defaultValue={profile.lastName}
                  className="kk-input"
                />
              </div>
            </div>
          </div>

          {/* Languages + Specialties */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
          >
            <p className="font-bold text-sm" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
              Pratique
            </p>
            <div>
              <label htmlFor="languages" className="kk-label">Langues de consultation</label>
              <input
                id="languages"
                name="languages"
                type="text"
                defaultValue={profile.languages}
                className="kk-input"
                placeholder="ex. Français, Bambara, Wolof"
              />
            </div>
            <div>
              <label htmlFor="specialties" className="kk-label">Spécialité principale</label>
              <select
                id="specialties"
                name="specialties"
                defaultValue={profile.specialties}
                className="kk-input"
                style={{ cursor: "pointer" }}
              >
                <option value="">Sélectionner…</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bio */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
          >
            <label htmlFor="bio" className="kk-label block mb-1 font-bold text-sm" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              Présentation{" "}
              <span className="font-normal text-xs" style={{ color: "var(--kk-faint)" }}>
                visible par les patients
              </span>
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={5}
              maxLength={2000}
              defaultValue={profile.bio}
              className="kk-input resize-none mt-2"
              placeholder="Décrivez votre approche, votre formation et votre expérience…"
            />
          </div>

          {/* Hourly rate */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--kk-green-light)", border: "1.5px solid #C2D9BC" }}
          >
            <p className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              Tarif par séance
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--kk-mid)" }}>
              Ce montant est affiché sur votre profil public.
            </p>

            <input type="hidden" name="hourlyRate" value={effectiveRate ?? ""} />

            <div className="flex flex-wrap gap-2 mb-3">
              {RATE_PRESETS.map((r) => {
                const active = selectedRate === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { setSelectedRate(active ? null : r); setCustomRate(""); }}
                    className="px-4 py-2 rounded-full text-sm font-bold transition-all"
                    style={{
                      background: active ? "var(--kk-green)" : "#fff",
                      color: active ? "#fff" : "var(--kk-mid)",
                      border: active ? "none" : "1.5px solid var(--kk-border-mid)",
                    }}
                  >
                    {r.toLocaleString("fr-FR")} XOF
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Autre montant…"
                min={0}
                step={500}
                value={customRate}
                onChange={(e) => { setCustomRate(e.target.value); setSelectedRate(null); }}
                className="kk-input flex-1"
                style={{ background: "#fff" }}
              />
              <span className="text-sm font-semibold shrink-0" style={{ color: "var(--kk-mid)" }}>
                XOF / séance
              </span>
            </div>

            {effectiveRate !== null && effectiveRate > 0 && (
              <p className="text-xs mt-2 font-semibold" style={{ color: "var(--kk-green)" }}>
                ✓ Tarif : {effectiveRate.toLocaleString("fr-FR")} XOF / séance
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="kk-btn-green w-full"
          >
            {pending ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </form>
      </main>
    </div>
  );
}
