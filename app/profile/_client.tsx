'use client'

import { useActionState } from "react";
import Link from "next/link";
import { updateTherapistProfileAction } from "@/lib/actions/profile";

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

type Profile = {
  firstName: string;
  lastName: string;
  bio: string;
  languages: string;
  specialties: string;
};

export default function ProfileClient({
  userId,
  profile,
  commissionPercent,
}: {
  userId: number;
  profile: Profile;
  commissionPercent: number;
}) {
  const [state, action, pending] = useActionState(updateTherapistProfileAction, {});

  return (
    <>
      <main className="max-w-2xl mx-auto px-5 py-8">
        <div className="mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Mon profil
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            Ces informations sont visibles par vos patients — gardez-les à jour.
          </p>
        </div>

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

          {/* Commission — lecture seule, voir /conditions-commission pour l'acceptation */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--kk-green-light)", border: "1.5px solid #C2D9BC" }}
          >
            <p className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              Commission K-Kouma
            </p>
            <p className="text-xs mb-3" style={{ color: "var(--kk-mid)" }}>
              Les tarifs sont fixés par K-Kouma (abonnements/packs patients). Vous percevez le prix payé par le
              patient, moins cette commission, pour chaque séance réalisée.
            </p>
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-green)" }}>
              {commissionPercent}%
            </p>
            <Link href="/conditions-commission" className="text-xs font-bold underline mt-1 inline-block" style={{ color: "var(--kk-green)" }}>
              Voir les conditions acceptées →
            </Link>
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
    </>
  );
}
