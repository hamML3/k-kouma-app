/**
 * Capture d'erreurs serveur (Sentry) — n'est actif que si SENTRY_DSN est
 * défini dans l'environnement. Sans cette variable, ce fichier ne fait rien :
 * aucun compte Sentry n'est requis pour que l'app tourne normalement.
 * Pour l'activer : créer un projet sur sentry.io (gratuit) et ajouter
 * SENTRY_DSN="https://...@...ingest.sentry.io/..." dans .env.
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

export async function onRequestError(error: unknown) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(error);
}
