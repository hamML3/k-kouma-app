'use client'

import { useSyncExternalStore } from "react";

const DISMISS_KEY = "kk-announcement-dismissed";
const CHANGE_EVENT = "kk-announcement-dismissed-change";
// Rendu côté serveur : on ne connaît pas encore la valeur mémorisée par le
// navigateur, donc on part du principe qu'aucune annonce n'a été masquée —
// useSyncExternalStore se resynchronise avec localStorage juste après l'hydratation.
const SSR_SNAPSHOT = "";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(DISMISS_KEY) ?? "";
  } catch {
    // Stockage indisponible (navigation privée stricte, etc.) — on considère
    // l'annonce comme non masquée plutôt que de risquer une erreur.
    return "";
  }
}

function getServerSnapshot(): string {
  return SSR_SNAPSHOT;
}

function dismissAnnouncement(text: string) {
  try {
    window.localStorage.setItem(DISMISS_KEY, text);
  } catch {
    // Rien à faire si le stockage échoue — la bannière réapparaîtra au prochain chargement.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Bandeaux globaux de la plateforme (réglables depuis /admin/settings) :
 * mode maintenance (non masquable) et annonce (masquable, mémorisée par
 * navigateur tant que le texte ne change pas — une nouvelle annonce
 * réapparaît automatiquement même si une précédente avait été masquée).
 */
export function PlatformBanner({
  announcementActive,
  announcementText,
  maintenanceModeEnabled,
}: {
  announcementActive: boolean;
  announcementText: string | null;
  maintenanceModeEnabled: boolean;
}) {
  const dismissedText = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const showAnnouncement =
    announcementActive && !!announcementText?.trim() && dismissedText !== announcementText;

  return (
    <>
      {maintenanceModeEnabled && (
        <div
          role="status"
          className="px-5 py-2.5 text-sm font-semibold text-center"
          style={{ background: "var(--kk-gold-light)", color: "#8A6530" }}
        >
          ⚠️ La plateforme est actuellement en maintenance — certaines actions (paiement, réservation) peuvent être temporairement indisponibles.
        </div>
      )}
      {showAnnouncement && announcementText && (
        <div
          className="px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-3 text-center"
          style={{ background: "var(--kk-purple-light)", color: "var(--kk-dark)" }}
        >
          <span>{announcementText}</span>
          <button
            type="button"
            onClick={() => dismissAnnouncement(announcementText)}
            aria-label="Masquer cette annonce"
            className="shrink-0 font-bold"
            style={{ color: "var(--kk-purple-text)" }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
