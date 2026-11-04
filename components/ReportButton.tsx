'use client'

import { useActionState, useEffect, useRef, useState } from "react";
import { fileReportAction, type FileReportState } from "@/lib/actions/reports";
import { REPORT_CATEGORIES, REPORT_CATEGORY_LABELS } from "@/lib/reportCategories";

const initialState: FileReportState = {};

type ReportButtonProps = {
  /** Identifiant du compte signalé (vérifié côté serveur — jamais pris pour argent comptant). */
  reportedId: number;
  reportedName: string;
  /** Rendez-vous concerné, si le signalement est déposé depuis une séance précise (salle d'appel, chat). */
  appointmentId?: number;
  /** "light" pour un fond clair (tableau de bord, fiche patient…), "dark" pour l'overlay sombre de la salle d'appel. */
  variant?: "light" | "dark";
  className?: string;
};

/**
 * Bouton + modale de signalement, utilisable à tout moment — y compris
 * pendant un appel ou une conversation en cours — sans jamais naviguer ni
 * interrompre la page sous-jacente (même logique que CreateUserForm :
 * useActionState, confirmation affichée en place).
 */
export function ReportButton({ reportedId, reportedName, appointmentId, variant = "light", className }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(fileReportAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Referme automatiquement la modale un court instant après l'envoi — sans
  // jamais recharger ni rediriger (l'appel/la conversation doit continuer).
  useEffect(() => {
    if (!state.success) return;
    const t = setTimeout(() => setOpen(false), 2500);
    return () => clearTimeout(t);
  }, [state.success]);

  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open]);

  const triggerStyle =
    variant === "dark"
      ? { background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.18)" }
      : { background: "var(--kk-border)", color: "var(--kk-mid)" };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Signaler ${reportedName}`}
        className={className ?? "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"}
        style={triggerStyle}
      >
        <FlagIcon />
        Signaler
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: "rgba(44,52,46,0.55)" }}
          role="dialog"
          aria-modal="true"
          aria-label={`Signaler ${reportedName}`}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
            style={{ background: "#fff" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-sm" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
                Signaler {reportedName}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="w-7 h-7 -mr-1 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--kk-border)]"
                style={{ color: "var(--kk-muted)" }}
              >
                ✕
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--kk-muted)" }}>
              Cette démarche reste confidentielle : {reportedName} n&apos;en sera pas informé{appointmentId ? ", et la séance en cours continue normalement" : ""}.
            </p>

            {state.success ? (
              <div className="rounded-xl p-4 text-sm" style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}>
                Signalement envoyé. Notre équipe va l&apos;examiner — merci.
              </div>
            ) : (
              <form ref={formRef} action={action} className="space-y-3">
                <input type="hidden" name="reportedId" value={reportedId} />
                {appointmentId != null && <input type="hidden" name="appointmentId" value={appointmentId} />}

                {state.error && <p className="kk-error text-xs">{state.error}</p>}

                <div>
                  <label htmlFor={`report-category-${reportedId}`} className="kk-label">
                    Motif
                  </label>
                  <select id={`report-category-${reportedId}`} name="category" required defaultValue="" className="kk-input">
                    <option value="" disabled>
                      Choisissez un motif
                    </option>
                    {REPORT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {REPORT_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={`report-message-${reportedId}`} className="kk-label">
                    Détails (optionnel)
                  </label>
                  <textarea
                    id={`report-message-${reportedId}`}
                    name="message"
                    rows={3}
                    maxLength={2000}
                    className="kk-input resize-none"
                    placeholder="Décrivez brièvement la situation…"
                  />
                </div>

                <button type="submit" disabled={pending} className="kk-btn-purple w-full">
                  {pending ? "Envoi…" : "Envoyer le signalement"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function FlagIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.5 1.5v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3.5 2.2c2-1 4 1 6 0s2.5.6 3.5 1.3v5c-1-.7-1.5-1.3-3.5-.3s-4-1-6 0z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
