'use client'

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "kk-cookie-consent";
const CHANGE_EVENT = "kk-cookie-consent-change";
// Rendu côté serveur : on ne connaît pas encore le choix du navigateur, donc
// on affiche « pas de bandeau » pour ce premier rendu — useSyncExternalStore
// se resynchronise avec la vraie valeur du localStorage juste après l'hydratation.
const SSR_SNAPSHOT = "ssr";

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
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    // localStorage indisponible (navigation privée stricte, etc.) : on
    // considère le choix comme déjà réglé plutôt que d'afficher un bandeau
    // dont le choix ne pourra pas être mémorisé.
    return "declined";
  }
}

function getServerSnapshot(): string {
  return SSR_SNAPSHOT;
}

function setConsent(value: "accepted" | "declined") {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // rien à faire si le stockage échoue — le bandeau se referme quand même
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Petit bandeau de consentement aux cookies, fixé en bas de l'écran, affiché
 * tant que l'utilisateur n'a pas fait de choix. Le choix (accepté / refusé)
 * est mémorisé dans localStorage — propre à ce navigateur, jamais transmis.
 */
export function CookieConsentBanner() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const visible = consent === "";

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentement aux cookies"
      className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-5 print:hidden"
      style={{ animation: "kk-cookie-in 0.3s ease-out" }}
    >
      <style>{`
        @keyframes kk-cookie-in {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        className="max-w-3xl mx-auto rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{
          background: "#fff",
          border: "1px solid var(--kk-border)",
          boxShadow: "0 -8px 30px rgba(60,70,55,0.12)",
        }}
      >
        <p className="text-xs leading-relaxed flex-1" style={{ color: "var(--kk-mid)" }}>
          Nous utilisons des cookies strictement nécessaires au fonctionnement du site, ainsi que des cookies
          optionnels pour améliorer votre expérience. Aucune donnée de santé n&apos;est jamais utilisée à des
          fins publicitaires. Détails dans notre{" "}
          <a href="/legal/cookies" target="_blank" className="underline font-semibold" style={{ color: "var(--kk-green)" }}>
            politique de cookies
          </a>{" "}
          et nos{" "}
          <a href="/legal/mentions-legales" target="_blank" className="underline font-semibold" style={{ color: "var(--kk-green)" }}>
            mentions légales
          </a>
          .
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setConsent("declined")}
            className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap"
            style={{ background: "transparent", color: "var(--kk-mid)", border: "1.5px solid var(--kk-border-mid)" }}
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => setConsent("accepted")}
            className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap"
            style={{ background: "var(--kk-green)", color: "#fff" }}
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
