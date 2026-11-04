// Erreurs navigateur (Sentry) : import dynamique pour ne rien charger côté
// visiteur tant que NEXT_PUBLIC_SENTRY_DSN n'est pas défini au moment du build.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0.1 });
  });
}
