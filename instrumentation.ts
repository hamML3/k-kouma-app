import type { Instrumentation } from "next";

/**
 * Capture d'erreurs serveur (Sentry) — n'est actif que si SENTRY_DSN est
 * défini dans l'environnement. Sans cette variable, ce fichier ne fait rien :
 * aucun compte Sentry n'est requis pour que l'app tourne normalement.
 * Activation : voir docs/exploitation.md.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
