'use client'

import { useActionState, useRef, useState } from "react";
import { registerTherapistAction } from "@/lib/actions/auth";
import { LoadingOverlay } from "@/components/LoadingOverlay";
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

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1.5 text-xs font-medium" style={{ color: "#C0392B" }}>
      {messages[0]}
    </p>
  );
}

function DocUploadSlot({
  label,
  inputName,
  onFileChange,
  file,
}: {
  label: string;
  inputName: string;
  onFileChange: (f: File | null) => void;
  file: File | null;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <input
        ref={ref}
        name={inputName}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      {/* Upload row — plain div to avoid nested <button> */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && ref.current?.click()}
        className="w-full flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-left cursor-pointer"
        style={{
          border: `1.5px dashed ${file ? "var(--kk-green)" : "var(--kk-border-mid)"}`,
          background: file ? "var(--kk-green-light)" : "#fff",
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: file ? "var(--kk-green)" : "var(--kk-border)" }}
        >
          {file ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M5 5l3-3 3 3" stroke="#8A9183" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 12h10" stroke="#8A9183" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <p className="text-xs font-bold mb-0.5" style={{ color: "var(--kk-muted)" }}>
            {label}
          </p>
          <p className="text-sm font-semibold truncate" style={{ color: file ? "var(--kk-green)" : "var(--kk-faint)" }}>
            {file ? file.name : "Cliquez pour choisir un fichier"}
          </p>
        </div>
      </div>
      {/* Clear button — sibling, not child, of the upload row */}
      {file && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onFileChange(null); if (ref.current) ref.current.value = ""; }}
          className="absolute top-1/2 right-3 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: "var(--kk-green)", color: "#fff" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2L2 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function RegisterTherapistPage() {
  const [state, action, pending] = useActionState(registerTherapistAction, {});
  const [selectedRate, setSelectedRate] = useState<number | null>(null);
  const [customRate, setCustomRate] = useState("");
  const [docs, setDocs] = useState<{ diploma: File | null; idCard: File | null; other: File | null }>({
    diploma: null,
    idCard: null,
    other: null,
  });

  const effectiveRate = selectedRate ?? (customRate ? Number(customRate) : null);

  return (
    <>
      <Link
        href="/register"
        className="inline-flex items-center gap-1.5 text-xs font-semibold mb-5"
        style={{ color: "var(--kk-muted)" }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Retour
      </Link>

      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
      >
        Rejoindre K-Kouma
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--kk-muted)" }}>
        Votre profil sera vérifié par notre équipe avant activation (48h max).
      </p>

      {state.error && (
        <div className="kk-error mb-5">{state.error}</div>
      )}

      <form action={action} className="space-y-5">
        {/* Identity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="kk-label">Prénom</label>
            <input id="firstName" name="firstName" type="text" required className="kk-input" placeholder="Aminata" />
            <FieldError messages={state.fieldErrors?.firstName} />
          </div>
          <div>
            <label htmlFor="lastName" className="kk-label">Nom</label>
            <input id="lastName" name="lastName" type="text" required className="kk-input" placeholder="Coulibaly" />
            <FieldError messages={state.fieldErrors?.lastName} />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="kk-label">Email professionnel</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="kk-input" placeholder="vous@exemple.com" />
          <FieldError messages={state.fieldErrors?.email} />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="kk-label">Téléphone</label>
          <input id="phoneNumber" name="phoneNumber" type="tel" className="kk-input" placeholder="+223 70 000 000" />
          <FieldError messages={state.fieldErrors?.phoneNumber} />
        </div>

        <div>
          <label htmlFor="password" className="kk-label">Mot de passe</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="kk-input" placeholder="8 caractères minimum" />
          <FieldError messages={state.fieldErrors?.password} />
        </div>

        <div>
          <label htmlFor="languages" className="kk-label">Langues de consultation</label>
          <input id="languages" name="languages" type="text" className="kk-input" placeholder="ex. Français, Bambara, Wolof" />
        </div>

        <div>
          <label htmlFor="specialties" className="kk-label">
            Spécialité principale{" "}
            <span className="font-normal" style={{ color: "var(--kk-faint)" }}>(facultatif)</span>
          </label>
          <select id="specialties" name="specialties" className="kk-input" style={{ cursor: "pointer" }}>
            <option value="">Sélectionner…</option>
            {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="bio" className="kk-label">
            Présentation{" "}
            <span className="font-normal" style={{ color: "var(--kk-faint)" }}>(visible par les patients)</span>
          </label>
          <textarea id="bio" name="bio" rows={3} maxLength={2000} className="kk-input resize-none" placeholder="Décrivez votre approche, votre formation et votre expérience…" />
          <FieldError messages={state.fieldErrors?.bio} />
        </div>

        {/* Hourly rate — prominent section */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--kk-green-light)", border: "1.5px solid #C2D9BC" }}
        >
          <p
            className="font-bold mb-1"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Votre tarif par séance
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--kk-mid)" }}>
            Vous fixez votre tarif librement. Les patients voient ce montant sur votre profil.
          </p>

          {/* Hidden real input */}
          <input
            type="hidden"
            name="hourlyRate"
            value={effectiveRate ?? ""}
          />

          {/* Preset chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {RATE_PRESETS.map((r) => {
              const active = selectedRate === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setSelectedRate(active ? null : r);
                    setCustomRate("");
                  }}
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

          {/* Custom amount */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Autre montant…"
              min={0}
              step={500}
              value={customRate}
              onChange={(e) => {
                setCustomRate(e.target.value);
                setSelectedRate(null);
              }}
              className="kk-input flex-1"
              style={{ background: "#fff" }}
            />
            <span className="text-sm font-semibold shrink-0" style={{ color: "var(--kk-mid)" }}>XOF / séance</span>
          </div>

          {effectiveRate !== null && effectiveRate > 0 && (
            <p className="text-xs mt-2 font-semibold" style={{ color: "var(--kk-green)" }}>
              ✓ Tarif sélectionné : {effectiveRate.toLocaleString("fr-FR")} XOF / séance
            </p>
          )}
        </div>

        {/* Documents section */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--kk-purple-light)", border: "1.5px solid #C8BCEB" }}
        >
          <p
            className="font-bold mb-1"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Dossier de candidature
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--kk-mid)" }}>
            Joignez vos documents justificatifs. PDF, JPG ou PNG · 5 Mo max par fichier.
          </p>

          <div className="space-y-3">
            <DocUploadSlot
              label="Diplôme (obligatoire)"
              inputName="diploma"
              file={docs.diploma}
              onFileChange={(f) => setDocs((d) => ({ ...d, diploma: f }))}
            />
            <DocUploadSlot
              label="Pièce d'identité ou passeport"
              inputName="idCard"
              file={docs.idCard}
              onFileChange={(f) => setDocs((d) => ({ ...d, idCard: f }))}
            />
            <DocUploadSlot
              label="Document complémentaire (certificat, attestation…)"
              inputName="document2"
              file={docs.other}
              onFileChange={(f) => setDocs((d) => ({ ...d, other: f }))}
            />
          </div>

          <p className="text-xs mt-3" style={{ color: "#6B5B96" }}>
            Au moins votre diplôme est requis pour valider votre candidature.
          </p>
        </div>

        <p className="text-xs" style={{ color: "var(--kk-faint)" }}>
          En soumettant ce formulaire, vous acceptez nos{" "}
          <a href="/legal/cgu" target="_blank" className="underline">Conditions d&apos;utilisation</a>. Votre
          dossier sera vérifié avant l&apos;activation de votre compte.
        </p>

        <button type="submit" disabled={pending} className="kk-btn-purple w-full mt-2">
          {pending ? "Envoi en cours…" : "Soumettre ma candidature"}
        </button>

        <p className="text-center text-sm" style={{ color: "var(--kk-muted)" }}>
          Déjà un compte ?{" "}
          <Link href="/login" className="font-bold" style={{ color: "var(--kk-green)" }}>
            Se connecter
          </Link>
        </p>
      </form>

      <LoadingOverlay show={pending} />
    </>
  );
}
