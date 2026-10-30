'use client'

import { useActionState, useState } from "react";
import { registerPatientAction } from "@/lib/actions/auth";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { PasswordInput } from "@/components/PasswordInput";
import Link from "next/link";

const CONSENT_ITEMS: { key: string; label: string }[] = [
  { key: "consentPrivacyRead", label: "J'ai lu la Politique de confidentialité." },
  {
    key: "consentHealthDataNeeded",
    label:
      "J'ai compris que certaines données relatives à ma santé peuvent être nécessaires à la réalisation de la consultation demandée.",
  },
  {
    key: "consentDataProcessing",
    label:
      "Je consens de manière libre, spécifique, éclairée et non équivoque au traitement des données nécessaires à la fourniture du service demandé.",
  },
  { key: "consentInfoAccurate", label: "Je confirme que les informations que je communique sont exactes à ma connaissance." },
  { key: "consentNotEmergency", label: "Je comprends que K-Kouma n'est pas un service d'urgence médicale." },
];

const TIMEZONES = [
  { value: "Africa/Bamako", label: "Bamako (GMT+0)" },
  { value: "Africa/Abidjan", label: "Abidjan (GMT+0)" },
  { value: "Africa/Dakar", label: "Dakar (GMT+0)" },
  { value: "Africa/Ouagadougou", label: "Ouagadougou (GMT+0)" },
  { value: "Africa/Niamey", label: "Niamey (GMT+1)" },
  { value: "Europe/Paris", label: "Paris (GMT+2)" },
];

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1.5 text-xs font-medium" style={{ color: "#C0392B" }}>
      {messages[0]}
    </p>
  );
}

export default function RegisterPatientPage() {
  const [state, action, pending] = useActionState(registerPatientAction, {});
  const [consents, setConsents] = useState<Record<string, boolean>>(
    Object.fromEntries(CONSENT_ITEMS.map((c) => [c.key, false]))
  );
  const allConsented = CONSENT_ITEMS.every((c) => consents[c.key]);

  function toggleAll(checked: boolean) {
    setConsents(Object.fromEntries(CONSENT_ITEMS.map((c) => [c.key, checked])));
  }

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
        Créer votre compte
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--kk-muted)" }}>
        Vos données sont confidentielles. Vous pouvez utiliser un pseudonyme.
      </p>

      {state.error && (
        <div className="kk-error mb-5">{state.error}</div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="nickname" className="kk-label">
            Pseudonyme{" "}
            <span className="font-normal" style={{ color: "var(--kk-faint)" }}>
              (affiché au psychologue)
            </span>
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            required
            minLength={2}
            maxLength={50}
            className="kk-input"
            placeholder="ex. Aminata, D.K…"
          />
          <FieldError messages={state.fieldErrors?.nickname} />
        </div>

        <div>
          <label htmlFor="email" className="kk-label">
            Adresse email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="kk-input"
            placeholder="vous@exemple.com"
          />
          <FieldError messages={state.fieldErrors?.email} />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="kk-label">
            Téléphone{" "}
            <span className="font-normal" style={{ color: "var(--kk-faint)" }}>
              (facultatif — rappels SMS)
            </span>
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            className="kk-input"
            placeholder="+223 70 000 000"
          />
          <FieldError messages={state.fieldErrors?.phoneNumber} />
        </div>

        <div>
          <label htmlFor="password" className="kk-label">
            Mot de passe
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="kk-input"
            placeholder="8 caractères minimum"
          />
          <FieldError messages={state.fieldErrors?.password} />
        </div>

        <div>
          <label htmlFor="timezone" className="kk-label">
            Fuseau horaire
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue="Africa/Bamako"
            className="kk-input"
            style={{ cursor: "pointer" }}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs pt-1" style={{ color: "var(--kk-faint)" }}>
          En créant un compte, vous acceptez nos{" "}
          <a href="/legal/cgu" target="_blank" className="underline">Conditions d&apos;utilisation</a> et notre{" "}
          <a href="/legal/confidentialite" target="_blank" className="underline">Politique de confidentialité</a>.
        </p>

        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--kk-green-light)", border: "1.5px solid #C2D9BC" }}
        >
          <p className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Consentement au traitement de vos données de santé
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--kk-mid)" }}>
            Une prise en charge psychologique peut nécessiter de recueillir des informations sur votre santé
            (symptômes, antécédents, documents transmis…). Merci de confirmer les points suivants — le détail
            complet est disponible dans notre{" "}
            <a href="/legal/consentement-sante" target="_blank" className="underline font-semibold">
              document de consentement
            </a>
            .
          </p>

          <label
            className="flex items-center gap-2.5 text-xs font-bold pb-2.5 mb-2.5 cursor-pointer"
            style={{ color: "var(--kk-dark)", borderBottom: "1px solid #C2D9BC" }}
          >
            <input
              type="checkbox"
              checked={allConsented}
              onChange={(e) => toggleAll(e.target.checked)}
              className="mt-0 shrink-0"
            />
            Tout accepter
          </label>

          <div className="space-y-2.5">
            {CONSENT_ITEMS.map((c) => (
              <label key={c.key} className="flex items-start gap-2.5 text-xs cursor-pointer" style={{ color: "var(--kk-mid)" }}>
                <input
                  type="checkbox"
                  name={c.key}
                  checked={consents[c.key]}
                  onChange={(e) => setConsents((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                  className="mt-0.5 shrink-0"
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        {!allConsented && (
          <p className="text-xs text-center" style={{ color: "var(--kk-muted)" }}>
            Cochez les 5 conditions ci-dessus pour pouvoir créer votre compte.
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !allConsented}
          className="kk-btn-purple w-full mt-2"
        >
          {pending ? "Création du compte…" : "Créer mon compte →"}
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
