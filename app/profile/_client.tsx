'use client'

import { useActionState, useState } from "react";
import Link from "next/link";
import { updateTherapistProfileAction } from "@/lib/actions/profile";
import { SpecialtyPicker } from "@/components/SpecialtyPicker";
import { SPECIALTIES, MAX_SPECIALTIES, splitSpecialties } from "@/lib/specialties";

type Profile = {
  firstName: string;
  lastName: string;
  bio: string;
  languages: string;
  specialties: string;
};

export default function ProfileClient({
  profile,
  commissionPercent,
}: {
  profile: Profile;
  commissionPercent: number;
}) {
  const [state, action, pending] = useActionState(updateTherapistProfileAction, {});
  // Pré-sélection depuis la valeur stockée ("A,B" ou "A, B" selon l'ancienneté).
  const [initialSpecialties] = useState(() => splitSpecialties(profile.specialties));
  const [specialties, setSpecialties] = useState<string[]>(initialSpecialties);
  // Anciennes valeurs hors liste : affichées pour pouvoir être conservées ou retirées.
  const legacySpecialties = initialSpecialties.filter(
    (s) => !(SPECIALTIES as readonly string[]).includes(s)
  );

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
            <p className="text-sm font-semibold" style={{ color: "var(--kk-green-text)" }}>
              Profil mis à jour avec succès.
            </p>
          </div>
        )}

        {state.error && (
          <div className="kk-error mb-5">{state.error}</div>
        )}

        <form action={action} className="space-y-5">
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
              <p className="kk-label">
                Spécialités{" "}
                <span className="font-normal" style={{ color: "var(--kk-faint)" }}>
                  (1 à {MAX_SPECIALTIES})
                </span>
              </p>
              <SpecialtyPicker
                value={specialties}
                onChange={setSpecialties}
                extraOptions={legacySpecialties}
              />
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

          {/* Proposer un article */}
          <div
            className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: "var(--kk-purple-light)", border: "1px solid #C8BCEB" }}
          >
            <div>
              <p className="font-bold mb-0.5" style={{ color: "var(--kk-purple-text)", fontFamily: "var(--font-lora)" }}>
                Proposer un article
              </p>
              <p className="text-xs" style={{ color: "#6B5B96" }}>
                Partagez un conseil ou un article avec les patients — relu par un admin avant publication.
              </p>
            </div>
            <Link href="/articles/proposer" className="kk-btn-purple shrink-0 text-sm px-5 py-2.5">
              Proposer →
            </Link>
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
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-green-text)" }}>
              {commissionPercent}%
            </p>
            <Link href="/conditions-commission" className="text-xs font-bold underline mt-1 inline-block" style={{ color: "var(--kk-green-text)" }}>
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
